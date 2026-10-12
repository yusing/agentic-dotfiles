import { lstat, mkdir, mkdtemp, open, readdir, readFile, readlink, realpath, rename, rm, rmdir, stat, symlink, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dlopen, ptr } from "bun:ffi";
import { HELPER_SOURCES } from "../compile-agent-tools/compile-agent-tools";
import { pullImage, pruneImages, stateDirectory } from "./pull";

export const VERSION = "0.2.11";
type Binding = { destination: string; source?: string; kind: "--bind" | "--ro-bind" | "--dev-bind" | "--proc" };

const usage = `Usage: agent-tools pull

Pull the stable tool image for this machine and remove inactive older images.
`;

export async function provisionLanguages(configPath: string, upgrade: boolean): Promise<void> {
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const os = process.platform === "darwin" ? "macos" : "linux";
  const brew = process.platform === "darwin"
    ? ["/opt/homebrew/bin/brew", "/usr/local/bin/brew"].find(path => Bun.file(path).size > 0)
    : "/home/linuxbrew/.linuxbrew/bin/brew";
  if (!brew) throw new Error("Homebrew is required for managed language provisioning");
  const prefix = (name: string): string | undefined => {
    const entry = config.native?.[name];
    if (!entry || entry.manager !== "brew" || (entry.os && !entry.os.includes(os))) return;
    const result = Bun.spawnSync([brew, "--prefix", entry.packages.brew[0]]);
    if (result.exitCode !== 0) throw new Error(`cannot resolve Brew ${name}`);
    return result.stdout.toString().trim();
  };
  const run = async (command: string[], env = process.env) => {
    const child = Bun.spawn(command, { stdio: ["inherit", "inherit", "inherit"], env });
    if (await child.exited !== 0) throw new Error(`language provisioning failed: ${command[0]}`);
  };
  const userDirectory = process.env.HOME!;
  const python = prefix("python3");
  if (python) {
    console.error("agent-tools: preparing Brew Python with PyYAML 6.0.3 and Pyflakes 4.0.3");
    const environment = join(userDirectory, ".local/opt/python");
    await run([join(python, "bin/python3"), "-m", "venv", environment]);
    const interpreter = join(environment, "bin/python");
    if (Bun.spawnSync([interpreter, "-c", 'import pip,yaml,pyflakes; assert yaml.__version__ == "6.0.3" and pyflakes.__version__ == "4.0.3"']).exitCode !== 0) {
      await run([interpreter, "-m", "pip", "install", "--cache-dir", join(userDirectory, ".cache/pip"), "PyYAML==6.0.3", "pyflakes==4.0.3"],
        { ...process.env, PIP_DISABLE_PIP_VERSION_CHECK: "1" });
    }
    const paths = join(userDirectory, ".local/share/dotfiles-setup/brew-paths");
    await mkdir(dirname(paths), { recursive: true });
    const previous = await exists(paths) ? await readFile(paths, "utf8") : "";
    const temporary = `${paths}.${process.pid}`;
    await writeFile(temporary, [...previous.trim().split("\n").filter(path => path && path !== join(environment, "bin")), join(environment, "bin")].join("\n") + "\n");
    await rename(temporary, paths);
  }
  const rust = prefix("rustup");
  if (rust) {
    console.error("agent-tools: preparing stable Rust with wasm32-wasip2");
    const rustup = join(rust, "bin/rustup");
    const env = { ...process.env, RUSTUP_HOME: join(userDirectory, ".rustup") };
    const targets = Bun.spawnSync([rustup, "target", "list", "--toolchain", "stable", "--installed"], { env });
    if (upgrade || targets.exitCode !== 0 || !targets.stdout.toString().split("\n").includes("wasm32-wasip2")) {
      await run([rustup, "toolchain", "install", "stable", "--profile", "default", "--target", "wasm32-wasip2", "--no-self-update"], env);
    }
    await run([rustup, "default", "stable"], env);
  }
}

type CleanupConfig = {
  native: Record<string, { packages: Record<string, string[]>; commands?: string[]; os?: string[]; manager?: string; legacy_mise?: string[] }>;
  mise: { tools: Record<string, unknown> }; mise_commands: Record<string, string>;
  vendors: Record<string, { legacy_mise?: string[] }>;
  legacy: Record<string, { packages?: Record<string, string[]>; files?: { path: string; command: string }[];
    legacy_mise?: string[]; retired?: boolean; bun?: string; directories?: { path: string; executable?: string; origin_contains?: string }[] }>;
};
type ImageInventory = { config: CleanupConfig; commands: string[]; formulae: string[]; runtimeVersion?: string;
  nativeHost?: boolean; brewPrefix?: string; replacements?: Record<string, string> };
type CleanupPlan = { packages: Record<string, string[]>; paths: string[]; kept: string[]; bunPackages?: string[] };
const hostTools = new Set(["bash", "zsh", "fish", "git", "curl", "openssh", "gnupg", "python", "python3", "ca-certificates",
  "sudo", "fuse", "fuse3", "libfuse3-3", "util-linux", "coreutils", "procps", "ncurses-bin",
  "zsh-autocomplete", "zsh-autosuggestions", "zsh-syntax-highlighting"]);

function hostBrew(): string {
  return process.platform === "darwin"
    ? ["/opt/homebrew/bin/brew", "/usr/local/bin/brew"].find(existsSync) ?? "/opt/homebrew/bin/brew"
    : "/home/linuxbrew/.linuxbrew/bin/brew";
}

function cleanupCommand(command: string[], allowFailure = false): string {
  command = cleanupManagerCommand(command);
  const child = Bun.spawnSync(command, { env: cleanupEnvironment(), timeout: 90_000 });
  if (child.exitCode !== 0 && !allowFailure) throw new Error(`cleanup command failed: ${command[0]} ${command[1] ?? ""}: ${child.stderr.toString().trim()}`);
  return child.exitCode === 0 ? child.stdout.toString().trim() : "";
}

