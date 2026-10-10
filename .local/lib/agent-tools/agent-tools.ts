import { lstat, mkdir, mkdtemp, open, readdir, readFile, readlink, realpath, rename, rmdir, symlink, unlink } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { pullImage, stateDirectory } from "./pull";

export const VERSION = "0.2.0";
type Binding = { destination: string; source?: string; kind: "--bind" | "--ro-bind" | "--dev-bind" | "--proc" };

const usage = `Usage: agent-tools pull [--repository REGISTRY/REPOSITORY] [--tag TAG] [--state DIR]
       agent-tools run [--image IMAGE | --state DIR] -- COMMAND [ARG...]
       agent-tools link-hooks
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

async function runNamespace(bwrap: string, args: string[], command: string[], env = process.env): Promise<number> {
  let child: ReturnType<typeof Bun.spawn> | undefined;
  let commandPid: number | undefined;
  let interrupted = 0;
  const interrupt = (signal: "SIGINT" | "SIGTERM") => {
    interrupted = signal === "SIGINT" ? 130 : 143;
    if (commandPid && child?.exitCode === null) {
      try { process.kill(commandPid, signal); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error; }
    }
  };
  const onInterrupt = () => interrupt("SIGINT");
  const onTerminate = () => interrupt("SIGTERM");
  process.on("SIGINT", onInterrupt); process.on("SIGTERM", onTerminate);
  let directory: string | undefined;
  let status: Awaited<ReturnType<typeof open>> | undefined;
  try {
    directory = await mkdtemp("/tmp/agent-tools-process-");
    const statusPath = join(directory, "status");
    status = await open(statusPath, "wx", 0o600);
    if (interrupted) return interrupted;
    child = Bun.spawn([bwrap, "--die-with-parent", "--info-fd", "3", ...args, "--", ...command],
      { env, stdio: ["inherit", "inherit", "inherit", status.fd] });
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
    process.off("SIGINT", onInterrupt); process.off("SIGTERM", onTerminate);
    if (status) { await status.close(); await unlink(join(directory!, "status")); }
    if (directory) await rmdir(directory);
  }
}

export async function runImage(image: string, command: string[], runtime?: string): Promise<number> {
  if (process.platform !== "linux") throw new Error("image execution currently supports Linux only");
  if (command.length === 0) throw new Error("a command is required after --");
  const imagePath = await realpath(image);
  if (!(await lstat(imagePath)).isFile() || await Bun.file(imagePath).slice(0, 4).text() !== "hsqs") {
    throw new Error("IMAGE must be a SquashFS file");
  }
  const squashfuse = runtime ? join(runtime, "squashfuse") : executable("squashfuse");
  const unmount = executable("fusermount3", "fusermount");
  const bwrap = runtime ? join(runtime, "bwrap") : executable("bwrap");
  if (!process.env.HOME) throw new Error("HOME must be set");
  const userDirectory = await realpath(process.env.HOME);
  if (userDirectory === "/") throw new Error("HOME cannot be the filesystem root");
  const cwd = await realpath(process.cwd());
  const directory = await mkdtemp("/tmp/agent-tools-");
  const mount = join(directory, "root");
  await mkdir(mount);
  let fuse: ReturnType<typeof Bun.spawn> | undefined;
  let attached = false;
  let interrupted = 0;
  const interrupt = (signal: "SIGINT" | "SIGTERM") => {
    interrupted = signal === "SIGINT" ? 130 : 143;
    fuse?.kill(signal);
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
    const entry = await exists(join(mount, "opt/agent-tools/enter")) ? ["/opt/agent-tools/enter"] : [];
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
    process.off("SIGINT", onInterrupt); process.off("SIGTERM", onTerminate);
    return await runNamespace(bwrap, [...args, "--chdir", cwd,
      "--setenv", "HOME", userDirectory, "--setenv", "PATH",
      `/opt/agent-tools/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ""}`], [...entry, ...command]);
  } catch (error) {
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
    const runtime = dirname(await realpath(process.execPath));
    const invoked = basename(process.argv0);
    const command = invoked.replace(/^-/, "");
    if (command !== "agent-tools" && await exists(join(runtime, "tools.sqfs"))) {
      const login = invoked.startsWith("-") && ["fish", "bash", "zsh"].includes(command);
      process.exitCode = await runImage(join(runtime, "tools.sqfs"), [command, ...(login ? ["--login"] : []), ...args], runtime);
    } else if (args[0] === "pull" && process.env.AGENT_TOOLS_RUNTIME === "1" && process.env.AGENT_TOOLS_UPDATER !== "1") {
      // The control namespace maps root to this user. It grants mount capability
      // only for update verification, not for ordinary managed commands.
      process.exitCode = await runNamespace(executable("bwrap"), ["--unshare-user", "--uid", "0", "--gid", "0",
        "--cap-add", "CAP_SYS_ADMIN", "--bind", "/", "/", "--dev-bind", "/dev", "/dev", "--proc", "/proc",
        "--chdir", process.cwd()], [process.execPath, ...args], { ...process.env, AGENT_TOOLS_UPDATER: "1" });
    } else if (args.length === 1 && args[0] === "--version") console.log(VERSION);
    else if (args.length === 0 || (args.length === 1 && ["--help", "-h"].includes(args[0]))) process.stdout.write(usage);
    else if (args[0] === "pull") {
      const options = { repository: "ghcr.io/yusing/agentic-tools", tag: `stable-linux-${process.arch === "x64" ? "amd64" : process.arch}`, state: stateDirectory() };
      for (let i = 1; i < args.length; i += 2) {
        const key = args[i].slice(2) as keyof typeof options;
        if (!["--repository", "--tag", "--state"].includes(args[i]) || !args[i + 1]) throw new Error(usage.trim());
        options[key] = args[i + 1];
      }
      await pullImage(options, (image, runtime) => runImage(image, ["/bin/true"], runtime));
    } else if (args.length === 1 && args[0] === "link-hooks") {
      const state = stateDirectory();
      for (const owner of ["codex", "grok"]) {
        const source = join(state, "current/hooks", owner);
        if (!await exists(source)) continue;
        const destination = join(process.env.HOME!, `.${owner}/hooks/bin`);
        await mkdir(destination, { recursive: true });
        for (const name of await readdir(source)) {
          const target = join(destination, name);
          const temporary = `${target}.agent-tools-${process.pid}`;
          if (await exists(target) && !(await lstat(target)).isSymbolicLink()) {
            const backup = join(state, "backups", owner);
            await mkdir(backup, { recursive: true });
            await rename(target, join(backup, `${name}-${Date.now()}`));
          }
          await symlink(join(state, "current/hooks", owner, name), temporary);
          await rename(temporary, target);
        }
      }
    } else if (args[0] === "run") {
      let image: string | undefined;
      let state = stateDirectory();
      let i = 1;
      for (; i < args.length && args[i] !== "--"; i += 2) {
        if (args[i] === "--image" && args[i + 1]) image = args[i + 1];
        else if (args[i] === "--state" && args[i + 1]) state = resolve(args[i + 1]);
        else throw new Error(usage.trim());
      }
      if (args[i] !== "--") throw new Error(usage.trim());
      if (process.env.AGENT_TOOLS_RUNTIME === "1") {
        if (i !== 1) throw new Error("run alternate images or states from a host shell");
        const command = args.slice(i + 1);
        if (!command.length) throw new Error("a command is required after --");
        process.execve(executable(command[0]), command, process.env as Record<string, string>);
      }
      const active = image ? undefined : await realpath(join(state, "current"));
      process.exitCode = await runImage(image ?? join(active!, "tools.sqfs"), args.slice(i + 1), active);
    } else throw new Error(usage.trim());
  } catch (error) {
    console.error(`agent-tools: ${(error as Error).message}`);
    process.exitCode = (error as Error & { exitCode?: number }).exitCode ?? 1;
  }
}
