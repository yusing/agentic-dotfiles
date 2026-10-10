import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { chmod, lstat, mkdir, mkdtemp, open, readFile, readlink, rename, rm, symlink, writeFile } from "node:fs/promises";
import { dlopen } from "bun:ffi";
import { join, resolve } from "node:path";

type Descriptor = { digest: string; size: number; annotations?: Record<string, string> };
type Manifest = { schemaVersion: number; artifactType?: string; layers: Descriptor[]; annotations?: Record<string, string> };
export const ARTIFACT_TYPE = "application/vnd.yusing.agent-tools.v1";
export const FILES = ["tools.sqfs", "tools.sqfs.zsync", "commands.json", "agent-tools", "bwrap", "squashfuse", "zsync"];
const extraFile = /^(hook-(codex|grok)-[a-z_]+|hostlib-(libc\.so\.6|libm\.so\.6|ld-linux-x86-64\.so\.2|ld-linux-aarch64\.so\.1))$/;

export function stateDirectory(): string {
  if (!process.env.HOME) throw new Error("HOME must be set");
  return join(process.env.HOME, ".local/share/agent-tools");
}

export async function sha256(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return `sha256:${hash.digest("hex")}`;
}

function checkDescriptor(item: Descriptor): void {
  if (!/^sha256:[a-f0-9]{64}$/.test(item.digest) || !Number.isSafeInteger(item.size) || item.size <= 0) {
    throw new Error("invalid OCI content descriptor");
  }
}

export async function verifiedFile(path: string, item: Descriptor): Promise<void> {
  if ((await lstat(path)).size !== item.size || await sha256(path) !== item.digest) {
    throw new Error(`SHA-256 verification failed for ${path.split("/").at(-1)}`);
  }
}

class Registry {
  base: string;
  repository: string;
  token?: string;
  constructor(reference: string, readonly signal: AbortSignal) {
    const url = new URL(reference.includes("://") ? reference : `https://${reference}`);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname))) {
      throw new Error("registry requires HTTPS (localhost HTTP is available for tests)");
    }
    if (url.username || url.password || url.search || url.hash) throw new Error("invalid registry reference");
    this.base = url.origin;
    this.repository = url.pathname.slice(1);
    if (!/^[a-z0-9][a-z0-9._/-]*$/.test(this.repository) || this.repository.includes("..")) throw new Error("invalid OCI repository");
  }
  async get(path: string, headers: HeadersInit = {}): Promise<Response> {
    const request = () => fetch(`${this.base}/v2/${this.repository}/${path}`, {
      headers: { ...headers, ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) }, signal: this.signal,
    });
    let response = await request();
    if (response.status === 401) {
      const challenge = response.headers.get("www-authenticate") ?? "";
      const realm = /realm="([^"]+)"/.exec(challenge)?.[1];
      if (!challenge.startsWith("Bearer ") || !realm) throw new Error("registry does not allow anonymous bearer authentication");
      const url = new URL(realm);
      if (url.origin !== this.base) throw new Error("registry authentication must use the registry origin");
      const service = /service="([^"]+)"/.exec(challenge)?.[1];
      if (service) url.searchParams.set("service", service);
      url.searchParams.set("scope", `repository:${this.repository}:pull`);
      await response.body?.cancel();
      const auth = await fetch(url, { signal: this.signal });
      if (!auth.ok) throw new Error(`registry authentication failed (${auth.status})`);
      const result = await auth.json() as { token?: string; access_token?: string };
      this.token = result.token ?? result.access_token;
      if (!this.token) throw new Error("registry did not supply an anonymous pull token");
      response = await request();
    }
    if (!response.ok) { await response.body?.cancel(); throw new Error(`registry request failed (${response.status})`); }
    return response;
  }
  async download(item: Descriptor, path: string): Promise<void> {
    await Bun.write(path, await this.get(`blobs/${item.digest}`));
    await verifiedFile(path, item);
  }
}

const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