function canonicalHostPath(path: string): string {
  try { return realpathSync(path); } catch { return path; }
}

function activePackageFile(path: string, active: string[]): boolean {
  const canonical = canonicalHostPath(path);
  if (!active.includes(canonical)) return false;
  // Package file lists include shared directories such as /. A process cwd
  // there must not retain every package that records that directory.
  try { return !statSync(canonical).isDirectory(); } catch { return true; }
}

function relativeEntrypoint(executable: string, argv: string[]): string | undefined {
  if (!/^(node|nodejs|bun|python(?:\d+(?:\.\d+)*)?)$/.test(basename(executable))) return;
  if (basename(argv[0] ?? "") === "bunx") return; // Package selector, not a filesystem entrypoint.
  if (basename(executable) === "bun" && /^(test|x|repl|exec|install|i|add|a|remove|rm|update|audit|dedupe|prune|outdated|link|unlink|publish|patch|pm|info|why|build|init|create|c|upgrade)$/.test(argv[1] ?? "")) return;
  for (let index = 1; index < argv.length; index++) {
    const argument = argv[index];
    if (index === 1 && basename(executable) === "bun" && argument === "run") continue;
    if (["-e", "--eval", "-p", "--print", "-c", "-m"].includes(argument) || /^(--eval|--print)=/.test(argument)) return;
    if (["-r", "--require", "--import", "--loader", "--experimental-loader", "--input-type", "--conditions", "-C"].includes(argument)) { index++; continue; }
    if (argument === "--") continue;
    if (!argument || argument.startsWith("-")) continue;
    return argument.startsWith("/") ? undefined : argument;
  }
}

function unresolvedEntrypoint(pid: string | number): Error {
  return Object.assign(new Error(`cannot resolve the relative interpreter entrypoint for process ${pid}; close it and rerun ${process.platform === "darwin" ? "setup" : "pull"} to finish host cleanup`), { code: "ENTRYPOINT_UNRESOLVED" });
}

function cleanupEnvironment() {
  return { ...process.env, PATH: `/usr/sbin:/usr/bin:/sbin:/bin:${dirname(hostBrew())}`,
    HOMEBREW_NO_AUTO_UPDATE: "1", HOMEBREW_NO_AUTOREMOVE: "1" };
}

function cleanupManagerCommand(command: string[]): string[] {
  if (command[0] !== hostBrew() || process.getuid!() !== 0) return command;
  const uid = statSync(join(dirname(dirname(command[0])), "Cellar")).uid;
  const owner = readFileSync("/etc/passwd", "utf8").split("\n").map(line => line.split(":"))
    .find(fields => Number(fields[2]) === uid)?.[0];
  if (!owner || uid === 0) throw new Error("Homebrew cleanup must run as its non-root installation owner");
  return process.platform === "darwin" ? ["/usr/bin/sudo", "-u", owner, "--", ...command]
    : ["/usr/sbin/runuser", "-u", owner, "--", ...command];
}

// Keep the exact installed dependency closure, including dependents held back
// by another retained package. Never ask a manager to autoremove dependencies.
export function removablePackages(candidates: string[], dependents: (name: string) => string[]): string[] {
  let remaining = new Set(candidates);
  while (true) {
    const next = new Set([...remaining].filter(name => dependents(name).every(dep => remaining.has(dep))));
    if (next.size === remaining.size) return [...next].sort();
    remaining = next;
  }
}

function aptDependents(names: string[], installed: string[]): Map<string, string[]> {
  const result = new Map(names.map(name => [name, [] as string[]]));
  const output = cleanupCommand(["/usr/bin/apt-cache", "rdepends", "--installed", "--no-recommends", "--no-suggests",
    "--no-conflicts", "--no-breaks", "--no-replaces", "--no-enhances", ...names]);
  let current: string | undefined;
  for (const line of output.split("\n")) {
    if (!/^\s/.test(line)) { current = result.has(line.split(":")[0]) ? line.split(":")[0] : current; continue; }
    const name = line.trim().replace(/[|<>]/g, "").split(":")[0];
    if (current && installed.includes(name)) result.get(current)!.push(name);
  }
  return result;
}

