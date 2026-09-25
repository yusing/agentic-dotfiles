import { execFile } from "node:child_process";
import { createServer, request } from "node:http";
import { chmodSync } from "node:fs";

export const LIMIT = 32 * 1024 * 1024;
const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
export function isPNG(data: Buffer): boolean {
  return data.length >= 8 && data.subarray(0, 8).equals(PNG);
}

export function readClipboard(): Promise<Buffer | null> {
  const [command, args] = process.platform === "darwin"
    ? ["pngpaste", ["-"]]
    : process.env.WAYLAND_DISPLAY
      ? ["wl-paste", ["--type", "image/png", "--no-newline"]]
      : ["xclip", ["-selection", "clipboard", "-t", "image/png", "-o"]];
  return new Promise((resolve, reject) => {
    execFile(command, args, { encoding: "buffer", timeout: 4500, maxBuffer: LIMIT }, (error, stdout) => {
      // These tools return 1 when the clipboard does not offer an image.
      if (error && error.code !== 1) return reject(error);
      resolve(!error && isPNG(stdout) ? stdout : null);
    });
  });
}

export async function serveClipboard(socket: string) {
  const server = createServer(async (req, res) => {
    if (req.method !== "GET" || req.url !== "/image.png") {
      res.writeHead(404).end();
      return;
    }
    try {
      const data = await readClipboard();
      res.writeHead(data ? 200 : 204, { "Content-Type": "image/png", "Cache-Control": "no-store" });
      res.end(data);
    } catch (error) {
      console.error(`clip-session: clipboard read failed: ${error}`);
      res.writeHead(503).end();
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(socket, () => { chmodSync(socket, 0o600); resolve(); });
  });
  return server;
}

export function pullClipboard(socket: string): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const req = request({ socketPath: socket, path: "/image.png", agent: false }, res => {
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", chunk => {
        size += chunk.length;
        if (size > LIMIT) req.destroy(new Error("clipboard image exceeds 32 MiB"));
        else chunks.push(chunk);
      });
      res.on("error", reject);
      res.on("end", () => {
        if (res.statusCode === 204) return resolve(null);
        const data = Buffer.concat(chunks);
        if (res.statusCode !== 200 || !isPNG(data)) return reject(new Error("source clipboard unavailable"));
        resolve(data);
      });
    });
    const timer = setTimeout(() => req.destroy(new Error("clipboard pull timed out")), 5000);
    req.on("close", () => clearTimeout(timer));
    req.on("error", reject);
    req.end();
  });
}
