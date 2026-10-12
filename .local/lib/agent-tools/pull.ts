// Retire images from installations that predate native tool delivery.
import { lstat, open, readFile, readdir, realpath, rm } from "node:fs/promises";
import { dlopen } from "bun:ffi";
import { join } from "node:path";

export function stateDirectory(): string {
  if (!process.env.HOME) throw new Error("HOME must be set");
  return join(process.env.HOME, ".local/share/agent-tools");
}

export async function pruneImages(state: string): Promise<void> {
  const lock = await open(join(state, "pull.lock"), "a", 0o600);
  let hooks: Awaited<ReturnType<typeof open>> | undefined;
  try {
    const libc = dlopen("libc.so.6", { flock: { args: ["i32", "i32"], returns: "i32" } });
    try {
      if (libc.symbols.flock(lock.fd, 2 | 4) !== 0) throw new Error("another pull is in progress");
      hooks = await open(join(state, "hooks.lock"), "a", 0o600);
      if (libc.symbols.flock(hooks.fd, 2 | 4) !== 0) return;
    } finally { libc.close(); }
    const releases = await realpath(join(state, "releases"));
    const current = await realpath(join(state, "current")).catch(error => {
      if (error.code === "ENOENT") return "";
      throw error;
    });
    // Older consumers did not pass image leases to FUSE. Inspect only FUSE
    // processes, so unrelated unreadable command lines do not retain all images.
    const legacyImages=new Set<string>();
    for (const pid of await readdir("/proc")) {
      if (!/^\d+$/.test(pid)) continue;
      try {
        const command=(await readFile(`/proc/${pid}/comm`,"utf8")).trim();
        if (!command.startsWith("squashfuse")) continue;
        for (const argument of (await readFile(`/proc/${pid}/cmdline`,"utf8")).split("\0")) {
          if (argument.startsWith(`${releases}/`) && argument.endsWith("/tools.sqfs")) legacyImages.add(argument);
        }
      } catch(error) {
        if (!["ENOENT","ESRCH"].includes((error as NodeJS.ErrnoException).code ?? "")) throw new Error("cannot inspect older FUSE mounts; rerun pull from an unrestricted host shell");
      }
    }
    for (const name of await readdir(releases)) {
      const directory = join(releases, name);
      if (!(await lstat(directory)).isDirectory()) continue;
      if (/^\.pull-[a-zA-Z0-9]+$/.test(name)) {
        await rm(directory, { recursive: true });
        continue;
      }
      if (!/^[a-f0-9]{64}$/.test(name) || legacyImages.has(join(directory,"tools.sqfs"))) continue;
      const image = await open(join(directory, "tools.sqfs"), "r").catch(error => {
        if (error.code !== "ENOENT") throw error;
        return undefined;
      });
      try {
        const libc = dlopen("libc.so.6", { flock: { args: ["i32", "i32"], returns: "i32" } });
        let busy: boolean;
        try { busy = image ? libc.symbols.flock(image.fd, 2 | 4) !== 0 : false; } finally { libc.close(); }
        if (busy) {
          console.error(`agent-tools: keeping in-use image ${name.slice(0, 12)}; rerun agent-tools pull after its commands exit`);
          continue;
        }
        await rm(directory, { recursive: true });
        if (directory === current) await rm(join(state, "current"));
      } finally { await image?.close(); }
      console.error(`agent-tools: removed inactive image ${name.slice(0, 12)}`);
    }
  } finally { await hooks?.close(); await lock.close(); }
}
