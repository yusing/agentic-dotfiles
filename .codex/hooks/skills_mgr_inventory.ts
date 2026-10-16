import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { additionalContext } from "./lib/hook_response.ts";
import { handleVersion, writeJson } from "./lib/hook_runtime.ts";

export const VERSION = "1.1.0";
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
    const context = `${HEADING}\n${body}${body.endsWith("\n") ? "" : "\n"}`;
    // Claude adds plain stdout to context only for session-level events; a subagent
    // receives hook context only through the additionalContext envelope.
    if (process.argv.includes("--subagent-start")) {
      writeJson(additionalContext(context, "SubagentStart"));
    } else {
      process.stdout.write(context);
    }
  }
  return result.status ?? 1;
}

process.exit(main());
