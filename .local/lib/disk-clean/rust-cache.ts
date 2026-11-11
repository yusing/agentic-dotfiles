import { spawnSync } from "node:child_process";
import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { intersectsMounts } from "../tmp-clean/tmp_clean";

const signature = "Signature: 8a477f597d28d172789f06886806bc55";
const sessionName = /^s-[a-z0-9]+-[a-z0-9]+-working$/;

function cargoTarget(path: string): boolean {
  try {
    return lstatSync(join(path, ".rustc_info.json")).isFile()
      && readFileSync(join(path, "CACHEDIR.TAG"), "utf8").startsWith(signature);
  } catch (error) {
    if (["ENOENT", "ENOTDIR"].includes((error as NodeJS.ErrnoException).code ?? "")) return false;
    throw error;
  }
}

function directories(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => join(path, entry.name));
}

export function discoverRustTargets(projects: string): string[] {
  const targets: string[] = [];
  function visit(path: string): void {
    if (cargoTarget(path)) { targets.push(path); return; }
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (entry.isDirectory() && ![".git", "node_modules", ".venv"].includes(entry.name)) visit(join(path, entry.name));
    }
  }
  try { visit(projects); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return targets;
}

function removableTree(path: string, uid: number, device: number, cutoff: number): boolean {
  const st = lstatSync(path);
  if (st.uid !== uid || st.dev !== device || st.mtimeMs >= cutoff || st.isSymbolicLink()) return false;
  if (st.isFile()) return true;
  if (!st.isDirectory()) return false;
  const names = readdirSync(path);
  return !names.includes(".git") && names.every(name => removableTree(join(path, name), uid, device, cutoff));
}

export function cleanRustWorkingSessions(target: string, dryRun: boolean): { removed: number; locked: number } {
  if (realpathSync(target) !== resolve(target) || !cargoTarget(target)) throw new Error(`Refusing non-Cargo target: ${target}`);
  const uid = process.getuid!();
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  let removed = 0, locked = 0;
  // Cargo uses target/profile or target/triple/profile, including custom profiles.
  const first = directories(target);
  const profiles = [...first, ...first.flatMap(path => directories(path))];
  for (const profile of profiles) {
    const incremental = join(profile, "incremental");
    let crates: string[];
    try {
      if (!lstatSync(incremental).isDirectory()) continue;
      crates = directories(incremental);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
    for (const crate of crates) for (const name of readdirSync(crate)) {
      if (!sessionName.test(name)) continue;
      const path = join(crate, name);
      const before = lstatSync(path);
      if (!before.isDirectory() || before.uid !== uid || before.mtimeMs >= cutoff) continue;
      const lockPath = join(crate, `${name.slice(0, -"-working".length)}.lock`);
      const mountInfo = readFileSync("/proc/self/mountinfo", "utf8");
      if (intersectsMounts(target, path, mountInfo) || intersectsMounts(target, lockPath, mountInfo)) continue;
      let fd: number;
      try { fd = openSync(lockPath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK); }
      catch (error) {
        if (["ENOENT", "ELOOP", "EACCES"].includes((error as NodeJS.ErrnoException).code ?? "")) continue;
        throw error;
      }
      try {
        const lock = fstatSync(fd);
        if (!lock.isFile() || lock.uid !== uid || lock.dev !== before.dev) continue;
        // flock locks the inherited open-file description. The parent keeps it
        // locked after the child exits, until closeSync in finally below.
        const result = spawnSync("flock", ["--exclusive", "--nonblock", "3"], { stdio: ["ignore", "pipe", "pipe", fd] });
        if (result.error || result.status !== 0) { locked++; continue; }
        const current = lstatSync(path), currentLock = lstatSync(lockPath);
        if (current.ino !== before.ino || current.dev !== before.dev || currentLock.ino !== lock.ino || currentLock.dev !== lock.dev) continue;
        if (!removableTree(path, uid, before.dev, cutoff)) continue;
        const latestMountInfo = readFileSync("/proc/self/mountinfo", "utf8");
        if (intersectsMounts(target, path, latestMountInfo) || intersectsMounts(target, lockPath, latestMountInfo)) continue;
        if (!dryRun) rmSync(path, { recursive: true });
        console.log(`${dryRun ? "Would remove" : "Removed"} abandoned Rust session: ${path}`);
        removed++;
      } finally { closeSync(fd); }
    }
  }
  return { removed, locked };
}