export async function processPaths(): Promise<string[]> {
  if (process.platform === "darwin") {
    if (process.getuid!() !== 0) throw Object.assign(new Error("complete process inspection requires sudo"), { code: "EACCES" });
    const result = Bun.spawnSync(["/usr/sbin/lsof", "-nP", "-F0pfn"], { timeout: 90_000 });
    if (result.exitCode !== 0 || result.stderr.length) throw new Error("native process inspection is incomplete; no host tools removed");
    const paths = new Set<string>();
    const processes = new Map<number, string | undefined>();
    let pid = 0, fieldName = "";
    for (const field of result.stdout.toString().split("\0").map(field => field.replace(/^\n/, ""))) {
      if (field.startsWith("p")) { pid = Number(field.slice(1)); processes.set(pid, undefined); }
      else if (field.startsWith("f")) fieldName = field.slice(1);
      else if (field.startsWith("n/")) {
        const path = canonicalHostPath(field.slice(1).replace(/ \(deleted\)$/, ""));
        paths.add(path);
        if (fieldName === "cwd") processes.set(pid, path);
      }
    }
    // KERN_PROCARGS2 preserves argument boundaries, including entrypoints with
    // spaces. Loaded scripts need not remain open or mapped in the interpreter.
    const libc = dlopen("/usr/lib/libSystem.B.dylib", {
      sysctl: { args: ["ptr", "u32", "ptr", "ptr", "ptr", "u64"], returns: "i32" },
    });
    try {
      for (const [pid, cwd] of processes) {
        const mib = new Int32Array([1, 49, pid]);
        const size = new BigUint64Array(1);
        const failed = () => {
          if (Bun.spawnSync(["/bin/kill", "-0", String(pid)]).exitCode === 0) {
            throw new Error("native process argument inspection is incomplete; no host tools removed");
          }
        };
        if (libc.symbols.sysctl(ptr(mib), 3, null, ptr(size), null, 0) !== 0) { failed(); continue; }
        const buffer = Buffer.alloc(Number(size[0]));
        if (buffer.length < 4 || libc.symbols.sysctl(ptr(mib), 3, ptr(buffer), ptr(size), null, 0) !== 0) { failed(); continue; }
        const count = buffer.readInt32LE(0);
        const executable = buffer.toString("utf8", 4, buffer.indexOf(0, 4));
        const argv: string[] = [];
        let offset = buffer.indexOf(0, 4);
        if (offset < 0) throw new Error("invalid native process argument report");
        while (buffer[offset] === 0 && offset < Number(size[0])) offset++;
        for (let index = 0; index < count; index++) {
          const end = buffer.indexOf(0, offset);
          if (end < 0) throw new Error("incomplete native process argument report");
          const argument = buffer.toString("utf8", offset, end);
          argv.push(argument);
          if (argument && !argument.startsWith("-") && (argument.startsWith("/") || cwd)) {
            const path = resolve(cwd ?? "/", argument);
            if (await exists(path)) paths.add(canonicalHostPath(path));
          }
          offset = end + 1;
        }
        const entrypoint = relativeEntrypoint(executable, argv);
        if (entrypoint && (!cwd || !await exists(resolve(cwd, entrypoint)))) throw unresolvedEntrypoint(pid);
      }
    } finally { libc.close(); }
    return [...paths];
  }
  const paths = new Set<string>();
  const identities = new Map<string, boolean>();
  const check = (error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "ENTRYPOINT_UNRESOLVED") throw error;
    if (["ENOENT", "ESRCH"].includes((error as NodeJS.ErrnoException).code ?? "")) return;
    const detail = error as NodeJS.ErrnoException;
    throw Object.assign(new Error(`live process inspection is incomplete (${detail.syscall ?? "read"}: ${detail.code ?? "unknown"}); cleanup requires privileged inspection`), { code: "EACCES" });
  };
  const device = (value: number) => {
    const number = BigInt(value);
    return `${((number >> 8n) & 0xfffn) | ((number >> 32n) & 0xfffff000n)}:${(number & 0xffn) | ((number >> 12n) & 0xffffff00n)}`;
  };
  for (const pid of (await readdir("/proc")).filter(name => /^\d+$/.test(name))) {
    let identity: string;
    let mounts: { path: string; device: string }[];
    try {
      const root = await stat(`/proc/${pid}/root`);
      identity = `${await readlink(`/proc/${pid}/ns/mnt`)}:${root.dev}:${root.ino}`;
      mounts = (await readFile(`/proc/${pid}/mountinfo`, "utf8")).trim().split("\n").map(line => {
        const fields = line.split(" ");
        return {path:fields[4].replace(/\\([0-7]{3})/g, (_, value) => String.fromCharCode(parseInt(value, 8))),device:fields[2]};
      }).sort((left,right) => right.path.length-left.path.length);
    } catch (error) { check(error); continue; }
    const addHostPath = async (path: string, probe: string, cache = false) => {
      path = path.replace(/ \(deleted\)$/, "");
      if (!path.startsWith("/")) return;
      const key = `${identity}:${path}`;
      let same = cache ? identities.get(key) : undefined;
      if (same === undefined) {
        try {
          const host = await stat(path);
          const processDevice = mounts.find(mount => mount.path === "/" || path === mount.path || path.startsWith(`${mount.path}/`))?.device;
          if (processDevice && device(host.dev) !== processDevice) same = false;
          else {
            const processFile = await stat(probe);
            same = host.dev === processFile.dev && host.ino === processFile.ino;
          }
        } catch (error) { check(error); same = false; }
        if (cache) identities.set(key, same);
      }
      if (same) paths.add(path);
    };
    for (const name of ["exe", "cwd"]) {
      try { await addHostPath(await readlink(`/proc/${pid}/${name}`), `/proc/${pid}/${name}`); } catch (error) { check(error); }
    }
    try {
      const cwd = await readlink(`/proc/${pid}/cwd`);
      const arguments_ = (await readFile(`/proc/${pid}/cmdline`, "utf8")).split("\0");
      const entrypoint = relativeEntrypoint(await readlink(`/proc/${pid}/exe`), arguments_);
      if (entrypoint) {
        try { await stat(`/proc/${pid}/root${resolve(cwd, entrypoint)}`); }
        catch (error) {
          if (["ENOENT", "ENOTDIR", "ENAMETOOLONG"].includes((error as NodeJS.ErrnoException).code ?? "")) {
            await stat(`/proc/${pid}/exe`); // A process that exited needs no protection.
            throw unresolvedEntrypoint(pid);
          }
          check(error);
        }
      }
      for (const argument of arguments_) {
        if (!argument || argument.startsWith("-")) continue;
        const path = resolve(cwd, argument);
        const probe = `/proc/${pid}/root${path}`;
        try { await stat(probe); }
        catch (error) {
          if (["ENOENT", "ENOTDIR", "ENAMETOOLONG"].includes((error as NodeJS.ErrnoException).code ?? "")) continue;
          // An argument can name an owner-only FUSE path or inaccessible data.
          // Keep it conservatively; executable/maps/fd inspection stays strict.
          if (["EACCES", "EPERM"].includes((error as NodeJS.ErrnoException).code ?? "")) {
            paths.add(canonicalHostPath(path)); continue;
          }
          check(error); continue;
        }
        await addHostPath(canonicalHostPath(path), probe);
      }
      const maps = await readFile(`/proc/${pid}/maps`, "utf8");
      for (const line of maps.split("\n")) {
        const path = line.match(/^\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+(\/.*)$/)?.[1];
        if (path) await addHostPath(path, `/proc/${pid}/root${path.replace(/ \(deleted\)$/, "")}`, true);
      }
      for (const fd of await readdir(`/proc/${pid}/fd`)) {
        try { await addHostPath(await readlink(`/proc/${pid}/fd/${fd}`), `/proc/${pid}/fd/${fd}`); } catch (error) { check(error); }
      }
    } catch (error) { check(error); }
  }
  return [...paths];
}

