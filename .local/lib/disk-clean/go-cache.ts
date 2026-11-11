import { spawnSync } from "node:child_process";
import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync, readSync, readdirSync, realpathSync, unlinkSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { intersectsMounts } from "../tmp-clean/tmp_clean";

function release(version: string): number[] {
  const match = /^go([1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version);
  if (!match) throw new Error("Expected an exact stable Go release, such as go1.27.3.");
  const parts = match.slice(1).map(Number);
  if (!parts.every(Number.isSafeInteger)) throw new Error("Invalid Go release.");
  return parts;
}

export function retiredGoCache(version: string): string {
  const retired = release(version);
  if (process.platform !== "linux") throw new Error("Retired Go cleanup requires Linux mount inspection.");
  // This exact Go subcommand bypasses automatic toolchain switching, while
  // still reporting environment/go.env pins that normal builds would select.
  const selection = spawnSync("go", ["env", "GOTOOLCHAIN"], { encoding: "utf8" });
  if (selection.error || selection.status !== 0) throw new Error("Cannot inspect Go toolchain selection.");
  const toolchain = selection.stdout.trim();
  if (toolchain.split("+")[0] === version) {
    throw new Error(`Refusing to retire ${version}: selected by GOTOOLCHAIN=${toolchain}.`);
  }
  // Do not download a toolchain or build anything merely to inspect the cache.
  const result = spawnSync("go", ["env", "-json", "GOCACHE", "GOCACHEPROG", "GOVERSION"], {
    env: { ...process.env, GOTOOLCHAIN: "local" }, encoding: "utf8",
  });
  if (result.error || result.status !== 0) throw new Error(`Cannot inspect Go cache: ${result.error?.message ?? result.stderr.trim()}`);
  const config = JSON.parse(result.stdout);
  if (typeof config.GOCACHE !== "string" || !isAbsolute(config.GOCACHE)
    || typeof config.GOVERSION !== "string" || config.GOCACHEPROG !== "") {
    throw new Error("Retired Go cleanup requires Go's normal on-disk cache.");
  }
  const current = release(config.GOVERSION);
  const difference = retired.findIndex((part, i) => part !== current[i]);
  if (difference < 0 || retired[difference] >= current[difference]) {
    throw new Error(`Refusing to retire ${version}: it must be older than current ${config.GOVERSION}.`);
  }
  return config.GOCACHE;
}

function retiredArchive(fd: number, size: number, version: string): boolean {
  const head = Buffer.alloc(1024);
  const length = readSync(fd, head, 0, head.length, 0);
  if (head.subarray(0, 8).toString() !== "!<arch>\n"
    || head.subarray(8, 24).toString().trim() !== "__.PKGDEF") return false;
  const end = head.indexOf(10, 68);
  if (end < 68 || end >= length) return false;
  const header = /^go object [a-z0-9_]+ [a-z0-9_]+ (go\d+\.\d+\.\d+)(?: [^\r\n]*)?$/.exec(head.subarray(68, end).toString());
  if (header?.[1] !== version) return false;
  // Validate every ar member boundary without reading the potentially huge bodies.
  const member = Buffer.alloc(60);
  let offset = 8, members = 0;
  while (offset < size) {
    if (readSync(fd, member, 0, 60, offset) !== 60 || member.subarray(58).toString() !== "`\n") return false;
    const field = member.subarray(48, 58).toString().trim();
    if (!/^\d+$/.test(field)) return false;
    const bytes = Number(field);
    if (!Number.isSafeInteger(bytes) || (members === 0 && bytes <= end - 68)) return false;
    offset += 60 + bytes + bytes % 2;
    if (offset > size) return false;
    members++;
  }
  return offset === size && members >= 2;
}

export function cleanRetiredGoArchives(cache: string, version: string, dryRun: boolean): { count: number; bytes: number } {
  release(version);
  const uid = process.getuid!();
  const root = lstatSync(cache);
  if (!root.isDirectory() || root.uid !== uid || realpathSync(cache) !== resolve(cache)) {
    throw new Error(`Refusing unsafe Go cache: ${cache}`);
  }
  let count = 0, bytes = 0;
  for (const shard of readdirSync(cache, { withFileTypes: true })) {
    if (!shard.isDirectory() || !/^[0-9a-f]{2}$/.test(shard.name)) continue;
    const directory = join(cache, shard.name), stat = lstatSync(directory);
    if (!stat.isDirectory() || stat.uid !== uid || stat.dev !== root.dev || realpathSync(directory) !== resolve(directory)) continue;
    // A mounted child blocks its whole shard, including same-device bind mounts.
    if (intersectsMounts(cache, directory, readFileSync("/proc/self/mountinfo", "utf8"), false)) continue;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isFile() || !/^[0-9a-f]{64}-d$/.test(entry.name) || !entry.name.startsWith(shard.name)) continue;
      const path = join(directory, entry.name);
      let fd: number | undefined;
      try {
        fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        const before = fstatSync(fd);
        if (!before.isFile() || before.uid !== uid || before.dev !== root.dev || !retiredArchive(fd, before.size, version)) continue;
        const current = lstatSync(path);
        if (current.ino !== before.ino || current.dev !== before.dev || current.size !== before.size
          || current.mtimeMs !== before.mtimeMs || current.ctimeMs !== before.ctimeMs) continue;
        if (!dryRun) unlinkSync(path);
        count++;
        bytes += before.blocks * 512;
      } catch (error) {
        if (!["ENOENT", "ESTALE", "ELOOP", "EACCES"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error;
      } finally { if (fd !== undefined) closeSync(fd); }
    }
  }
  return { count, bytes };
}
