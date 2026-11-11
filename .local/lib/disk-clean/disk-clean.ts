import { spawnSync } from "node:child_process";
import { statfsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { cleanRustWorkingSessions, discoverRustTargets } from "./rust-cache";
import { cleanRetiredGoArchives, retiredGoCache } from "./go-cache";

const VERSION = "1.0.0";
const help = `disk-clean [--dry-run] [--retired-go goX.Y.Z]
Remove obsolete tool versions, garbage-collect npm's cache, and clean recognized
inactive temporary fixtures and abandoned Rust working sessions.
--dry-run previews without changing caches or tools.
--retired-go runs only Go archive cleanup for that older compiler release.
Use only after retiring that release; keep its builds and cache consumers stopped.
Current-toolchain archives, opaque Go data, indexes and executables stay intact.
Otherwise retains finalized build caches, Cargo/Go dependencies, Docker storage,
session history, and recovery data. Age alone cannot identify obsolete revisions.
Mise protects tracked configurations and running tools, not ad-hoc future pins.
Temporary cleanup requires Linux process inspection; stop build/test jobs first.`;

function availableBytes(): bigint {
  const fs = statfsSync(homedir(), { bigint: true });
  return fs.bavail * fs.bsize;
}

function gib(bytes: bigint): string {
  return `${(Number(bytes) / 1024 ** 3).toFixed(2)} GiB`;
}

function main(): number {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--version") {
    console.log(VERSION);
    return 0;
  }
  if (args.length === 1 && args[0] === "--help") {
    console.log(help);
    return 0;
  }
  let dryRun = false, retiredGo: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run" && !dryRun) dryRun = true;
    else if (args[i] === "--retired-go" && !retiredGo && /^go\d+\.\d+\.\d+$/.test(args[i + 1] ?? "")) retiredGo = args[++i];
    else { console.error(help); return 2; }
  }
  // Resolve and reject an invalid retirement before any cleanup step mutates state.
  const goCache = retiredGo ? retiredGoCache(retiredGo) : undefined;
  const before = availableBytes();
  let failures = 0;
  function finish(): number {
    const after = availableBytes();
    console.log(`\nAvailable: ${gib(before)} -> ${gib(after)}; net change ${gib(after - before)}${dryRun ? " (preview only)" : " (includes concurrent filesystem activity)"}; ${failures} failed steps.`);
    return failures ? 1 : 0;
  }
  function run(command: string, commandArgs: string[]): void {
    if (!Bun.which(command)) {
      console.log(`Skipped unavailable tool: ${command}`);
      if (command === "tmp_clean") failures++;
      return;
    }
    console.log(`\n${dryRun ? "Preview" : "Running"}: ${command} ${commandArgs.join(" ")}`);
    const result = spawnSync(command, commandArgs, { stdio: "inherit" });
    if (result.error || result.status !== 0) {
      failures++;
      console.error(`Failed: ${command}: ${result.error?.message ?? result.signal ?? `exit ${result.status}`}`);
    }
  }
  console.log("Preserving active build caches, downloaded build dependencies, Docker storage, sessions, and recovery data.");
  if (retiredGo && goCache) {
    try {
      const result = cleanRetiredGoArchives(goCache, retiredGo, dryRun);
      console.log(`Go cache ${goCache}: ${result.count} ${retiredGo} archives ${dryRun ? "eligible" : "removed"}, ${gib(BigInt(result.bytes))} allocated; other entries retained.`);
    } catch (error) {
      failures++;
      console.error(`Go cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return finish();
  }
  run("mise", ["prune", "--tools", dryRun ? "--dry-run" : "--yes"]);
  if (dryRun) console.log("Would run: npm cache verify (no cache purge)");
  else run("npm", ["cache", "verify"]);
  if (process.platform === "linux") {
    try {
      for (const target of discoverRustTargets(join(homedir(), "projects"))) {
        const result = cleanRustWorkingSessions(target, dryRun);
        console.log(`Rust target ${target}: ${result.removed} abandoned sessions ${dryRun ? "eligible" : "removed"}, ${result.locked} locked/indeterminate sessions retained.`);
      }
    } catch (error) {
      failures++;
      console.error(`Rust cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (process.platform === "linux") run("tmp_clean", dryRun ? ["--dry-run"] : []);
  else console.log("Skipped temporary cleanup: Linux process inspection is required.");
  return finish();
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) {
    console.error(`disk-clean: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