async function inspectProcesses(): Promise<string[]> {
  try { return await processPaths(); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EACCES" || process.getuid!() === 0) throw error;
    console.error("agent-tools: requesting sudo for complete live-process inspection");
    const scanner = process.platform === "darwin" ? join(process.env.HOME!, ".local/bin/agent-tools") : process.execPath;
    const child = Bun.spawn(["/usr/bin/sudo", "/usr/bin/env", "AGENT_TOOLS_PROCESS_SCAN=1", scanner],
      { stdin: "inherit", stdout: "pipe", stderr: "inherit" });
    const output = await new Response(child.stdout).text();
    if (await child.exited !== 0) throw new Error("privileged live-process inspection failed; remaining cleanup stopped");
    const paths = JSON.parse(output);
    if (!Array.isArray(paths) || paths.some(path => typeof path !== "string")) throw new Error("invalid live-process inspection report");
    return paths;
  }
}

export async function planCleanup(userDirectory: string, inventory: ImageInventory, active: string[]): Promise<CleanupPlan> {
  const config = inventory.config;
  const commands = new Set(inventory.commands);
  const formulae = new Set(inventory.formulae);
  const plan: CleanupPlan = { packages: { brew: [], apt: [], pacman: [] }, paths: [], kept: [] };
  const candidates = { brew: new Set<string>(), apt: new Set<string>(), pacman: new Set<string>() };
  const owned = new Set<string>();
  const eligibleNative = new Set<string>();
  const shell = process.env.SHELL ? canonicalHostPath(process.env.SHELL) : "";
  const busy = (path: string) => shell.startsWith(`${path}/`) || active.some(item => item === path || item.startsWith(`${path}/`));
  const addPackage = (manager: string, name: string) => {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9@+_.\/-]*$/.test(name) || name.includes("..")) throw new Error(`unsafe package identity: ${name}`);
    if (manager in candidates) candidates[manager as keyof typeof candidates].add(name);
  };
  for (const [name, entry] of Object.entries(config.native)) {
    if (entry.os && !entry.os.includes(inventory.nativeHost ? "macos" : "linux")) continue;
    const packages = entry.packages.brew ?? [];
    if (!packages.length || !packages.every(pkg => formulae.has(pkg.split("/").at(-1)!))) continue;
    if (entry.commands?.length && !entry.commands.some(command => commands.has(command))) continue;
    eligibleNative.add(name);
    if (!inventory.nativeHost) for (const [manager, names] of Object.entries(entry.packages)) for (const pkg of names) addPackage(manager, pkg);
    for (const tool of entry.legacy_mise ?? []) owned.add(tool);
  }
  for (const tool of inventory.nativeHost ? [] : Object.keys(config.mise.tools)) {
    const command = config.mise_commands[tool] ?? tool.split(/[:/]/).at(-1)!;
    if (commands.has(command)) owned.add(tool);
  }
  for (const [name, entry] of Object.entries(config.vendors)) if (commands.has(name)) for (const tool of entry.legacy_mise ?? []) owned.add(tool);
  for (const [name, entry] of Object.entries(config.legacy)) {
    if (!commands.has(name) && !eligibleNative.has(name) && !entry.retired && name !== "mise") continue;
    for (const [manager, names] of Object.entries(entry.packages ?? {})) for (const pkg of names) addPackage(manager, pkg);
    for (const tool of entry.legacy_mise ?? []) owned.add(tool);
  }
  const roots = join(userDirectory, ".local/share/mise/installs");
  if (await exists(join(roots, ".mise-installs.toml"))) {
    const receipt = Bun.TOML.parse(await readFile(join(roots, ".mise-installs.toml"), "utf8")) as Record<string, { full?: string; short?: string }>;
    for (const [name, entry] of Object.entries(receipt)) {
      if (!owned.has(entry.full ?? "") && !owned.has(entry.short ?? "")) continue;
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name) || name.includes("..")) throw new Error("unsafe Mise receipt path");
      const path = join(roots, name);
      if (!await exists(path)) continue;
      if ((await lstat(path)).isSymbolicLink()) { plan.kept.push(`${path}: linked installation`); continue; }
      if (busy(path)) { plan.kept.push(`${path}: active process`); continue; }
      plan.paths.push(path);
    }
  }
  const keep = async (path: string) => {
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) {
      const resolved = await realpath(path).catch(() => "");
      if (resolved.includes("/.local/share/agent-tools/")) return true;
    } else if (!stat.isFile() || !["7f454c46", "cffaedfe", "cefaedfe", "feedfacf", "feedface", "cafebabe", "bebafeca"].includes(Buffer.from(await Bun.file(path).slice(0, 4).arrayBuffer()).toString("hex"))) return true;
    return busy(await realpath(path).catch(() => path));
  };
  for (const entry of Object.values(config.legacy)) for (const file of entry.files ?? []) {
    if (!commands.has(file.command) && !entry.retired) continue;
    if (hostTools.has(file.command)) continue;
    const path = resolve(userDirectory, file.path);
    if (!path.startsWith(`${userDirectory}/`) || path === join(userDirectory, ".local/bin")) throw new Error("unsafe legacy tool path");
    if (await exists(path) && canonicalHostPath(path) !== inventory.replacements?.[file.command] && !await keep(path)) plan.paths.push(path);
  }
  for (const [command, entry] of Object.entries(config.legacy)) {
    if (!commands.has(command) && !entry.retired) continue;
    for (const directory of entry.directories ?? []) {
      const path=resolve(userDirectory,directory.path);
      if (!path.startsWith(`${userDirectory}/`) || [".local", ".local/bin", ".local/share", ".config", ".bun", ".cargo", ".rustup"].some(name=>path===join(userDirectory,name))) throw new Error("unsafe legacy directory");
      if (!await exists(path) || !(await lstat(path)).isDirectory()) continue;
      if (busy(path)) { plan.kept.push(`${path}: active installation`); continue; }
      if (Object.values(inventory.replacements ?? {}).some(replacement=>replacement.startsWith(`${path}/`))) continue;
      if (directory.executable) {
        const executablePath=resolve(path,directory.executable);
        if (!executablePath.startsWith(`${path}/`) || !await exists(executablePath) || await keep(executablePath)) continue;
      } else if (directory.origin_contains) {
        const git=Bun.which("git",{PATH:cleanupEnvironment().PATH});
        if (!git || !await exists(join(path,".git"))) continue;
        const origin=Bun.spawnSync([git,"-C",path,"remote","get-url","origin"],{env:cleanupEnvironment()});
        if (origin.exitCode!==0 || !origin.stdout.toString().includes(directory.origin_contains)) continue;
      } else continue;
      plan.paths.push(path);
    }
    if (entry.bun) {
      const manifest=join(userDirectory,".bun/install/global/package.json");
      if (!await exists(manifest)) continue;
      if (!/^(@[a-zA-Z0-9_.-]+\/)?[a-zA-Z0-9_.-]+$/.test(entry.bun)) throw new Error("unsafe global package");
      const dependencies=JSON.parse(await readFile(manifest,"utf8")).dependencies ?? {};
      if (!Object.hasOwn(dependencies,entry.bun)) continue;
      const path=join(userDirectory,".bun/install/global/node_modules",entry.bun);
      if (Object.values(inventory.replacements ?? {}).some(replacement=>replacement.startsWith(`${path}/`)) || busy(path)) {
        plan.kept.push(`${entry.bun}: current or active global package`); continue;
      }
      (plan.bunPackages ??= []).push(entry.bun);
    }
  }
  // Only ELF helpers that have both a maintained source and a delivered command
  // qualify. Same-name tracked shell scripts remain authoritative source files.
  for (const [directory, name] of inventory.nativeHost ? [] : HELPER_SOURCES) {
    if (!commands.has(name) || ["agent-tools", "project-public-config", "compile-agent-tools"].includes(name)) continue;
    if (!await exists(join(userDirectory, ".local/lib", directory, `${name}.ts`))) continue;
    const path = join(userDirectory, ".local/bin", name);
    if (await exists(path) && !await keep(path)) plan.paths.push(path);
  }
  const brew = inventory.brewPrefix ? join(inventory.brewPrefix, "bin/brew") : hostBrew();
  if (await exists(brew)) {
    console.error(`agent-tools: checking ${candidates.brew.size} declared Homebrew package candidates`);
    const info = JSON.parse(cleanupCommand([brew, "info", "--installed", "--json=v2"])).formulae as any[];
    const installed = new Map(info.map(item => [item.name, item]));
    const dependencies = (item: any): string[] => (item.installed ?? []).flatMap((keg: any) =>
      (keg.runtime_dependencies ?? []).map((dep: any) => dep.full_name.split("/").at(-1)));
    const primary = new Set(inventory.nativeHost ? Object.values(config.native)
      .filter(entry => !entry.os || entry.os.includes("macos")).flatMap(entry => entry.packages.brew ?? []).map(name => name.split("/").at(-1)!) : []);
    const wanted = [...candidates.brew].map(name => name.split("/").at(-1)!).filter(name => installed.has(name) && !primary.has(name));
    for (let index = 0; index < wanted.length; index++) for (const dep of dependencies(installed.get(wanted[index]))) {
      const item = installed.get(dep);
      if (item?.installed?.length && item.installed.every((keg: any) => keg.installed_as_dependency && !keg.installed_on_request) && !wanted.includes(dep) && !primary.has(dep)) wanted.push(dep);
    }
    const eligible = wanted.filter(name => {
      const item = installed.get(name);
      const path = join(inventory.brewPrefix ?? dirname(dirname(brew)), "Cellar", name);
      if (hostTools.has(name) || item.service || /^(postgresql|mysql|mariadb|redis|mongodb)(@|$)/.test(name) || busy(path)) {
        plan.kept.push(`brew ${name}: host bootstrap, service, database or active process`); return false;
      }
      return true;
    });
    plan.packages.brew = removablePackages(eligible, name => info.filter(item => dependencies(item).includes(name)).map(item => item.name));
    for (const name of eligible) if (!plan.packages.brew.includes(name)) plan.kept.push(`brew ${name}: required by a retained formula`);
  }
  for (const manager of inventory.nativeHost ? [] : ["apt", "pacman"] as const) {
    const query = manager === "apt" ? "/usr/bin/dpkg-query" : "/usr/bin/pacman";
    if (!await exists(query)) continue;
    console.error(`agent-tools: checking ${candidates[manager].size} declared ${manager} package candidates`);
    const installed = manager === "apt" ? cleanupCommand([query, "-W", "-f=${Package}|${Status}\n"])
      .split("\n").filter(line => line.endsWith("|install ok installed")).map(line => line.split("|")[0])
      : cleanupCommand([query, "-Qq"]).split("\n");
    const wanted = [...candidates[manager]].filter(name => installed.includes(name));
    if (manager === "apt" && wanted.length) {
      const automatic = new Set(cleanupCommand(["/usr/bin/apt-mark", "showauto"]).split("\n"));
      let frontier = [...wanted];
      while (frontier.length) {
        console.error(`agent-tools: checking APT dependency wave (${frontier.length} packages)`);
        const depends = cleanupCommand(["/usr/bin/apt-cache", "depends", "--installed", "--no-recommends", "--no-suggests", ...frontier]);
        frontier = [];
        for (const line of depends.split("\n")) {
          const name = line.match(/^\s*\|?(?:Pre)?Depends:\s+([a-zA-Z0-9+_.-]+)/)?.[1];
          if (name && automatic.has(name) && installed.includes(name) && !wanted.includes(name)) { wanted.push(name); frontier.push(name); }
        }
      }
    }
    let eligible = wanted.filter(name => !hostTools.has(name)
      && !/^(libc6|systemd|libpam|login|passwd|openssh|postgresql|mysql|mariadb)/.test(name));
    eligible = eligible.filter(name => {
      const files = cleanupCommand([query, manager === "apt" ? "-L" : "-Qlq", name]).split("\n");
      if (files.some(path => activePackageFile(path, active))) { plan.kept.push(`${manager} ${name}: active process`); return false; }
      return true;
    });
    // Let the solver account for alternatives, virtual packages and multiarch.
    // It must remove only the exact declared set, with no collateral removals.
    if (!eligible.length) continue;
    if (manager === "apt") {
      const dependents = aptDependents(eligible, installed);
      const removable = removablePackages(eligible, name => dependents.get(name) ?? []);
      for (const name of eligible) if (!removable.includes(name)) plan.kept.push(`apt ${name}: required by a retained package`);
      eligible = removable;
      if (!eligible.length) continue;
      const simulation = cleanupCommand(["/usr/bin/apt-get", "-s", "remove", ...eligible]);
      const removed = simulation.split("\n").filter(line => line.startsWith("Remv ")).map(line => line.split(" ")[1].split(":")[0]);
      if (removed.every(name => eligible.includes(name))) plan.packages.apt = removed;
      else plan.kept.push(`apt: transaction retained because it also removes ${removed.filter(name => !eligible.includes(name)).join(", ")}`);
    } else {
      const simulation = cleanupCommand([query, "-R", "--print", "--print-format", "%n", ...eligible], true);
      const removed = simulation ? simulation.split("\n") : [];
      if (removed.every(name => eligible.includes(name))) plan.packages.pacman = removed;
      if (!removed.length) plan.kept.push("pacman: packages retained because a dependent blocks removal");
    }
  }
  plan.paths = [...new Set(plan.paths)].filter(path => !plan.paths.some(parent => parent !== path && path.startsWith(`${parent}/`))).sort();
  return plan;
}

