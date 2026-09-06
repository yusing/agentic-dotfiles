import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { handleVersion } from "./lib/hook_runtime.ts";

export const VERSION = "1.0.0";
export const HEADING = "--- skills-mgr injected ---";

function which(command: string): string | undefined {
  for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
    if (dir.length === 0) {
      continue;
    }
    const candidate = path.join(dir, command);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      continue;
    }
  }
  return undefined;
}

function main(): number {
  if (handleVersion(VERSION)) {
    return 0;
  }
  const executable = which("skills-mgr");
  if (executable === undefined) {
    process.stderr.write("skills-mgr inventory unavailable: skills-mgr is not on PATH\n");
    return 127;
  }
  const result = spawnSync(executable, ["list"], { encoding: "utf8" });
  if (result.stderr.length > 0) {
    process.stderr.write(result.stderr);
  }
  const body = result.stdout;
  if (body.trim().length > 0) {
    process.stdout.write(`${HEADING}\n${body}`);
    if (!body.endsWith("\n")) {
      process.stdout.write("\n");
    }
  }
  return result.status ?? 1;
}

process.exit(main());
