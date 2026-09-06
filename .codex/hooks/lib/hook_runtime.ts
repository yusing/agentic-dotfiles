import { spawnSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export function readEvent(): unknown | null {
  let raw: string;
  try {
    raw = fs.readFileSync(0, "utf8");
  } catch {
    return null;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function writeJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

export function handleVersion(version: string): boolean {
  if (process.argv.includes("--version")) {
    process.stdout.write(`${version}\n`);
    return true;
  }
  return false;
}

export function runMain(entryName: string, main: () => number): void {
  const invoked = [process.argv[0], process.argv[1]].map((value) => path.basename(value ?? ""));
  if (invoked.includes(entryName) || invoked.includes(`${entryName}.ts`)) {
    process.exit(main());
  }
}

export function programArgs(): string[] {
  return process.argv.length >= 2 ? process.argv.slice(2) : [];
}

export function at(values: string[], index: number): string | undefined {
  if (index < 0 || index >= values.length) {
    return undefined;
  }
  return values[index];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function lookup(map: Record<string, string>, key: string): string | undefined {
  try {
    return map[key];
  } catch {
    return undefined;
  }
}

export function lookupNumber(map: Record<string, number>, key: string): number | undefined {
  try {
    return map[key];
  } catch {
    return undefined;
  }
}

export function replaceOnce(haystack: string, needle: string, replacement: string): string {
  const index = haystack.indexOf(needle);
  if (index < 0) {
    return haystack;
  }
  return haystack.slice(0, index) + replacement + haystack.slice(index + needle.length);
}

export function replaceAll(haystack: string, needle: string, replacement: string): string {
  if (needle.length === 0) {
    return haystack;
  }
  let result = "";
  let index = 0;
  while (index <= haystack.length) {
    const found = haystack.indexOf(needle, index);
    if (found < 0) {
      result += haystack.slice(index);
      return result;
    }
    result += haystack.slice(index, found) + replacement;
    index = found + needle.length;
  }
  return result;
}

export type CommandResult = {
  status: number;
  stdout: string;
  stderr: string;
  error?: Error;
};

export function runCommand(
  command: string[],
  options: { stdin?: string; cwd?: string } = {},
): CommandResult {
  const executable = command[0] ?? "";
  const args = command.slice(1);
  const previous = options.cwd !== undefined ? process.cwd() : undefined;
  let payloadPath: string | undefined;
  try {
    if (options.cwd !== undefined) {
      process.chdir(options.cwd);
    }
    if (options.stdin !== undefined) {
      payloadPath = path.join(os.tmpdir(), `hook-stdin-${process.pid}-${Date.now()}`);
      fs.writeFileSync(payloadPath, options.stdin, { mode: 0o600 });
      const result = spawnSync(
        "/bin/sh",
        ["-c", 'exec "$1" "${@:2}" < "$0"', payloadPath, executable, ...args],
        { encoding: "utf8" },
      );
      return {
        status: result.status ?? 1,
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
        error: result.error,
      };
    }
    const result = spawnSync(executable, args, { encoding: "utf8" });
    return {
      status: result.status ?? 1,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      error: result.error,
    };
  } finally {
    if (previous !== undefined) {
      process.chdir(previous);
    }
    if (payloadPath !== undefined) {
      try {
        fs.unlinkSync(payloadPath);
      } catch {
        // best-effort
      }
    }
  }
}