async function transactionPackages(manager: "brew" | "apt" | "pacman", names: string[], kept: string[]): Promise<string[]> {
  const files = new Map<string, string[]>();
  const dependents = new Map<string, string[]>();
  if (manager === "brew") {
    const info = JSON.parse(cleanupCommand([hostBrew(), "info", "--installed", "--json=v2"])).formulae as any[];
    for (const name of names) {
      files.set(name, [join(dirname(dirname(hostBrew())), "Cellar", name)]);
      dependents.set(name, info.filter(item => (item.installed ?? []).some((keg: any) =>
        (keg.runtime_dependencies ?? []).some((dep: any) => dep.full_name.split("/").at(-1) === name))).map(item => item.name));
    }
  } else {
    const installed = manager === "apt" ? cleanupCommand(["/usr/bin/dpkg-query", "-W", "-f=${Package}\n"]).split("\n") : [];
    const apt = manager === "apt" ? aptDependents(names, installed) : undefined;
    for (const name of names) {
      files.set(name, cleanupCommand(manager === "apt" ? ["/usr/bin/dpkg-query", "-L", name] : ["/usr/bin/pacman", "-Qlq", name]).split("\n"));
      if (apt) dependents.set(name, apt.get(name) ?? []);
      else {
        const output = cleanupCommand(["/usr/bin/pacman", "-Qi", name]);
        dependents.set(name, (output.match(/^Required By\s*:\s*(.*(?:\n[ \t]+.*)*)/m)?.[1] ?? "").split(/\s+/).filter(dep => dep && dep !== "None"));
      }
    }
  }
  // Inspection follows metadata and authentication, directly before the actual
  // transaction. Newly active packages retain their dependency closure too.
  const active = await inspectProcesses();
  const eligible = names.filter(name => !files.get(name)!.some(path => manager === "brew"
    ? active.some(item => item === canonicalHostPath(path) || item.startsWith(`${path}/`))
    : activePackageFile(path, active)));
  const removable = removablePackages(eligible, name => dependents.get(name) ?? []);
  for (const name of names) if (!removable.includes(name)) kept.push(`${manager} ${name}: active or dependent at transaction recheck`);
  return removable;
}

