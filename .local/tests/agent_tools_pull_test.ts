import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, readlink, readdir, rename, rm, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { ARTIFACT_TYPE, sha256 } from "../lib/agent-tools/pull";

const runtime = process.env.AGENT_TOOLS_TEST_RUNTIME;
const oldImage = process.env.AGENT_TOOLS_TEST_IMAGE;
const newImage = process.env.AGENT_TOOLS_TEST_NEW_IMAGE;
const control = process.env.AGENT_TOOLS_TEST_CONTROL;
const binary = resolve(import.meta.dir, "../bin/agent-tools");
const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });

test.skipIf(!runtime || !oldImage || !newImage || !control)("real OCI first pull, bearer auth, delta update, launchers, and failed updates", async () => {
  const root = await mkdtemp("/var/tmp/agent-tools-user's tools-"); roots.push(root);
  const state = join(root, ".local/share/agent-tools");
  const blobs = new Map<string, string | Blob>();
  async function manifest(image: string) {
    const paths: Record<string, string | Blob> = {
      "tools.sqfs": image, "tools.sqfs.zsync": control!, "commands.json": new Blob([JSON.stringify(["git", "python3", "node", "jq", "bash"])]),
      "agent-tools": binary, bwrap: join(runtime!, "bwrap"), squashfuse: join(runtime!, "squashfuse"), zsync: join(runtime!, "zsync"),
    };
    const multiarch = process.arch === "x64" ? "x86_64" : "aarch64";
    const loader = process.arch === "x64" ? "ld-linux-x86-64.so.2" : "ld-linux-aarch64.so.1";
    for (const name of ["libc.so.6", "libm.so.6", loader]) paths[`hostlib-${name}`] = `/usr/lib/${multiarch}-linux-gnu/${name}`;
    paths["hook-codex-session_start_context"] = resolve(import.meta.dir, "../../.codex/hooks/bin/session_start_context");
    const layers = [];
    for (const name of Object.keys(paths)) {
      const source = paths[name];
      const blob = typeof source === "string" ? Bun.file(source) : source;
      const digest = typeof source === "string" ? await sha256(source) : `sha256:${new Bun.CryptoHasher("sha256").update(await blob.arrayBuffer()).digest("hex")}`;
      blobs.set(digest, source);
      layers.push({ digest, size: blob.size, annotations: { "org.opencontainers.image.title": name } });
    }
    return { schemaVersion: 2, artifactType: ARTIFACT_TYPE, layers,
      annotations: { "org.yusing.agent-tools.arch": process.arch === "x64" ? "amd64" : process.arch } };
  }
  let currentManifest = await manifest(oldImage!);
  let imageBytes = 0;
  let authenticated = 0;
  let corrupt = false;
  let stall = false;
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/token") return Response.json({ token: "fixture-token" });
    if (request.headers.get("authorization") !== "Bearer fixture-token") {
      return new Response("", { status: 401, headers: { "www-authenticate": `Bearer realm="${url.origin}/token",service="fixture"` } });
    }
    authenticated++;
    if (url.pathname === "/v2/test/tools/manifests/stable") return Response.json(currentManifest);
    const digest = url.pathname.split("/").at(-1)!;
    const source = blobs.get(digest);
    if (!source) return new Response("missing", { status: 404 });
    let file = typeof source === "string" ? Bun.file(source) : source;
    if (source === newImage && corrupt) return new Response("corrupt");
    if (stall) { await Bun.sleep(3000); return new Response("late"); }
    const range = request.headers.get("range");
    if (range) {
      const match = /^bytes=(\d+)-(\d+)$/.exec(range);
      if (!match) return new Response("invalid range", { status: 416 });
      const start = +match[1], end = Math.min(+match[2], file.size - 1);
      if (source === newImage) imageBytes += end - start + 1;
      return new Response(file.slice(start, end + 1), { status: 206,
        headers: { "Content-Range": `bytes ${start}-${end}/${file.size}`, "Accept-Ranges": "bytes" } });
    }
    if (source === newImage) imageBytes += file.size;
    return new Response(file);
  } });
  const args = [binary, "pull", "--repository", `http://127.0.0.1:${server.port}/test/tools`, "--tag", "stable", "--state", state];
  async function pull() {
    const child = Bun.spawn(args, { stdout: "pipe", stderr: "pipe", env: { ...process.env, HOME: root, NO_PROXY: "127.0.0.1,localhost" } });
    const out = await new Response(child.stdout).text(); const error = await new Response(child.stderr).text();
    return { code: await child.exited, out, error };
  }
  let survivor: ReturnType<typeof Bun.spawn> | undefined;
  try {
    const first = await pull(); expect(first.code, first.error).toBe(0);
    expect(await sha256(join(state, "current/tools.sqfs"))).toBe(await sha256(oldImage!));
    const login = Bun.spawn(["/usr/bin/python3", "-c",
      'import os,sys; os.execve(sys.argv[1], ["-bash", "-c", "shopt -q login_shell"], os.environ)',
      join(state, "bin/bash")], { env: { ...process.env, HOME: root }, stderr: "pipe" });
    expect(await login.exited, await new Response(login.stderr).text()).toBe(0);
    const oldLink = await readlink(join(state, "current"));
    const unchanged = await pull(); expect(unchanged.code, unchanged.error).toBe(0);
    expect(unchanged.error).toContain("already up to date");
    expect(await readlink(join(state, "current"))).toBe(oldLink);
    const originalHelper = await readFile(join(state, "current/agent-tools"));
    await writeFile(join(state, "current/agent-tools"), "corrupt helper");
    expect((await pull()).code).not.toBe(0);
    await writeFile(join(state, "current/agent-tools"), originalHelper);
    currentManifest = await manifest(newImage!);
    corrupt = true;
    const failed = await pull(); expect(failed.code).not.toBe(0);
    expect(await readlink(join(state, "current"))).toBe(oldLink);
    expect((await readdir(join(state, "releases"))).some(name => name.startsWith(".pull-"))).toBe(false);
    corrupt = false; imageBytes = 0;
    await rename(join(state, "bin"), join(state, "saved-bin"));
    await mkdir(join(state, "bin"));
    expect((await pull()).code).not.toBe(0);
    expect(await readlink(join(state, "current"))).toBe(oldLink);
    await rm(join(state, "bin"), { recursive: true });
    await rename(join(state, "saved-bin"), join(state, "bin"));
    imageBytes = 0;
    const gate = join(root, "resume-old-command");
    survivor = Bun.spawn([binary, "run", "--state", state, "--", "/bin/sh", "-c",
      'echo ready; while [ ! -f "$1" ]; do sleep .1; done; git --version', "sh", gate],
      { env: { ...process.env, HOME: root }, stdout: "pipe" });
    const ready = survivor.stdout.getReader();
    expect(new TextDecoder().decode((await ready.read()).value)).toContain("ready");
    const managedUpdate = Bun.spawn([binary, "run", "--state", state, "--", "/bin/sh", "-ec",
      'export AGENT_TOOLS_RUNTIME=1; exec "$@"', "sh", ...args],
      { env: { ...process.env, HOME: root, NO_PROXY: "127.0.0.1,localhost" }, stderr: "pipe" });
    const update = { code: await managedUpdate.exited, error: await new Response(managedUpdate.stderr).text() };
    expect(update.code, update.error).toBe(0);
    expect(update.error).toContain("reusing existing image blocks");
    expect(await sha256(join(state, "current/tools.sqfs"))).toBe(await sha256(newImage!));
    expect(imageBytes).toBeLessThan(Bun.file(newImage!).size / 10);
    await writeFile(gate, "resume");
    let survivorOutput = "";
    for (;;) { const part = await ready.read(); if (part.done) break; survivorOutput += new TextDecoder().decode(part.value); }
    expect(survivorOutput).toMatch(/^git version /);
    expect(await survivor.exited).toBe(0);
    expect(await sha256(join(state, oldLink, "tools.sqfs"))).toBe(await sha256(oldImage!));
    const command = Bun.spawn([join(state, "bin/git"), "--version"]);
    expect(await new Response(command.stdout).text()).toMatch(/^git version /);
    expect(await command.exited).toBe(0);
    const hookLink = Bun.spawn([join(state, "bin/agent-tools"), "link-hooks"], { env: { ...process.env, HOME: root } });
    expect(await hookLink.exited).toBe(0);
    const hook = Bun.spawn([join(root, ".codex/hooks/bin/session_start_context"), "--version"], { cwd: root });
    const nativeVersion = Bun.spawnSync([resolve(import.meta.dir, "../../.codex/hooks/bin/session_start_context"), "--version"]).stdout.toString();
    expect(await new Response(hook.stdout).text()).toBe(nativeVersion);
    expect(await hook.exited).toBe(0);
    expect(authenticated).toBeGreaterThan(0);
    const newLink = await readlink(join(state, "current"));
    currentManifest = await manifest(oldImage!); stall = true;
    const cancelled = Bun.spawn(args, { stderr: "pipe" });
    const reader = cancelled.stderr.getReader();
    while (true) {
      const part = await reader.read();
      if (part.done || new TextDecoder().decode(part.value).includes("downloading")) break;
    }
    reader.releaseLock();
    const overlap = await pull();
    expect(overlap.code).not.toBe(0);
    expect(overlap.error).toContain("another pull is in progress");
    cancelled.kill("SIGTERM");
    expect(await cancelled.exited).toBe(143);
    expect(await readlink(join(state, "current"))).toBe(newLink);
    expect((await readdir(join(state, "releases"))).some(name => name.startsWith(".pull-"))).toBe(false);
    expect((await readdir(state)).some(name => name.startsWith(".current-"))).toBe(false);
    stall = false;
    await unlink(join(state, "current"));
    await writeFile(join(state, oldLink, "agent-tools"), "corrupt retained helper");
    expect((await pull()).code).not.toBe(0);
    await writeFile(join(state, oldLink, "agent-tools"), originalHelper);
    expect((await pull()).code).toBe(0);
  } finally {
    if (survivor?.exitCode === null) { survivor.kill("SIGTERM"); await survivor.exited; }
    server.stop(true);
  }
}, 120000);

