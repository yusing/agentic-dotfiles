import { afterEach, expect, test } from "bun:test";
import { chmod, copyFile, mkdir, mkdtemp, open, readFile, readlink, readdir, rename, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { dlopen } from "bun:ffi";
import { join, resolve } from "node:path";
import { ARTIFACT_TYPE, sha256 } from "../lib/agent-tools/pull";

const runtime = process.env.AGENT_TOOLS_TEST_RUNTIME;
const oldImage = process.env.AGENT_TOOLS_TEST_IMAGE;
const newImage = process.env.AGENT_TOOLS_TEST_NEW_IMAGE;
const control = process.env.AGENT_TOOLS_TEST_CONTROL;
const binary = process.env.AGENT_TOOLS_TEST_BINARY || resolve(import.meta.dir, "../bin/agent-tools");
const hostLibraries = process.env.AGENT_TOOLS_TEST_HOSTLIB;
const hostFish = process.env.AGENT_TOOLS_TEST_HOST_FISH;
const hookBinary = process.env.AGENT_TOOLS_TEST_HOOK || resolve(import.meta.dir, "../../.codex/hooks/bin/session_start_context");
const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });

test.skipIf(!runtime || !oldImage || !newImage || !control)("real OCI first pull, bearer auth, delta update, launchers, and failed updates", async () => {
  const root = await mkdtemp("/var/tmp/agent-tools-user's tools-"); roots.push(root);
  // This small root validates delivery, not the complete managed inventory
  // required for automatic host cleanup. Pull it into an explicit test state.
  const state = join(root, "test-state");
  await mkdir(join(root, ".local/share"), { recursive: true });
  await symlink(state, join(root, ".local/share/agent-tools"));
  const multiarch = process.arch === "x64" ? "x86_64" : "aarch64";
  const loader = process.arch === "x64" ? "ld-linux-x86-64.so.2" : "ld-linux-aarch64.so.1";
  const referenceLibraries = join(root, "reference-hostlib");
  await mkdir(referenceLibraries);
  for (const name of ["libc.so.6", "libm.so.6", loader]) {
    await symlink(hostLibraries ? resolve(hostLibraries, `hostlib-${name}`) : `/usr/lib/${multiarch}-linux-gnu/${name}`,
      join(referenceLibraries, name));
  }
  const blobs = new Map<string, string | Blob>();
  async function manifest(image: string, helper: string | Blob = binary) {
    const paths: Record<string, string | Blob> = {
      "tools.sqfs": image, "tools.sqfs.zsync": control!, "commands.json": new Blob([JSON.stringify(["git", "python3", "node", "jq", "bash", ...(hostFish ? ["fish"] : [])])]),
      "agent-tools": helper, bwrap: join(runtime!, "bwrap"), squashfuse: join(runtime!, "squashfuse"), zsync: join(runtime!, "zsync"),
    };
    for (const name of ["libc.so.6", "libm.so.6", loader]) paths[`hostlib-${name}`] = join(referenceLibraries, name);
    paths["hook-codex-session_start_context"] = hookBinary;
    if (hostFish) paths["host-fish"] = hostFish;
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
  let redirects = 0;
  let componentDownloads = 0;
  let storageRequests = 0;
  let expired = false;
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/token") return Response.json({ token: "fixture-token" });
    const storage = url.pathname.startsWith("/storage/");
    if (!storage && request.headers.get("authorization") !== "Bearer fixture-token") {
      return new Response("", { status: 401, headers: { "www-authenticate": `Bearer realm="${url.origin}/token",service="fixture"` } });
    }
    authenticated++;
    if (url.pathname === "/v2/test/tools/manifests/stable") return Response.json(currentManifest);
    const digest = url.pathname.split("/").at(-1)!;
    const source = blobs.get(digest);
    if (!source) return new Response("missing", { status: 404 });
    if (source === newImage && !storage) {
      redirects++;
      return Response.redirect(`${url.origin}/storage/${digest}`);
    }
    if (storage) {
      storageRequests++;
      // Force one expiry after a successful range to cover redirect refresh.
      if (!expired && !request.headers.has("authorization")) {
        expired = true;
        return new Response("expired", { status: 403 });
      }
    }
    if (source !== oldImage && source !== newImage) componentDownloads++;
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
  const source = join(root,"api.ts");
  const api = join(root,"api");
  await writeFile(source, `import {pullImage,pruneImages} from ${JSON.stringify(resolve(import.meta.dir,"../lib/agent-tools/pull.ts"))};
    import {runImage,linkHooks} from ${JSON.stringify(resolve(import.meta.dir,"../lib/agent-tools/agent-tools.ts"))};
    const args=process.argv.slice(2);
    try {
      if(args[0]==="pull") {
        const options=JSON.parse(args[1]);
        await pullImage(options,(image,runtime)=>runImage(image,["/bin/true"],runtime));
        await linkHooks(options.state);
        await pruneImages(options.state);
      } else process.exitCode=await runImage(args[0],args.slice(1));
    } catch(error) {console.error(error.message);process.exitCode=error.exitCode??1;}`);
  const build=Bun.spawnSync([process.execPath,"build","--compile",`--outfile=${api}`,source]);
  expect(build.exitCode,build.stderr.toString()).toBe(0);
  const args = [api,"pull",JSON.stringify({repository:`http://127.0.0.1:${server.port}/test/tools`,tag:"stable",state})];
  async function pull() {
    const child = Bun.spawn(args, { stdout: "pipe", stderr: "pipe", env: { ...process.env, HOME: root, NO_PROXY: "127.0.0.1,localhost" } });
    const out = await new Response(child.stdout).text(); const error = await new Response(child.stderr).text();
    return { code: await child.exited, out, error };
  }
  let survivor: ReturnType<typeof Bun.spawn> | undefined;
  try {
    const first = await pull(); expect(first.code, first.error).toBe(0);
    expect(await sha256(join(state, "current/tools.sqfs"))).toBe(await sha256(oldImage!));
    if (hostFish) {
      // Hide independent host shells so this exercises the portable fallback.
      const shell = Bun.spawn([join(runtime!, "bwrap"), "--unshare-user", "--ro-bind", "/", "/", "--dev-bind", "/dev", "/dev", "--proc", "/proc",
        "--tmpfs", "/usr/bin", "--ro-bind", Bun.which("sh")!, "/usr/bin/sh",
        "--ro-bind", Bun.which("readlink")!, "/usr/bin/readlink", "--tmpfs", "/usr/local/bin", "--tmpfs", "/home/linuxbrew",
        "--", "/bin/sh", "-ec", 'readlink /proc/self/ns/mnt; exec "$@"', "sh",
        join(state, "bin/fish"), "--no-config", "-c", 'printf "%s\\n" "$argv[1]"; readlink /proc/self/ns/mnt', "literal ; $(no-command)"],
        { env: { ...process.env, HOME: root, AGENT_TOOLS_RUNTIME: "" }, stdout: "pipe", stderr: "pipe" });
      const output = await new Response(shell.stdout).text();
      expect(await shell.exited, await new Response(shell.stderr).text()).toBe(0);
      const namespace = output.split("\n")[0];
      expect(namespace).toMatch(/^mnt:\[\d+\]$/);
      expect(output).toBe(`${namespace}\nliteral ; $(no-command)\n${namespace}\n`);
      expect(await sha256(join(state, "current/host-fish"))).toBe(await sha256(hostFish));
    }
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
    currentManifest = await manifest(newImage!, new Blob(['#!/bin/sh\necho 0.2.2\n']));
    expect((await pull()).error).toContain("predates the host-shell correction");
    expect(await readlink(join(state, "current"))).toBe(oldLink);
    currentManifest = await manifest(newImage!);
    await chmod(join(state, "current/commands.json"), 0);
    componentDownloads = 0;
    corrupt = true;
    const failed = await pull(); expect(failed.code).not.toBe(0);
    expect(componentDownloads).toBe(1);
    await chmod(join(state, "current/commands.json"), 0o644);
    expect(await readlink(join(state, "current"))).toBe(oldLink);
    expect((await readdir(join(state, "releases"))).some(name => name.startsWith(".pull-"))).toBe(false);
    corrupt = false; imageBytes = 0;
    await rename(join(state, "bin"), join(state, "saved-bin"));
    await mkdir(join(state, "bin"));
    expect((await pull()).code).not.toBe(0);
    expect(await readlink(join(state, "current"))).toBe(oldLink);
    await rm(join(state, "bin"), { recursive: true });
    await rename(join(state, "saved-bin"), join(state, "bin"));
    imageBytes = 0; redirects = 0; storageRequests = 0; componentDownloads = 0; expired = false;
    const gate = join(root, "resume-old-command");
    survivor = Bun.spawn([api, join(state,"current/tools.sqfs"), "/bin/sh", "-c",
      'echo ready; while [ ! -f "$1" ]; do sleep .1; done; git --version', "sh", gate],
      { env: { ...process.env, HOME: root }, stdout: "pipe" });
    const ready = survivor.stdout.getReader();
    expect(new TextDecoder().decode((await ready.read()).value)).toContain("ready");
    const update = await pull();
    expect(update.code, update.error).toBe(0);
    expect(update.error).toContain("reusing existing image blocks");
    expect(update.error).toContain("reusing agent-tools");
    expect(componentDownloads).toBe(0);
    expect(expired).toBe(true);
    expect(storageRequests).toBeGreaterThan(redirects + 1);
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
    const hook = Bun.spawn([join(root, ".codex/hooks/bin/session_start_context"), "--version"], { cwd: root });
    const native = Bun.spawnSync(hostLibraries
      ? [join(referenceLibraries, loader), "--library-path", referenceLibraries, hookBinary, "--version"]
      : [hookBinary, "--version"]);
    expect(native.exitCode, native.stderr.toString()).toBe(0);
    const nativeVersion = native.stdout.toString();
    expect(await new Response(hook.stdout).text()).toBe(nativeVersion);
    expect(await hook.exited).toBe(0);
    // Keep an old-generation hook alive across activation and explicit pruning.
    const activeLink = await readlink(join(state, "current"));
    const switchCurrent = async (target: string) => {
      await symlink(target, join(state, "hook-current"));
      await rename(join(state, "hook-current"), join(state, "current"));
    };
    await switchCurrent(oldLink);
    const waitingHook = Bun.spawn([join(root, ".codex/hooks/bin/session_start_context"), "/bin/true"],
      { cwd: root, env: { ...process.env, HOME: root }, stdin: "pipe", stdout: "pipe", stderr: "pipe" });
    try {
      let loaded = false;
      const deadline = Date.now() + 2000;
      while (waitingHook.exitCode === null && Date.now() < deadline) {
        const maps = await readFile(`/proc/${waitingHook.pid}/maps`, "utf8");
        if (maps.includes(join(state, oldLink, "hook-codex-session_start_context"))) { loaded = true; break; }
        await Bun.sleep(10);
      }
      expect(loaded).toBe(true);
      await switchCurrent(activeLink);
      const concurrentPull = await pull();
      expect(concurrentPull.code, concurrentPull.error).toBe(0);
      expect(await Bun.file(join(state, oldLink, "tools.sqfs")).exists()).toBe(true);
    } finally {
      if (await readlink(join(state, "current")) !== activeLink) await switchCurrent(activeLink);
      waitingHook.stdin.write("{}"); waitingHook.stdin.end();
      expect(await waitingHook.exited).toBe(0);
    }
    expect(authenticated).toBeGreaterThan(0);
    const newLink = await readlink(join(state, "current"));
    currentManifest = await manifest(oldImage!); stall = true;
    const cancelled = Bun.spawn(args, { stderr: "pipe" });
    const reader = cancelled.stderr.getReader();
    while (true) {
      const part = await reader.read();
      if (part.done || /downloading|reusing existing image blocks/.test(new TextDecoder().decode(part.value))) break;
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
    const unchangedRetirement = await pull();
    expect(unchangedRetirement.code, unchangedRetirement.error).toBe(0);
    expect(await Bun.file(join(state, "current/tools.sqfs")).exists()).toBe(true);
    expect(await Bun.file(join(state, newLink, "tools.sqfs")).exists()).toBe(false);
    const leased = join(state, "releases", "f".repeat(64));
    await mkdir(leased); await writeFile(join(leased, "tools.sqfs"), "lease fixture");
    const lease = await open(join(leased, "tools.sqfs"), "r");
    const libc = dlopen("libc.so.6", { flock: { args: ["i32", "i32"], returns: "i32" } });
    expect(libc.symbols.flock(lease.fd, 1 | 4)).toBe(0); libc.close();
    try {
      const guarded = await pull();
      expect(guarded.code, guarded.error).toBe(0);
      expect(await Bun.file(join(leased, "tools.sqfs")).exists()).toBe(true);
    } finally { await lease.close(); }
    // Pre-lease consumers can still have an old FUSE process after migration.
    const legacy=join(state,"releases","c".repeat(64));
    const legacyMount=join(root,"legacy-mount");
    await mkdir(legacy); await mkdir(legacyMount);
    await copyFile(oldImage!,join(legacy,"tools.sqfs"));
    const fuse=Bun.spawn([join(runtime!,"squashfuse"),"-f",join(legacy,"tools.sqfs"),legacyMount],{stdio:["ignore","ignore","inherit"]});
    try {
      const deadline=Date.now()+3000;
      while(!await Bun.file(join(legacyMount,"revision")).exists() && fuse.exitCode===null && Date.now()<deadline) await Bun.sleep(10);
      expect(await Bun.file(join(legacyMount,"revision")).text()).toBe("old\n");
      const compatible=await pull();
      expect(compatible.code,compatible.error).toBe(0);
      expect(await Bun.file(join(legacy,"tools.sqfs")).exists()).toBe(true);
    } finally {
      const unmount=Bun.spawnSync([Bun.which("fusermount3") ?? Bun.which("fusermount")!,"-u",legacyMount]);
      expect(unmount.exitCode,unmount.stderr.toString()).toBe(0);
      if(fuse.exitCode===null) fuse.kill("SIGTERM");
      await fuse.exited;
    }
    const abandoned=join(state,"releases/.pull-abandoned");
    await mkdir(abandoned); await writeFile(join(abandoned,"partial"),"partial download");
    const released = await pull();
    expect(released.code, released.error).toBe(0);
    expect(await Bun.file(join(abandoned,"partial")).exists()).toBe(false);
    expect(await Bun.file(join(leased, "tools.sqfs")).exists()).toBe(false);
    expect(await Bun.file(join(legacy,"tools.sqfs")).exists()).toBe(false);
  } finally {
    if (survivor?.exitCode === null) { survivor.kill("SIGTERM"); await survivor.exited; }
    server.stop(true);
  }
}, 120000);