async function nativeInventory(configPath: string): Promise<ImageInventory> {
  const config = JSON.parse(await readFile(configPath, "utf8")) as CleanupConfig;
  const brew = hostBrew();
  const prefix = cleanupCommand([brew, "--prefix"]);
  const formulae = (JSON.parse(cleanupCommand([brew, "info", "--installed", "--json=v2"])).formulae as any[]).map(item => item.name);
  const replacements: Record<string, string> = {};
  for (const entry of Object.values(config.native)) {
    if (entry.os && !entry.os.includes("macos")) continue;
    const formula = entry.packages.brew?.[0];
    if (!formula || !formulae.includes(formula.split("/").at(-1)!)) continue;
    const keg = cleanupCommand([brew, "--prefix", formula]);
    for (const command of entry.commands ?? []) {
      const path = [join(keg, "bin", command), join(keg, "libexec/gnubin", command)].find(path => existsSync(path));
      if (path) { if (Bun.spawnSync(["/usr/bin/test", "-x", path]).exitCode !== 0) throw new Error(`native replacement unavailable: ${command}`); replacements[command] = canonicalHostPath(path); }
    }
  }
  const mise = join(process.env.HOME!, ".local/bin/mise");
  if (config.native.python3?.manager === "brew" && (!config.native.python3.os || config.native.python3.os.includes("macos"))) {
    for (const command of ["python", "python3", "pyflakes"]) {
      const path = join(process.env.HOME!, ".local/opt/python/bin", command);
      if (Bun.spawnSync([path, "--version"]).exitCode !== 0) throw new Error(`managed Python replacement unavailable: ${command}`);
      replacements[command] = canonicalHostPath(path);
    }
  }
  for (const [tool, entry] of Object.entries(config.mise.tools)) {
    if (typeof entry === "object" && entry && (entry as any).os && !(entry as any).os.includes("macos")) continue;
    const command = config.mise_commands[tool] ?? tool.split(/[:/]/).at(-1)!;
    replacements[command] = canonicalHostPath(cleanupCommand([mise, "which", "--tool", tool, command]));
  }
  for (const [command, entry] of Object.entries(config.vendors)) {
    const path = join(process.env.HOME!, (entry as any).path);
    if (Bun.spawnSync(["/usr/bin/test", "-x", path]).exitCode !== 0) continue;
    replacements[command] = canonicalHostPath(path);
  }
  return { config, commands: Object.keys(replacements), formulae, nativeHost: true, brewPrefix: prefix, replacements };
}

