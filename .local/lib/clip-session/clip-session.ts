import { execFile } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { serveClipboard, pullClipboard } from "./clipboard";
import { interactive } from "./terminal";

const VERSION = "1.1.0";
const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
const cancellation = new AbortController();
for (const signal of ["SIGTERM", "SIGHUP"] as const) {
  process.on(signal, () => cancellation.abort());
}
process.on("SIGINT", () => {});

async function pull(socket: string): Promise<void> {
  if (!/^\/tmp\/clip-paste-[a-f0-9]{32}\.sock$/.test(socket)) throw new Error("invalid paste socket");
  try {
    const data = await pullClipboard(socket);
    if (!data) return;
    // Never overwrite or retarget an earlier paste. The consumer may read it
    // after another client pastes, or submit it after this connection closes.
    const directory = mkdtempSync("/tmp/clip-image-");
    const path = join(directory, "image.png");
    try { writeFileSync(path, data, { mode: 0o600, flag: "wx" }); }
    catch (error) { rmSync(directory, { recursive: true, force: true }); throw error; }
    console.log(path);
  } finally {
    try { unlinkSync(socket); } catch (error: any) { if (error.code !== "ENOENT") throw error; }
  }
}

async function connect(mode: string, host: string, command: string[]): Promise<number> {
  if (!host || host.startsWith("-")) throw new Error("use clip-session ssh|mosh [user@]host [command ...]; configure SSH options in ~/.ssh/config");
  const directory = mkdtempSync("/tmp/clip-session-");
  const localSocket = join(directory, "source");
  const server = await serveClipboard(localSocket);
  const paste = (signal: AbortSignal): Promise<string | null> => {
    const remoteSocket = `/tmp/clip-paste-${randomBytes(16).toString("hex")}.sock`;
    // A fresh connection for every paste cannot inherit a dead ControlMaster.
    // Mosh has no dependency on this auxiliary connection's lifetime.
    return new Promise((resolve, reject) => {
      execFile("ssh", ["-T", "-o", "ControlMaster=no", "-o", "ControlPath=none",
        "-o", "BatchMode=yes", "-o", "ConnectTimeout=5", "-o", "ConnectionAttempts=1",
        "-o", "ServerAliveInterval=2", "-o", "ServerAliveCountMax=2",
        "-o", "ExitOnForwardFailure=yes", "-R", `${remoteSocket}:${localSocket}`,
        host, [".local/bin/clip-session", "pull", remoteSocket].map(quote).join(" ")],
      { timeout: 15000, maxBuffer: 8192, signal }, (error, stdout, stderr) => {
        if (error) return reject(new Error(stderr.trim() || "image pull interrupted; paste again when connected"));
        const path = stdout.trim();
        if (!path) return resolve(null);
        if (!/^\/tmp\/clip-image-[A-Za-z0-9]+\/image\.png$/.test(path)) return reject(new Error("invalid image-paste response; update clip-session on both computers"));
        resolve(path);
      });
    });
  };
  try {
    const args = mode === "ssh"
      ? ["ssh", "-tt", host, ...(command.length ? [command.map(quote).join(" ")] : [])]
      : ["mosh", "--", host, ...command];
    return await interactive(args, paste, cancellation.signal);
  } finally {
    server.closeAllConnections(); server.close();
    rmSync(directory, { recursive: true, force: true });
  }
}

const [mode, target, ...command] = process.argv.slice(2);
try {
  if (mode === "--version") console.log(VERSION);
  else if (mode === "--help" || !mode) console.log("Usage: clip-session ssh|mosh [user@]host [command ...]\nCtrl+V pulls this computer's image over a fresh SSH connection into the remote application's image attachment. Install on both ends.");
  else if (mode === "pull" && target) await pull(target);
  else if (mode === "ssh" || mode === "mosh") process.exitCode = await connect(mode, target, command);
  else throw new Error("unknown mode; use --help");
} catch (error) {
  console.error(`clip-session: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
