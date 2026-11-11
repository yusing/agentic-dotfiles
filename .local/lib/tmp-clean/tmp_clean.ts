import { lstatSync, readdirSync, readFileSync, readlinkSync, rmSync, statfsSync } from "node:fs";
import { join } from "node:path";

const VERSION = "1.0.2";
const recognized = /^(go-build\d+|gopls-tempmod\d+|mekugi-tools-\d+-[a-f0-9]+|mekugi-native-trace-\d+|mekugi-proxy-tests-\d+|mekugi-exec-test-\d+|mekugi-test-state-\d+|TestNativeExecResultFinalizesAfterReplayProxyReconstruction\d+|mekugi-host-perf\.[A-Za-z0-9]+|mekugi-sustained(?:-(?:before|after))?\.[A-Za-z0-9]+|agent-tools-(?:published-runtime|login-fixture)\.[A-Za-z0-9]+|sidebar-baseline-[A-Za-z0-9]+)$/;

export function cleanupUid(): number {
  const uid = process.getuid!();
  const sudoUid = process.env.SUDO_UID;
  if (uid !== 0 || sudoUid === undefined) return uid;
  const invokingUid = Number(sudoUid);
  if (!/^\d+$/.test(sudoUid) || !Number.isSafeInteger(invokingUid)) {
    throw new Error("Invalid SUDO_UID; temporary cleanup refused.");
  }
  return invokingUid;
}

export function intersectsMounts(target: string, path: string, mountInfo: string, includeTarget = true): boolean {
  return mountInfo.trim().split("\n").some(line => {
    const field = line.split(" ")[4];
    if (!field) throw new Error("Invalid Linux mount information; cleanup refused.");
    const mount = field.replace(/\\([0-7]{3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)));
    return ((includeTarget && mount === target) || mount.startsWith(`${target}/`))
      && (mount === path || mount.startsWith(`${path}/`) || path.startsWith(`${mount}/`));
  });
}

function vanished(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT" || (error as NodeJS.ErrnoException).code === "ESRCH";
}

export function processReferences(): string[] {
  const refs: string[] = [];
  const uid = cleanupUid();
  let inaccessible = 0;
  for (const pid of readdirSync("/proc").filter(p => /^\d+$/.test(p))) {
    const base = join("/proc", pid);
    try {
      if (process.getuid!() !== 0 && lstatSync(base).uid !== uid) continue;
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
  if (inaccessible) throw new Error(`${inaccessible} processes could not be inspected; temporary cleanup refused.`);
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
  const uid = cleanupUid();
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  let count = 0, bytes = 0, failures = 0;
  const initial = dryRun ? null : statfsSync(root);
  const before = initial ? initial.bfree * initial.bsize : 0;
  for (const name of readdirSync(root)) {
    if (!recognized.test(name)) continue;
    const path = join(root, name);
    try {
      const stat = lstatSync(path);
      if (!stat.isDirectory() || stat.uid !== uid || refs.some(ref => ref.includes(path))) continue;
      // The cleanup root may itself be a mounted filesystem; child mounts may not.
      if (intersectsMounts(root, path, readFileSync("/proc/self/mountinfo", "utf8"), false)) continue;
      const size = inspect(path, uid, cutoff, stat.dev);
      if (size === null) continue;
      if (intersectsMounts(root, path, readFileSync("/proc/self/mountinfo", "utf8"), false)) continue;
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
  if (!dryRun) {
    const after = statfsSync(root);
    bytes = after.bfree * after.bsize - before;
  }
  return { count, bytes, failures };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--version") console.log(VERSION);
  else if (args.length === 1 && args[0] === "--help") {
    console.log("tmp_clean [--dry-run]\nPermanently remove owned, recognized generated /tmp and /var/tmp directories untouched for two hours.\nPreserves referenced process paths and repositories; refuses incomplete process inspection.\nUnder sudo, inspects all processes and cleans only fixtures belonging to SUDO_UID, not root.\nLinux only; stop build/test jobs first.");
  } else if (args.length > 1 || (args.length === 1 && args[0] !== "--dry-run")) {
    console.error("Usage: tmp_clean [--dry-run]");
    process.exitCode = 2;
  } else {
    try {
      if (process.platform !== "linux") throw new Error("tmp_clean requires Linux /proc; nothing removed");
      const refs = processReferences();
      const dryRun = args.includes("--dry-run");
      for (const root of ["/tmp", "/var/tmp"]) {
        const result = clean(root, refs, dryRun);
        console.log(`${root}: ${dryRun ? "Eligible" : "Removed"}: ${result.count} directories, ${(result.bytes / 1024 ** 3).toFixed(2)} GiB${dryRun ? " estimated" : " freed (net mount change)"}; ${result.failures} failures.`);
        if (result.failures) process.exitCode = 1;
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
