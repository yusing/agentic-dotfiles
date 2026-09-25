import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { serveClipboard } from "./clipboard";
import { ownClipboard } from "./selection";

const VERSION = "1.0.0";
const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
const cancellation = new AbortController();
for (const signal of ["SIGTERM", "SIGHUP"] as const) {
  process.on(signal, () => cancellation.abort());
}

function run(command: string, args: string[], env = process.env): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env, signal: cancellation.signal });
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve(code ?? (signal ? 128 : 1)));
  });
}

function authority(display: string, cookie: Buffer): Buffer {
  const field = (data: Buffer) => {
    const size = Buffer.alloc(2); size.writeUInt16BE(data.length);
    return Buffer.concat([size, data]);
  };
  return Buffer.concat([Buffer.from([255, 255]), field(Buffer.alloc(0)),
    field(Buffer.from(display)), field(Buffer.from("MIT-MAGIC-COOKIE-1")), field(cookie)]);
}

async function remote(socket: string, command: string[]): Promise<number> {
  if (process.platform !== "linux") throw new Error("the remote clipboard requires Linux with Xvfb");
  const directory = mkdtempSync(join(tmpdir(), "clip-display-"));
  const auth = join(directory, "authority");
  const cookie = randomBytes(16);
  writeFileSync(auth, authority("", cookie), { mode: 0o600 });
  const xvfb = spawn("Xvfb", ["-displayfd", "1", "-nolisten", "tcp", "-screen", "0", "640x480x24", "-auth", auth],
    { stdio: ["ignore", "pipe", "pipe"] });
  let diagnostics = "";
  xvfb.stderr!.on("data", data => { diagnostics = (diagnostics + data).slice(-8192); });
  let closeClipboard: (() => void) | undefined;
  try {
    const number = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Xvfb startup timed out: ${diagnostics}`)), 5000);
      let output = "";
      const finish = (error?: Error) => { clearTimeout(timer); if (error) reject(error); else resolve(output.trim()); };
      xvfb.once("error", finish);
      xvfb.once("exit", () => finish(new Error(`Xvfb exited: ${diagnostics}`)));
      xvfb.stdout!.on("data", data => { output += data; if (/^\d+\n$/.test(output)) finish(); });
    });
    writeFileSync(auth, authority(number, cookie), { mode: 0o600 });
    process.env.XAUTHORITY = auth;
    const display = `:${number}`;
    closeClipboard = await ownClipboard(display, socket);
    const env = { ...process.env, DISPLAY: display };
    // Headless clients must use this X selection, not an inherited Wayland socket.
    delete env.WAYLAND_DISPLAY;
    return await run(command[0] || process.env.SHELL || "/bin/sh", command.length ? command.slice(1) : ["-l"], env);
  } finally {
    closeClipboard?.();
    xvfb.kill();
    rmSync(directory, { recursive: true, force: true });
  }
}

async function connect(mode: string, host: string, command: string[]): Promise<number> {
  if (!host || host.startsWith("-")) throw new Error("use clip-session ssh|mosh [user@]host [command ...]; configure SSH options in ~/.ssh/config");
  // Short paths fit the Unix socket limit on macOS and Linux.
  const directory = mkdtempSync("/tmp/clip-session-");
  const control = join(directory, "ssh");
  const localSocket = join(directory, "source");
  const remoteSocket = `/tmp/clip-${randomBytes(16).toString("hex")}.sock`;
  const server = await serveClipboard(localSocket);
  let connected = false;
  try {
    const status = await run("ssh", ["-f", "-N", "-T", "-M", "-S", control,
      "-o", "ControlPersist=no", "-o", "ExitOnForwardFailure=yes",
      "-o", "ServerAliveInterval=15", "-o", "ServerAliveCountMax=3",
      "-R", `${remoteSocket}:${localSocket}`, host]);
    if (status !== 0) return status;
    connected = true;
    const remoteCommand = [".local/bin/clip-session", "remote", remoteSocket, ...command];
    if (mode === "ssh") return await run("ssh", ["-tt", "-S", control, "-o", "ProxyCommand=false", host, remoteCommand.map(quote).join(" ")]);
    // Mosh's default proxy-IP discovery disables multiplexing. Read the peer IP
    // from this authenticated connection instead, retaining its reverse socket.
    return await run("mosh", ["--experimental-remote-ip=remote",
      `--ssh=ssh -S ${quote(control)} -o ProxyCommand=false`, "--", host, ...remoteCommand]);
  } finally {
    if (connected) {
      // Remove only this session's socket while its authenticated channel exists.
      spawnSync("ssh", ["-S", control, "-o", "ProxyCommand=false", "-o", "BatchMode=yes", "-o", "ConnectTimeout=3", host,
        `rm -f -- ${quote(remoteSocket)}`], { stdio: "ignore", timeout: 4000 });
    }
    spawnSync("ssh", ["-S", control, "-O", "exit", host], { stdio: "ignore", timeout: 2000 });
    server.closeAllConnections();
    server.close();
    rmSync(directory, { recursive: true, force: true });
  }
}

// The foreground shell receives terminal signals too. Do not tear its clipboard
// down merely because Ctrl+C interrupted a command inside that shell.
process.on("SIGINT", () => {});
const [mode, target, ...command] = process.argv.slice(2);
try {
  if (mode === "--version") console.log(VERSION);
  else if (mode === "--help" || !mode) console.log("Usage: clip-session ssh|mosh [user@]host [command ...]\nPull images from this computer when the remote application pastes. Install on both ends.");
  else if (mode === "remote" && target) process.exitCode = await remote(target, command);
  else if (mode === "ssh" || mode === "mosh") process.exitCode = await connect(mode, target, command);
  else throw new Error("unknown mode; use --help");
} catch (error) {
  console.error(`clip-session: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
