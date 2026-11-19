import { spawnSync } from "node:child_process";
import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync, readdirSync, realpathSync, rmSync, statfsSync } from "node:fs";
import { join, resolve } from "node:path";
import { intersectsMounts } from "../cleanup-safety";

const signature = "Signature: 8a477f597d28d172789f06886806bc55";
const sessionName = /^s-[a-z0-9]+-[a-z0-9]+-working$/;
const profileLocks = [".cargo-lock", ".cargo-build-lock", ".cargo-artifact-lock"];

function hasCacheTag(path: string): boolean {
  const tag = join(path, "CACHEDIR.TAG");
  return lstatSync(tag, { throwIfNoEntry: false })?.isFile() === true
    && readFileSync(tag, "utf8").startsWith(signature);
}

function cargoTarget(path: string): boolean {
  try {
    return lstatSync(join(path, ".rustc_info.json")).isFile()
      && hasCacheTag(path);
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

function removableTree(path: string, uid: number, device: number, cutoff?: number): boolean {
  const st = lstatSync(path);
  if (st.uid !== uid || st.dev !== device || (cutoff !== undefined && st.mtimeMs >= cutoff)) return false;
  if (st.isFile()) return true;
  if (!st.isDirectory()) return false;
  const names = readdirSync(path);
  return names.every(name => name !== ".git" && name !== "CACHEDIR.TAG" && !profileLocks.includes(name)
    && removableTree(join(path, name), uid, device, cutoff));
}

function lockFile(path: string, uid: number, device: number): number | undefined {
  let fd: number;
  try { fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK); }
  catch (error) {
    if (["ENOENT", "ELOOP", "EACCES"].includes((error as NodeJS.ErrnoException).code ?? "")) return;
    throw error;
  }
  let held = false;
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.uid !== uid || stat.dev !== device) return;
    // The child locks the inherited open-file description; we keep it open.
    const result = spawnSync("flock", ["--exclusive", "--nonblock", "3"], { stdio: ["ignore", "pipe", "pipe", fd] });
    if (result.error || result.status !== 0) return;
    const current = lstatSync(path);
    if (current.ino !== stat.ino || current.dev !== stat.dev) return;
    held = true;
    return fd;
  } finally { if (!held) closeSync(fd); }
}

export function sweepLegacyCargoTarget(target: string, dryRun: boolean): void {
  const root = lstatSync(target, { throwIfNoEntry: false });
  if (!root) return;
  const uid = process.getuid!(), device = root.dev;
  const mounted = () => intersectsMounts(target, target, readFileSync("/proc/self/mountinfo", "utf8"));
  const skip = (reason: string) => console.log(`Skipped legacy Cargo target ${target}: ${reason}.`);
  if (!root.isDirectory() || root.uid !== uid || realpathSync(target) !== resolve(target)
    || !hasCacheTag(target) || mounted() || statfsSync(target).type === 0x6969) {
    return skip("not a safely identified local Cargo target");
  }
  const hash = /-([0-9a-f]{16})(?:\..*)?$/;
  const first = directories(target);
  for (const profile of [...first, ...first.flatMap(directories)]) {
    const fingerprint = join(profile, ".fingerprint");
    if (!lstatSync(fingerprint, { throwIfNoEntry: false })) continue;
    const locks: number[] = [];
    try {
      const names = readdirSync(profile);
      const buckets = [".fingerprint", "build", "deps", "native", "examples"]
        .filter(name => names.includes(name)).map(name => join(profile, name));
      if (realpathSync(profile) !== profile || [profile, ...buckets].some(path => {
        const stat = lstatSync(path);
        return !stat.isDirectory() || stat.uid !== uid || stat.dev !== device;
      })) {
        skip(`unsafe layout in ${profile}`);
        continue;
      }
      const requiredLocks = profileLocks.filter(name => name === ".cargo-lock" || names.includes(name));
      for (const name of requiredLocks) {
        const fd = lockFile(join(profile, name), uid, device);
        if (fd === undefined) break;
        locks.push(fd);
      }
      if (locks.length !== requiredLocks.length) {
        skip(`busy or indeterminate locks in ${profile}`);
        continue;
      }
      // A Cargo fingerprint identifies the group. The retired path is no
      // longer used by default, so only lock availability and safety matter.
      const groups = new Map<string, string[]>();
      for (const entry of readdirSync(fingerprint, { withFileTypes: true })) {
        const key = /^[\w-]+-([0-9a-f]{16})$/.exec(entry.name)?.[1];
        if (key && entry.isDirectory()) {
          const path = join(fingerprint, entry.name);
          if (!lstatSync(join(path, "invoked.timestamp"), { throwIfNoEntry: false })?.isFile()) continue;
          const group = groups.get(key);
          if (group) group.push(path);
          else groups.set(key, [path]);
        }
      }
      for (const bucket of [profile, ...buckets.filter(path => path !== fingerprint)]) {
        const allowsDirectories = bucket === join(profile, "build") || bucket === join(profile, "native");
        for (const entry of readdirSync(bucket, { withFileTypes: true })) {
          const key = hash.exec(entry.name)?.[1];
          if (!key) continue;
          if (entry.isDirectory() && !allowsDirectories) groups.delete(key);
          else groups.get(key)?.push(join(bucket, entry.name));
        }
      }
      const eligible = [...groups.values()].filter(group => group.every(path => removableTree(path, uid, device)));
      if (mounted()) return skip("mount layout changed");
      for (const group of eligible) {
        // Keep the fingerprint if an artifact removal fails.
        for (const path of group.toReversed()) {
          if (!dryRun) rmSync(path, { recursive: true });
          console.log(`${dryRun ? "Would remove" : "Removed"}: ${path}`);
        }
      }
    } finally { for (const fd of locks) closeSync(fd); }
  }
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
      const fd = lockFile(lockPath, uid, before.dev);
      if (fd === undefined) { locked++; continue; }
      try {
        const lock = fstatSync(fd);
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