export async function cleanupTools(configPath?: string): Promise<void> {
  if (!["linux", "darwin"].includes(process.platform) || process.env.AGENT_TOOLS_RUNTIME === "1") throw new Error("run cleanup from a host shell");
  if (process.platform === "linux" && /NoNewPrivs:\s+1/.test(await readFile("/proc/self/status", "utf8"))) throw new Error("run cleanup from a fresh host terminal outside the old image namespace");
  const state = stateDirectory();
  await mkdir(state, { recursive: true });
  const lock = await open(join(state, "pull.lock"), "a", 0o600);
  const libc = dlopen(process.platform === "darwin" ? "/usr/lib/libSystem.B.dylib" : "libc.so.6", { flock: { args: ["i32", "i32"], returns: "i32" } });
  let directory: string | undefined;
  try {
    if (libc.symbols.flock(lock.fd, 2 | 4) !== 0) throw new Error("another tool update is in progress");
    let inventory: ImageInventory;
    if (process.platform === "darwin") inventory = await nativeInventory(configPath ?? join(process.env.HOME!, "setup.json"));
    else {
    const runtime = await realpath(join(state, "current"));
    directory = await mkdtemp("/tmp/agent-tools-cleanup-");
    const report = join(directory, "inventory.json");
    console.error("agent-tools: checking active image replacements");
    const code = await runImage(join(runtime, "tools.sqfs"), ["bun", "-e",
      `const config=JSON.parse(await Bun.file('/opt/agent-home/setup.json').text()); const commands=JSON.parse(await Bun.file('/opt/agent-tools/commands.json').text());
       const fs=require('node:fs'); for (const name of commands) {
         const path=fs.realpathSync('/opt/agent-tools/bin/'+name);
         if(!['/opt/agent-home/','/home/linuxbrew/.linuxbrew/','/usr/','/bin/','/sbin/'].some(prefix=>path.startsWith(prefix))) throw Error('replacement outside image: '+name);
         fs.accessSync(path,fs.constants.X_OK);
       }
       const version=Bun.spawnSync(['/opt/agent-home/.local/bin/agent-tools','--version']); if(version.exitCode!==0) throw Error('cannot identify replacement release');
       await Bun.write(process.argv[1], JSON.stringify({config,commands,formulae:fs.readdirSync('/home/linuxbrew/.linuxbrew/Cellar'),runtimeVersion:version.stdout.toString().trim()}));`, report], runtime);
    if (code !== 0) throw new Error("active image replacement check failed; no host tools removed");
    inventory = JSON.parse(await readFile(report, "utf8")) as ImageInventory;
    const version = inventory.runtimeVersion?.split(".").map(Number);
    const compatible = version?.length === 3 && version.every(Number.isFinite) &&
      (version[0] > 0 || version[1] > 2 || (version[1] === 2 && version[2] >= 7));
    if (!compatible) throw new Error("active image predates the corrected cleanup replacements (0.2.7); publish and pull the new image before removing host tools");
    const checkout = configPath ?? join(process.env.HOME!, "setup.json");
    if (await exists(checkout)) inventory.config = JSON.parse(await readFile(checkout, "utf8"));
    }
    const plan = await planCleanup(await realpath(process.env.HOME!), inventory, await inspectProcesses());
    // Acquire privilege before changing any user-owned paths. Package managers
    // still recheck their own transaction, and never purge database/config data.
    const system = plan.packages.apt.length || plan.packages.pacman.length;
    if (system && process.getuid!() !== 0) {
      const sudo = Bun.spawn(["/usr/bin/sudo", "-v"], { stdio: ["inherit", "inherit", "inherit"] });
      if (await sudo.exited !== 0) throw new Error("sudo authentication failed; no host tools removed");
    }
    if (plan.bunPackages?.length) {
      const bun=Bun.which("bun",{PATH:cleanupEnvironment().PATH}) ?? join(process.env.HOME!,".bun/bin/bun");
      const active=await inspectProcesses();
      const packages=plan.bunPackages.filter(name=>{
        const root=join(process.env.HOME!,".bun/install/global/node_modules",name);
        return !active.some(path=>path===root || path.startsWith(root+"/"));
      });
      if (packages.length) {
        const child=Bun.spawn([bun,"remove","-g",...packages],{stdio:["inherit","inherit","inherit"],env:cleanupEnvironment()});
        if (await child.exited!==0) throw new Error("obsolete global package removal failed; remaining tools were retained");
      }
    }
    for (const manager of ["brew", "apt", "pacman"] as const) {
      let names = plan.packages[manager];
      if (!names.length) continue;
      names = await transactionPackages(manager, names, plan.kept);
      if (!names.length) continue;
      console.error(`agent-tools: removing ${manager} packages: ${names.join(" ")}`);
      const command = cleanupManagerCommand(manager === "brew" ? [hostBrew(), "uninstall", "--formula", ...names]
        : manager === "apt" ? ["/usr/bin/dpkg", "--remove", ...names] : ["/usr/bin/pacman", "-R", "--noconfirm", ...names]);
      if (manager !== "brew" && process.getuid!() !== 0) command.unshift("/usr/bin/sudo");
      const child = Bun.spawn(command, { stdio: ["inherit", "inherit", "inherit"], env: cleanupEnvironment() });
      if (await child.exited !== 0) throw new Error(`${manager} cleanup failed; remaining paths were retained`);
    }
    const active = await inspectProcesses();
    for (const path of plan.paths) {
      if (active.some(item => item === path || item.startsWith(`${path}/`))) {
        plan.kept.push(`${path}: active at final recheck`);
        console.error(`agent-tools: keeping active path ${path}`); continue;
      }
      console.error(`agent-tools: removing stale tool ${path}`);
      await rm(path, { recursive: (await lstat(path)).isDirectory() });
    }
    console.error(`agent-tools: host cleanup applied; ${plan.kept.length} protected or dependent items retained`);
  } finally {
    libc.close(); await lock.close();
    if (directory) await rm(directory, { recursive: true, force: true });
  }
}

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
  // An open-file lease also passes to FUSE, including detached descendants.
  // Pruning must acquire the exclusive lease before removing a release.
  let lease: Awaited<ReturnType<typeof open>> | undefined;
  try {
    lease = await open(image, "r");
    const libc = dlopen("libc.so.6", { flock: { args: ["i32", "i32"], returns: "i32" } });
    try {
      while (libc.symbols.flock(lease.fd, 1 | 4) !== 0) await Bun.sleep(10);
    } finally { libc.close(); }
    return await runLeasedImage(image, command, runtime, lease.fd);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT" && runtime && /^[a-f0-9]{64}$/.test(basename(runtime))) {
      const active = await realpath(join(dirname(dirname(runtime)), "current"));
      if (active !== runtime) {
        await lease?.close(); lease = undefined;
        return await runImage(join(active, "tools.sqfs"), command, active);
      }
    }
    throw error;
  } finally { await lease?.close(); }
}

