import { lstat, mkdir, mkdtemp, open, readdir, readFile, readlink, realpath, rmdir, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";

export const VERSION = "0.1.0";
type Binding = { destination: string; source?: string; kind: "--bind" | "--ro-bind" | "--dev-bind" | "--proc" };

const usage = `Usage: agent-tools run --image IMAGE -- COMMAND [ARG...]
       agent-tools --version

Run a trusted Linux SquashFS root filesystem without extraction or Docker.
Requires squashfuse, fusermount3 (or fusermount), and bwrap on PATH.
Home, the current project, /tmp, /var/tmp, and /run remain writable host paths.
This command provides a runtime environment, not a security sandbox.
`;

async function exists(path: string): Promise<boolean> {
  try { await lstat(path); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return false; throw error; }
}

// Recreate only the mount-point skeleton. All payload data stays in SquashFS.
// Splitting ancestors of host bindings lets arbitrary home/project paths coexist
// with image directories without writing into the image or the host root.
export async function filesystemArgs(imageRoot: string, bindings: Binding[]): Promise<string[]> {
  const args: string[] = [];
  async function visit(destination: string): Promise<void> {
    const binding = bindings.find(item => item.destination === destination);
    if (binding) {
      args.push(binding.kind, ...(binding.source ? [binding.source] : []), destination);
      return;
    }
    const prefix = destination === "/" ? "/" : `${destination}/`;
    const descendants = bindings.filter(item => item.destination.startsWith(prefix));
    const source = join(imageRoot, destination);
    const present = await exists(source);
    const stat = present ? await lstat(source) : undefined;
    if (destination !== "/" && descendants.length === 0) {
      if (stat?.isSymbolicLink()) args.push("--symlink", await readlink(source), destination);
      else if (present) args.push("--ro-bind", source, destination);
      return;
    }
    if (stat && !stat.isDirectory()) {
      throw new Error(`cannot expose a host path through image entry ${destination}`);
    }
    if (destination !== "/") args.push("--dir", destination);
    const names = new Set(present ? await readdir(source) : []);
    for (const item of descendants) names.add(item.destination.slice(prefix.length).split("/")[0]);
    for (const name of [...names].sort()) await visit(`${prefix}${name}`);
  }
  await visit("/");
  return args;
}

async function mounted(path: string): Promise<boolean> {
  const escaped = path.replaceAll("\\", "\\134").replaceAll(" ", "\\040").replaceAll("\t", "\\011").replaceAll("\n", "\\012");
  return (await readFile("/proc/self/mountinfo", "utf8")).split("\n").some(line => line.split(" ")[4] === escaped);
}

function executable(...names: string[]): string {
  for (const name of names) { const path = Bun.which(name); if (path) return path; }
  throw new Error(`missing ${names.join(" or ")}; the image runtime bootstrap must supply it`);
}

export async function runImage(image: string, command: string[]): Promise<number> {
  if (process.platform !== "linux") throw new Error("image execution currently supports Linux only");
  if (command.length === 0) throw new Error("a command is required after --");
  const imagePath = await realpath(image);
  if (!(await lstat(imagePath)).isFile() || await Bun.file(imagePath).slice(0, 4).text() !== "hsqs") {
    throw new Error("IMAGE must be a SquashFS file");
  }
  const squashfuse = executable("squashfuse");
  const unmount = executable("fusermount3", "fusermount");
  const bwrap = executable("bwrap");
  if (!process.env.HOME) throw new Error("HOME must be set");
  const userDirectory = await realpath(process.env.HOME);
  if (userDirectory === "/") throw new Error("HOME cannot be the filesystem root");
  const cwd = await realpath(process.cwd());
  const directory = await mkdtemp("/tmp/agent-tools-");
  const mount = join(directory, "root");
  await mkdir(mount);
  const statusPath = join(directory, "status");
  const status = await open(statusPath, "wx", 0o600);
  let fuse: ReturnType<typeof Bun.spawn> | undefined;
  let child: ReturnType<typeof Bun.spawn> | undefined;
  let commandPid: number | undefined;
  let attached = false;
  let interrupted = 0;
  const interrupt = (signal: "SIGINT" | "SIGTERM") => {
    interrupted = signal === "SIGINT" ? 130 : 143;
    if (commandPid && child?.exitCode === null) {
      try { process.kill(commandPid, signal); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error; }
    } else if (!child) fuse?.kill(signal);
  };
  const onInterrupt = () => interrupt("SIGINT");
  const onTerminate = () => interrupt("SIGTERM");
  process.on("SIGINT", onInterrupt);
  process.on("SIGTERM", onTerminate);
  try {
    console.error("agent-tools: mounting tool image");
    fuse = Bun.spawn([squashfuse, "-f", imagePath, mount], { stdin: "ignore", stdout: "ignore", stderr: "inherit" });
    const deadline = Date.now() + 10_000;
    while (!await mounted(mount)) {
      if (interrupted) return interrupted;
      if (fuse.exitCode !== null || Date.now() >= deadline) throw new Error("cannot mount image; check FUSE access and squashfuse diagnostics");
      await Bun.sleep(10);
    }
    attached = true;
    const bindings: Binding[] = [
      { destination: "/dev", source: "/dev", kind: "--dev-bind" },
      { destination: "/proc", kind: "--proc" },
      { destination: "/sys", source: "/sys", kind: "--ro-bind" },
      { destination: "/tmp", source: "/tmp", kind: "--bind" },
      { destination: "/var/tmp", source: "/var/tmp", kind: "--bind" },
      { destination: "/run", source: "/run", kind: "--bind" },
    ];
    for (const path of [userDirectory, cwd]) {
      if (path !== "/" && !bindings.some(item => path === item.destination || path.startsWith(`${item.destination}/`))) {
        bindings.push({ destination: path, source: path, kind: "--bind" });
      }
    }
    for (const path of ["/etc/resolv.conf", "/etc/hosts", "/etc/passwd", "/etc/group"]) {
      if (await exists(path)) bindings.push({ destination: path, source: path, kind: "--ro-bind" });
    }
    const args = await filesystemArgs(mount, bindings);
    if (interrupted) return interrupted;
    child = Bun.spawn([bwrap, "--die-with-parent", "--info-fd", "3", ...args, "--chdir", cwd,
      "--setenv", "HOME", userDirectory, "--setenv", "PATH",
      `/opt/agent-tools/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ""}`,
      "--", ...command], { stdio: ["inherit", "inherit", "inherit", status.fd] });
    const startupDeadline = Date.now() + 10_000;
    while (child.exitCode === null && !commandPid) {
      try {
        const info = JSON.parse(await readFile(statusPath, "utf8"));
        if (!Number.isSafeInteger(info["child-pid"]) || info["child-pid"] <= 0) throw new Error("invalid runtime process identity");
        commandPid = info["child-pid"];
      } catch (error) { if (!(error instanceof SyntaxError)) throw error; }
      if (Date.now() >= startupDeadline) throw new Error("runtime did not report its process identity");
      if (!commandPid) await Bun.sleep(10);
    }
    if (interrupted && commandPid) interrupt(interrupted === 130 ? "SIGINT" : "SIGTERM");
    const code = await child.exited;
    return interrupted || code;
  } catch (error) {
    if (child?.exitCode === null) { child.kill("SIGTERM"); await child.exited; }
    if (interrupted) return interrupted;
    throw error;
  } finally {
    process.off("SIGINT", onInterrupt);
    process.off("SIGTERM", onTerminate);
    let retained = false;
    if (await mounted(mount)) {
      attached = true;
      const result = Bun.spawnSync([unmount, "-u", mount], { stdout: "ignore", stderr: "inherit" });
      if (result.exitCode !== 0) {
        console.error(`agent-tools: mount is still busy at ${mount}; close its processes, then run ${unmount} -u ${mount}`);
        retained = true;
      }
    }
    await status.close();
    await unlink(statusPath);
    if (attached) {
      // FUSE exits when the last namespace releases its mount. A successful host
      // unmount does not mean detached descendants have released theirs.
      fuse?.unref();
    } else {
      fuse?.kill("SIGTERM");
      if (fuse) {
        let timer: ReturnType<typeof setTimeout>;
        await Promise.race([fuse.exited, new Promise<void>(done => { timer = setTimeout(done, 2_000); })]);
        clearTimeout(timer!);
        if (fuse.exitCode === null) { fuse.kill("SIGKILL"); await fuse.exited; }
      }
    }
    if (!retained) { await rmdir(mount); await rmdir(directory); }
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  try {
    if (args.length === 1 && args[0] === "--version") console.log(VERSION);
    else if (args.length === 0 || (args.length === 1 && ["--help", "-h"].includes(args[0]))) process.stdout.write(usage);
    else if (args[0] === "run" && args[1] === "--image" && args[2] && args[3] === "--") {
      process.exitCode = await runImage(args[2], args.slice(4));
    } else throw new Error(usage.trim());
  } catch (error) {
    console.error(`agent-tools: ${(error as Error).message}`);
    process.exitCode = 1;
  }
}
