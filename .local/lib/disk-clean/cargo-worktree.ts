import { spawnSync } from "node:child_process";
import { closeSync, constants, copyFileSync, lstatSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, realpathSync, utimesSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { cargoTarget, targetKey, ownerFile, targetFlock } from "./rust-cache";

const VERSION = "1.0.2";

function directories(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => join(path, entry.name));
}

// Copy only finished library units whose source stays in the same place across
// checkouts. Cargo rechecks features, compiler flags and transitive dependencies.
function seedProfile(source: string, dest: string, cargoHome: string): void {
  const fingerprints = join(source, ".fingerprint");
  if (!lstatSync(fingerprints, { throwIfNoEntry: false })?.isDirectory()) return;
  for (const group of directories(fingerprints)) {
    const hash = /-([a-f0-9]{16})$/.exec(group)?.[1];
    if (!hash) continue;
    try {
      const unit = readdirSync(group).find(name => /^lib-[\w-]+$/.test(name));
      if (!unit) continue;
      const marker = join(group, unit);
      const before = lstatSync(marker, { bigint: true });
      if (!before.isFile() || before.size === 0n) continue; // Cargo truncates this before rebuilding.
      const stem = unit.slice(4) + "-" + hash;
      const deps = join(source, "deps"), output = join(dest, "deps");
      // Proc macros can read checkout-relative files without reporting them to
      // Cargo. Rebuild these host libraries so Cargo rebuilds their consumers.
      if (["so", "dylib"].some(ext => lstatSync(join(deps, "lib" + stem + "." + ext), { throwIfNoEntry: false }))) continue;
      const depInfo = join(deps, stem + ".d");
      const fd = openSync(depInfo, constants.O_RDONLY | constants.O_NOFOLLOW);
      const prefix = Buffer.alloc(8192);
      let line: string;
      try { line = prefix.toString("utf8", 0, readSync(fd, prefix)); }
      finally { closeSync(fd); }
      const inputs = line.slice(line.indexOf(": ") + 2);
      if (!["registry/src", "git/checkouts"].some(path => inputs.startsWith(join(cargoHome, path).replaceAll(" ", "\\ ") + "/"))) continue;

      const fingerprint = join(dest, ".fingerprint", basename(group));
      mkdirSync(output, { recursive: true });
      mkdirSync(fingerprint, { recursive: true });
      function copy(path: string, to: string): void {
        const st = lstatSync(path);
        if (!st.isFile()) throw new Error("Not a regular Cargo artifact: " + path);
        const file = join(to, basename(path));
        copyFileSync(path, file, constants.COPYFILE_FICLONE);
        utimesSync(file, st.atimeMs / 1000, st.mtimeMs / 1000);
      }
      for (const ext of ["rlib", "rmeta"]) {
        const path = join(deps, "lib" + stem + "." + ext);
        if (lstatSync(path, { throwIfNoEntry: false })?.isFile()) copy(path, output);
      }
      copy(depInfo, output);
      for (const name of ["dep-" + unit, unit + ".json", "invoked.timestamp"]) copy(join(group, name), fingerprint);
      // Never publish a fingerprint for a unit modified during the copy.
      const contents = readFileSync(marker);
      const after = lstatSync(marker, { bigint: true });
      if (before.ino === after.ino && before.ctimeNs === after.ctimeNs && contents.length)
        writeFileSync(join(fingerprint, unit), contents);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}

function prepare(manifest: string, target: string): void {
  if (realpathSync(target) !== target || lstatSync(target).uid !== process.getuid!())
    throw new Error("Refusing unsafe worktree target: " + target);
  const owner = join(target, ownerFile);
  if (!lstatSync(owner, { throwIfNoEntry: false })) {
    const cwd = dirname(manifest);
    const git = (...args: string[]) => spawnSync("git", args, { cwd, encoding: "utf8" });
    const root = git("rev-parse", "--show-toplevel");
    if (root.status !== 0) return;
    const worktree = root.stdout.replace(/\n$/, "");
    const list = git("worktree", "list", "--porcelain", "-z");
    if (list.status !== 0 || !list.stdout.startsWith("worktree ")) return;
    const [first, type] = list.stdout.split("\0", 2);
    if (first.slice(9) === worktree) return;
    // For an absorbed submodule Git lists its administration directory, not
    // the checkout containing the workspace manifest.
    const primary = type === "bare" ? undefined : git("-C", first.slice(9), "rev-parse", "--show-toplevel");
    if (primary && primary.status !== 0) return;
    const primaryRoot = primary?.stdout.replace(/\n$/, "");
    if (primaryRoot === worktree) return;
    if (!targetFlock(9, 2)) throw new Error("Cannot initialize worktree cache");
    if (!lstatSync(owner, { throwIfNoEntry: false })) {
      const empty = readdirSync(target).length === 0;
      // Upgrade an old default target only when Cargo identifies it as one.
      if (!empty && !cargoTarget(target)) return;
      if (primaryRoot && empty) {
        const mainManifest = join(primaryRoot, relative(worktree, manifest));
        const managed = join(dirname(target), targetKey(mainManifest));
        const source = lstatSync(managed, { throwIfNoEntry: false })?.isDirectory() ? managed : join(dirname(mainManifest), "target");
        try {
          const cargoHome = resolve(process.env.CARGO_HOME || join(homedir(), ".cargo"));
          for (const first of lstatSync(source, { throwIfNoEntry: false })?.isDirectory() ? directories(source) : []) {
            if (lstatSync(join(first, ".fingerprint"), { throwIfNoEntry: false })) seedProfile(first, join(target, basename(first)), cargoHome);
            else for (const profile of directories(first)) seedProfile(profile, join(target, relative(source, profile)), cargoHome);
          }
        } catch (error) { console.error("cargo: skipped remaining cache seed:", (error as Error).message); }
      }
      writeFileSync(owner, JSON.stringify({ worktree, manifest }), { flag: "wx" });
    }
  }
  // fd 9 belongs to the calling shell and remains open across exec of Cargo.
  if (!targetFlock(9, 1)) throw new Error("Cannot pin worktree cache");
}

if (process.argv[2] === "--version") console.log(VERSION);
else {
  const manifest = process.argv[2];
  const target = join(homedir(), ".cache/rust/targets", targetKey(manifest));
  prepare(manifest, target);
  console.log("build.target-dir=" + JSON.stringify(target).replaceAll("\x7f", "\\u007f"));
}
