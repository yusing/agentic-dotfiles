import { lstatSync, readdirSync, readFileSync, readlinkSync, rmSync } from "node:fs";
import { join } from "node:path";

const VERSION = "1.0.0";
const recognized = /^(go-build\d+|gopls-tempmod\d+|mekugi-tools-\d+-[a-f0-9]+|mekugi-native-trace-\d+|mekugi-proxy-tests-\d+|mekugi-exec-test-\d+|mekugi-test-state-\d+|TestNativeExecResultFinalizesAfterReplayProxyReconstruction\d+)$/;

function vanished(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT" || (error as NodeJS.ErrnoException).code === "ESRCH";
}

export function processReferences(): string[] {
  const refs: string[] = [];
  let inaccessible = 0;
  for (const pid of readdirSync("/proc").filter(p => /^\d+$/.test(p))) {
    const base = join("/proc", pid);
    try {
      if (lstatSync(base).uid !== process.getuid!()) continue;
      for (const file of ["cwd", "exe", ...readdirSync(join(base, "fd")).map(fd => `fd/${fd}`)]) {
        try { refs.push(readlinkSync(join(base, file))); }
        catch (error) { if (!vanished(error)) throw error; }
      }
      for (const file of ["cmdline", "environ", "maps"]) {
        try { refs.push(readFileSync(join(base, file), "utf8")); }
        catch (error) { if (!vanished(error)) throw error; }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EACCES" || (error as NodeJS.ErrnoException).code === "EPERM") inaccessible++;
      else if (!vanished(error)) throw error;
    }
  }
  if (inaccessible) console.error(`Warning: ${inaccessible} same-user processes could not be inspected; their references may be missed.`);
  return refs;
}

function inspect(path: string, uid: number, cutoff: number, device: number): number | null {
  const stat = lstatSync(path);
  if (stat.uid !== uid || stat.mtimeMs >= cutoff || stat.dev !== device) return null;
  let bytes = stat.blocks * 512;
  if (!stat.isDirectory()) return bytes;
  const names = readdirSync(path);
  if (names.includes(".git") || ["HEAD", "objects", "refs"].every(name => names.includes(name))) return null;
  for (const name of names) {
    const child = inspect(join(path, name), uid, cutoff, device);
    if (child === null) return null;
    bytes += child;
  }
  return bytes;
}

export function clean(root: string, refs: string[], dryRun: boolean): { count: number; bytes: number; failures: number } {
  const uid = process.getuid!();
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  let count = 0, bytes = 0, failures = 0;
  for (const name of readdirSync(root)) {
    if (!recognized.test(name)) continue;
    const path = join(root, name);
    try {
      const stat = lstatSync(path);
      if (!stat.isDirectory() || stat.uid !== uid || refs.some(ref => ref.includes(path))) continue;
      const size = inspect(path, uid, cutoff, stat.dev);
      if (size === null) continue;
      if (!dryRun) rmSync(path, { recursive: true });
      console.log(`${dryRun ? "Would remove" : "Removed"}: ${path}`);
      count++;
      bytes += size;
    } catch (error) {
      if (vanished(error)) continue;
      failures++;
      console.error(`Could not clean ${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { count, bytes, failures };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--version") console.log(VERSION);
  else if (args.length === 1 && args[0] === "--help") {
    console.log("tmp_clean [--dry-run]\nPermanently remove owned, recognized generated /tmp directories untouched for two hours.\nPreserves referenced process paths and repositories. Linux only; stop build jobs first.");
  } else if (args.length > 1 || (args.length === 1 && args[0] !== "--dry-run")) {
    console.error("Usage: tmp_clean [--dry-run]");
    process.exitCode = 2;
  } else {
    try {
      if (process.platform !== "linux") throw new Error("tmp_clean requires Linux /proc; nothing removed");
      const refs = processReferences();
      const dryRun = args.includes("--dry-run");
      const result = clean("/tmp", refs, dryRun);
      console.log(`${dryRun ? "Eligible" : "Removed"}: ${result.count} directories, ${(result.bytes / 1024 ** 3).toFixed(2)} GiB${dryRun ? "" : " freed"}; ${result.failures} failures.`);
      if (result.failures) process.exitCode = 1;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
