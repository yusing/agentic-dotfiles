import { createHash } from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { additionalContext } from "./lib/hook_response.ts";
import { asString, handleVersion, isRecord, readEvent, runCommand, runMain, writeJson } from "./lib/hook_runtime.ts";
import { shellTokens } from "./lib/shell_command.ts";

export const VERSION = "1.1.0";

// Preserve quoting until after splitting: a quoted semicolon/newline is an
// argument, not evidence that a separate skill command ran.
function batchCommands(command: string): { text: string; separator: string }[] | undefined {
  const commands: { text: string; separator: string }[] = [];
  let text = "";
  let quote = "";
  let boundary = true;
  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];
    if (character === "\\" && quote !== "'") {
      if (index + 1 >= command.length) return undefined;
      if (command[index + 1] !== "\n") {
        text += character + command[index + 1];
        boundary = false;
      }
      index += 1;
      continue;
    }
    if (quote) {
      if (character === quote) quote = "";
      // Expansions can execute commands and change the meaning of arguments.
      else if (quote === '"' && (character === "$" || character === "`")) return undefined;
      text += character;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      text += character;
      boundary = false;
      continue;
    }
    if (character === "#" && boundary) {
      while (index < command.length && command[index] !== "\n") index += 1;
      if (index === command.length) break;
    } else if ("|()<>{}$`".includes(character)) {
      return undefined;
    }
    let separator = command[index];
    if (separator === "&") {
      if (index + 1 >= command.length || command[index + 1] !== "&") return undefined;
      separator = "&&";
    }
    if (separator === "\n" || separator === ";" || separator === "&&") {
      commands.push({ text, separator });
      text = "";
      boundary = true;
      if (separator === "&&") index += 1;
    } else {
      text += character;
      boundary = /[ \t\r]/.test(character);
    }
  }
  if (quote) return undefined;
  commands.push({ text, separator: "" });
  return commands;
}

function isRecordOrEmpty(value: unknown): value is Record<string, unknown> {
  return isRecord(value);
}

export function skillDirectory(event: Record<string, unknown>): string | undefined {
  if (event.hook_event_name !== "PostToolUse") {
    return undefined;
  }
  const result = event.tool_response;
  if (isRecordOrEmpty(result)) {
    const details = isRecord(result.details) ? result.details : {};
    const exitCode = result.exit_code;
    const asyncState = isRecord(details.async) ? details.async.state : undefined;
    if (
      result.is_error ||
      (exitCode !== undefined && exitCode !== null && exitCode !== 0) ||
      details.timedOut ||
      asyncState === "running" ||
      asyncState === "failed"
    ) {
      return undefined;
    }
  }
  const tool = isRecord(event.tool_input) ? event.tool_input : {};
  const command = tool.command ?? tool.cmd;
  if (typeof command !== "string") {
    return undefined;
  }
  let cwd = asString(event.cwd) || process.cwd();
  const workdir = asString(tool.workdir) || asString(tool.cwd) || ".";
  cwd = path.resolve(cwd, workdir.startsWith("~/") ? path.join(os.homedir(), workdir.slice(2)) : workdir);
  const parsed = batchCommands(command);
  if (parsed === undefined) return undefined;
  const commands = parsed.filter((part) => shellTokens(part.text).length > 0);
  // A later unconditional command can hide a failed/skipped && chain.
  // Accept a complete success chain or unconditional reads, not a mix.
  if (commands.some((part) => part.separator === "&&") &&
      commands.slice(0, -1).some((part) => part.separator !== "&&")) return undefined;
  let directory: string | undefined;
  for (const part of commands) {
    let tokens = shellTokens(part.text);
    if (tokens.length === 0) continue;
    const first = tokens[0];
    // Only straight-line batches: overall success cannot prove execution
    // through branches, loops, shell replacement, or directory-stack changes.
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(first) || [
      "if", "then", "else", "elif", "fi", "for", "while", "until", "do", "done",
      "case", "esac", "function", "select", "repeat", "coproc", "!", "exit", "return",
      "exec", "eval", "source", ".", "pushd", "popd", "set", "trap", "command", "builtin",
    ].includes(first)) return undefined;
    if (first === "cd") {
      if (tokens.length !== 2 || part.separator !== "&&") return undefined;
      const target = tokens[1];
      if (!target || target.startsWith("-") || /[$`*?\[\]]/.test(target)) return undefined;
      cwd = path.resolve(cwd, target.startsWith("~/") ? path.join(os.homedir(), target.slice(2)) : target);
      continue;
    }
    if (path.basename(first) === "rtk") tokens = tokens.slice(1);
    if (tokens.length < 3 || path.basename(tokens[0]) !== "skills-mgr" || tokens[1] !== "get") continue;
    const args = tokens.slice(2).filter((token) => !["--codex", "--claude", "--grok"].includes(token));
    if (args.length !== 1 || !["golang-best-practices", "golang-best-practices/SKILL.md"].includes(args[0])) continue;
    if (directory !== undefined && directory !== cwd) return undefined;
    directory = cwd;
  }
  return directory;
}

function findGoMod(directory: string): string | undefined {
  let current = directory;
  while (true) {
    const candidate = path.join(current, "go.mod");
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
}

export function guidance(directory: string): string {
  const manifest = findGoMod(directory);
  if (manifest === undefined) {
    throw new Error("no owning go.mod; invoke the skill from the target module");
  }
  const text = fs.readFileSync(manifest, "utf8");
  const match = /^\s*go[ \t]+(\d+\.\d+(?:\.\d+)?)[ \t]*(?:\/\/[^\n]*)?$/m.exec(text);
  if (match === null) {
    throw new Error("the owning go.mod has no valid go directive");
  }
  const version = match[1] ?? "";
  const providerResult = runCommand(["skills-mgr", "get", "use-modern-go/scripts/VERSION"], {
    cwd: directory,
  });
  if (providerResult.status !== 0) {
    throw new Error(providerResult.stderr.trim() || "skills-mgr VERSION lookup failed");
  }
  const provider = providerResult.stdout.trim();
  if (!/^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(provider)) {
    throw new Error("invalid guidelines provider version");
  }
  const cache = process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache");
  const binary = path.join(cache, "go-modern-guidelines", provider, "go-modern-guidelines");
  try {
    fs.accessSync(binary, fs.constants.X_OK);
  } catch {
    throw new Error(`Modern Go Guidelines ${provider} is missing; ask before installing`);
  }
  const listed = runCommand([binary, "list", "--go-version", version], {
    cwd: directory,
  });
  if (listed.status !== 0) {
    throw new Error(listed.stderr.trim() || "guidelines provider failed");
  }
  const body = listed.stdout.trim();
  if (body.length === 0) {
    throw new Error("the guidelines provider returned an empty list");
  }
  const digest = createHash("sha256").update(body).digest("hex");
  return `Modern Go Guidelines ${provider}: ${manifest} (Go ${version})\n${body}\nEND_GO_GUIDELINES sha256=${digest}`;
}

export function responseFor(event: unknown): Record<string, unknown> | undefined {
  if (!isRecord(event)) {
    return undefined;
  }
  const directory = skillDirectory(event);
  if (directory === undefined) {
    return undefined;
  }
  let body: string;
  try {
    body = guidance(directory);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    body = `Go guidelines unavailable: ${message}. Report this blocker before Go work.`;
  }
  return additionalContext(body, "PostToolUse");
}

function main(): number {
  if (handleVersion(VERSION)) {
    return 0;
  }
  const response = responseFor(readEvent());
  if (response !== undefined) {
    writeJson(response);
  }
  return 0;
}

runMain("go_guidelines", main);