async function runLeasedImage(image: string, command: string[], runtime: string | undefined, lease: number): Promise<number> {
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
    fuse = Bun.spawn([squashfuse, "-f", imagePath, mount], { stdio: ["ignore", "ignore", "inherit", lease] });
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
    for (const path of new Set([userDirectory, cwd])) {
      // Home and cwd must remain complete write-through binds. Do not replace
      // them with a synthetic directory whose new files disappear on exit.
      if (bindings.some(item => path === item.destination || path.startsWith(`${item.destination}/`))) continue;
      const source = join(mount, path);
      const stat = await exists(source) ? await lstat(source) : undefined;
      if (path === "/" || (stat && (!stat.isDirectory() || (await readdir(source)).length > 0))) {
        throw new Error(`host path ${path} overlaps image-owned files; use a home and working directory outside image tool directories`);
      }
      bindings.push({ destination: path, source: path, kind: "--bind" });
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

export async function linkHooks(state = stateDirectory()): Promise<void> {
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
}

export async function pullTools(): Promise<void> {
  if (process.env.AGENT_TOOLS_RUNTIME === "1") throw new Error("run agent-tools pull from a host shell");
  const state = stateDirectory();
  await pullImage({ repository: "ghcr.io/yusing/agentic-tools",
    tag: `stable-linux-${process.arch === "x64" ? "amd64" : process.arch}`, state },
    (image, runtime) => runImage(image, ["/bin/true"], runtime));
  await linkHooks(state);
  await pruneImages(state);
  await cleanupTools();
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  try {
    const runtime = dirname(await realpath(process.execPath));
    const invoked = basename(process.argv0);
    const command = invoked.replace(/^-/, "");
    if (["fish", "bash", "zsh", "sh"].includes(command) && process.env.AGENT_TOOLS_RUNTIME !== "1") {
      // A login shell must retain the host filesystem and privilege boundary.
      // The dedicated Fish bootstrap is independent of retired Mise installs.
      const candidates = [join(stateDirectory(), "host-bin", command), `/usr/bin/${command}`, `/bin/${command}`,
        `/usr/local/bin/${command}`, `/home/linuxbrew/.linuxbrew/bin/${command}`,
        ...(command === "fish" ? [join(stateDirectory(), "current/host-fish")] : [])];
      for (const candidate of candidates) {
        if (await exists(candidate) && await realpath(candidate) !== await realpath(process.execPath)) {
          process.execve(candidate, [command, ...(invoked.startsWith("-") ? ["--login"] : []), ...args], process.env as Record<string, string>);
        }
      }
      throw new Error(`host ${command} is unavailable; install a host shell before selecting it as a login shell`);
    }
    if (command !== "agent-tools" && (await exists(join(runtime, "tools.sqfs")) || ["fish", "bash", "zsh"].includes(command))) {
      const login = invoked.startsWith("-") && ["fish", "bash", "zsh"].includes(command);
      if (process.env.AGENT_TOOLS_RUNTIME === "1") {
        process.execve(executable(command), [command, ...(login ? ["--login"] : []), ...args], process.env as Record<string, string>);
      }
      const active = await exists(join(runtime, "tools.sqfs")) ? runtime : await realpath(join(stateDirectory(), "current"));
      process.exitCode = await runImage(join(active, "tools.sqfs"), [command, ...(login ? ["--login"] : []), ...args], active);
    } else if (process.env.AGENT_TOOLS_PROCESS_SCAN === "1") {
      if (process.getuid!() !== 0 || process.env.AGENT_TOOLS_RUNTIME === "1") throw new Error("process inspection requires the privileged host namespace");
      console.log(JSON.stringify(await processPaths()));
    } else if (args.length === 1 && args[0] === "--version") console.log(VERSION);
    else if (args.length === 0 || (args.length === 1 && ["--help", "-h"].includes(args[0]))) process.stdout.write(usage);
    else if (args.length === 1 && args[0] === "pull") await pullTools();
    else throw new Error(usage.trim());
  } catch (error) {
    console.error(`agent-tools: ${(error as Error).message}`);
    process.exitCode = (error as Error & { exitCode?: number }).exitCode ?? 1;
  }
}