export async function pullImage(options: { repository: string; tag: string; state: string },
  smoke: (image: string, runtime: string) => Promise<number>): Promise<void> {
  if (process.platform !== "linux") throw new Error("image delivery currently supports Linux only");
  if (!/^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}$/.test(options.tag)) throw new Error("invalid OCI tag");
  const state = resolve(options.state);
  if (state === "/" || state === process.env.HOME) throw new Error("state must be a dedicated tool directory");
  const controller = new AbortController();
  let interrupted = 0;
  let child: ReturnType<typeof Bun.spawn> | undefined;
  const interrupt = (code: number) => { interrupted = code; controller.abort(); child?.kill("SIGTERM"); };
  const onInterrupt = () => interrupt(130), onTerminate = () => interrupt(143);
  process.on("SIGINT", onInterrupt); process.on("SIGTERM", onTerminate);
  let stage: string | undefined;
  let link: string | undefined;
  let lock: Awaited<ReturnType<typeof open>> | undefined;
  let proxy: ReturnType<typeof Bun.serve> | undefined;
  try {
    await mkdir(join(state, "releases"), { recursive: true });
    lock = await open(join(state, "pull.lock"), "a", 0o600);
    const libc = dlopen("libc.so.6", { flock: { args: ["i32", "i32"], returns: "i32" } });
    try {
      if (libc.symbols.flock(lock.fd, 2 | 4) !== 0) throw new Error("another pull is in progress; retry after it finishes");
    } finally { libc.close(); }
    controller.signal.throwIfAborted();
    console.error(`agent-tools: resolving ${options.repository}:${options.tag}`);
    const registry = new Registry(options.repository, controller.signal);
    const response = await registry.get(`manifests/${options.tag}`, { Accept: "application/vnd.oci.image.manifest.v1+json" });
    const bytes = new Uint8Array(await response.arrayBuffer());
    const digest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
    const declaredDigest = response.headers.get("docker-content-digest");
    if (declaredDigest && declaredDigest !== digest) throw new Error("OCI manifest digest mismatch");
    const manifest = JSON.parse(new TextDecoder().decode(bytes)) as Manifest;
    const architecture = process.arch === "x64" ? "amd64" : process.arch;
    if (manifest.schemaVersion !== 2 || manifest.artifactType !== ARTIFACT_TYPE ||
      manifest.annotations?.["org.yusing.agent-tools.arch"] !== architecture || !Array.isArray(manifest.layers)) {
      throw new Error("unsupported tool manifest or wrong architecture");
    }
    const files = new Map<string, Descriptor>();
    for (const item of manifest.layers) {
      checkDescriptor(item);
      const name = item.annotations?.["org.opencontainers.image.title"];
      if (!name || (!FILES.includes(name) && !extraFile.test(name)) || files.has(name)) throw new Error("unexpected OCI artifact file");
      files.set(name, item);
    }
    if (FILES.some(name => !files.has(name))) throw new Error("tool artifact is incomplete");
    let current: { digest: string; directory: string } | undefined;
    try {
      const data = JSON.parse(await readFile(join(state, "current/manifest.json"), "utf8"));
      current = { digest: data.digest, directory: join(state, "current") };
      if (current.digest === digest) {
        for (const [name, descriptor] of files) await verifiedFile(join(current.directory, name), descriptor);
        console.error("agent-tools: already up to date");
        return;
      }
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    stage = await mkdtemp(join(state, "releases/.pull-"));
    for (const name of [...files.keys()].filter(name => name !== "tools.sqfs")) {
      console.error(`agent-tools: downloading ${name}`);
      await registry.download(files.get(name)!, join(stage, name));
      if (["agent-tools", "bwrap", "squashfuse", "zsync"].includes(name) || name.startsWith("hook-") || name.startsWith("hostlib-ld-")) {
        await chmod(join(stage, name), 0o755);
      }
    }
    const image = join(stage, "tools.sqfs");
    const imageDescriptor = files.get("tools.sqfs")!;
    if (current) {
      console.error("agent-tools: reusing existing image blocks with zsync");
      // zsync has no bearer-header option. Keep registry authentication inside
      // this loopback proxy, which exposes only this immutable image blob.
      proxy = Bun.serve({ hostname: "127.0.0.1", port: 0, async fetch(request) {
        if (new URL(request.url).pathname !== "/tools.sqfs") return new Response("", { status: 404 });
        try {
          const range = request.headers.get("range");
          return await registry.get(`blobs/${imageDescriptor.digest}`, range ? { Range: range } : {});
        } catch { return new Response("image download failed", { status: 502 }); }
      } });
      const control = Buffer.from(await readFile(join(stage, "tools.sqfs.zsync")));
      const split = control.indexOf("\n\n");
      if (split < 0) throw new Error("invalid zsync control file");
      const header = control.subarray(0, split).toString("utf8").split("\n")
        .filter(line => !line.startsWith("URL:") && !line.startsWith("Filename:"));
      header.push("Filename: tools.sqfs", `URL: http://127.0.0.1:${proxy.port}/tools.sqfs`);
      const localControl = join(stage, "update.zsync");
      await writeFile(localControl, Buffer.concat([Buffer.from(`${header.join("\n")}\n\n`), control.subarray(split + 2)]));
      child = Bun.spawn([join(stage, "zsync"), "-i", join(current.directory, "tools.sqfs"), "-o", image, localControl],
        { cwd: stage, stdin: "ignore", stdout: "inherit", stderr: "inherit" });
      if (await child.exited !== 0) throw new Error("zsync update failed; the active runtime was preserved");
      await rm(localControl);
      await verifiedFile(image, imageDescriptor);
    } else {
      console.error(`agent-tools: downloading first image (${Math.ceil(imageDescriptor.size / 1048576)} MiB)`);
      await registry.download(imageDescriptor, image);
    }
    const commands = JSON.parse(await readFile(join(stage, "commands.json"), "utf8"));
    if (!Array.isArray(commands) || commands.length === 0 || commands.some(name => typeof name !== "string" ||
      !/^[a-zA-Z0-9_][a-zA-Z0-9_.+-]*$/.test(name))) throw new Error("invalid image command inventory");
    await mkdir(join(stage, "bin"));
    for (const name of new Set<string>([...commands, "agent-tools"])) {
      await symlink("../agent-tools", join(stage, "bin", name));
    }
    await mkdir(join(stage, "hostlib"));
    for (const name of files.keys()) {
      if (name.startsWith("hostlib-")) await symlink(`../${name}`, join(stage, "hostlib", name.slice(8)));
      const hook = /^hook-(codex|grok)-([a-z_]+)$/.exec(name);
      if (!hook) continue;
      const loader = architecture === "amd64" ? "ld-linux-x86-64.so.2" : "ld-linux-aarch64.so.1";
      if (![loader, "libc.so.6", "libm.so.6"].every(library => files.has(`hostlib-${library}`))) {
        throw new Error("native hooks require their bundled libraries");
      }
      const directory = join(stage, "hooks", hook[1]);
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, hook[2]), `#!/bin/sh\n# version: 0.2.0\ngeneration=$(/usr/bin/readlink -f ${quote(join(state, "current"))}) || exit\nexec "$generation/hostlib/${loader}" --library-path "$generation/hostlib" "$generation/${name}" "$@"\n`, { mode: 0o755 });
    }
    console.error("agent-tools: checking mounted runtime before activation");
    if (await smoke(image, stage) !== 0) throw new Error("runtime check failed; the active runtime was preserved");
    controller.signal.throwIfAborted();
    await writeFile(join(stage, "manifest.json"), JSON.stringify({ digest }));
    const destination = join(state, "releases", digest.slice(7));
    try { await rename(stage, destination); stage = undefined; }
    catch (error) {
      if (!["EEXIST", "ENOTEMPTY"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error;
      for (const [name, descriptor] of files) await verifiedFile(join(destination, name), descriptor);
    }
    // Prepare the stable command path before the single activation commit.
    try { await symlink("current/bin", join(state, "bin")); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
    if (await readlink(join(state, "bin")) !== "current/bin") throw new Error("tool bin path must link to current/bin");
    link = join(state, `.current-${crypto.randomUUID()}`);
    await symlink(`releases/${digest.slice(7)}`, link);
    controller.signal.throwIfAborted();
    await rename(link, join(state, "current"));
    link = undefined;
    console.error(`agent-tools: activated ${digest.slice(7, 19)}; commands are in ${join(state, "bin")}`);
  } catch (error) {
    if (interrupted) throw Object.assign(new Error("pull cancelled"), { exitCode: interrupted });
    throw error;
  } finally {
    process.off("SIGINT", onInterrupt); process.off("SIGTERM", onTerminate);
    proxy?.stop(true);
    if (link) await rm(link, { force: true });
    if (stage) await rm(stage, { recursive: true, force: true });
    await lock?.close();
  }
}
