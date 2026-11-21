import { lstatSync, readdirSync, readFileSync, readlinkSync, rmSync, statfsSync } from "node:fs";
import { join } from "node:path";

import { intersectsMounts } from "../cleanup-safety";

const VERSION = "1.0.4";
const recognized = /^(go-build\d+|gopls-tempmod\d+|mekugi-tools-\d+-[a-f0-9]+|mekugi-native-trace-\d+|mekugi-proxy-tests-\d+|mekugi-exec-test-\d+|mekugi-test-state-\d+|mekugi-session-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|mekugi-(?:prefork|sol|gap|workflow|sccache|uninstall-checks|frozen-checks)[A-Za-z0-9._-]+|TestNativeExecResultFinalizesAfterReplayProxyReconstruction\d+|mekugi-host-perf\.[A-Za-z0-9]+|mekugi-sustained(?:-(?:before|after))?\.[A-Za-z0-9]+|agent-tools-(?:published-runtime|login-fixture)\.[A-Za-z0-9]+|sidebar-baseline-[A-Za-z0-9]+|task-run-[A-Za-z0-9]+|codex-ab-[A-Za-z0-9._-]+|opus-ab-[A-Za-z0-9._-]+)$/;

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

function vanished(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT" || (error as NodeJS.ErrnoException).code === "ESRCH";
}

function procInfo(base: string): { state: string; ppid: number } | null {
  const stat = readFileSync(join(base, "stat"), "utf8");
  const end = stat.lastIndexOf(")");
  if (end < 0) return null;
  const fields = stat.slice(end + 2).split(" ");
  const ppid = Number(fields[1]);
  return fields[0] && Number.isSafeInteger(ppid) ? { state: fields[0], ppid } : null;
}

function isUserSystemd(pid: number): boolean {
  const base = join("/proc", String(pid));
  if (procInfo(base)?.ppid !== 1) return false;
  if (readFileSync(join(base, "comm"), "utf8").trim() !== "systemd") return false;
  const cmd = readFileSync(join(base, "cmdline"), "utf8");
  return cmd.startsWith("/usr/lib/systemd/systemd\0--user") || cmd.startsWith("/lib/systemd/systemd\0--user");
}

function isIgnorableInaccessible(pid: number, base: string, cmdline: string): boolean {
  try {
    const info = procInfo(base);
    if (!info) return false;
    if (info.state === "Z" || info.state === "X") return true;
    const comm = readFileSync(join(base, "comm"), "utf8").trim();
    if (isUserSystemd(pid)) return true;
    if (comm === "(sd-pam)" && cmdline === "(sd-pam)\0" && isUserSystemd(info.ppid)) return true;
    const argv0 = cmdline.split("\0", 1)[0];
    if (comm === "ssh-agent" && (argv0 === "ssh-agent" || argv0.endsWith("/ssh-agent")) && (info.ppid === 1 || isUserSystemd(info.ppid))) return true;
    if ((comm === "sshd-session" || comm === "sshd")
      && (cmdline.startsWith("sshd-session:") || cmdline.startsWith("sshd:"))
      && lstatSync(join("/proc", String(info.ppid))).uid === 0) return true;
    return false;
  } catch (error) {
    if (vanished(error)) return true;
    return false;
  }
}

export function processReferences(): string[] {
  const refs: string[] = [];
  const uid = cleanupUid();
  let inaccessible = 0;
  for (const pid of readdirSync("/proc").filter(p => /^\d+$/.test(p))) {
    const base = join("/proc", pid);
    let cmdline = "";
    try {
      if (process.getuid!() !== 0 && lstatSync(base).uid !== uid) continue;
      try {
        cmdline = readFileSync(join(base, "cmdline"), "utf8");
        refs.push(cmdline);
      } catch (error) { if (!vanished(error)) throw error; }
      for (const file of ["cwd", "exe", ...readdirSync(join(base, "fd")).map(fd => `fd/${fd}`)]) {
        try { refs.push(readlinkSync(join(base, file))); }
        catch (error) { if (!vanished(error)) throw error; }
      }
      for (const file of ["environ", "maps"]) {
        try { refs.push(readFileSync(join(base, file), "utf8")); }
        catch (error) { if (!vanished(error)) throw error; }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EACCES" || (error as NodeJS.ErrnoException).code === "EPERM") {
        if (!isIgnorableInaccessible(Number(pid), base, cmdline)) inaccessible++;
      } else if (!vanished(error)) throw error;
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
