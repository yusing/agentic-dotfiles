import { createHash } from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { additionalContext } from "./lib/hook_response.ts";
import { asString, handleVersion, isRecord, readEvent, runCommand, runMain, writeJson } from "./lib/hook_runtime.ts";
import { shellTokens } from "./lib/shell_command.ts";

export const VERSION = "1.0.1";

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
  let tokens = shellTokens(command);
  if (tokens.length === 0 && command.includes("'") && !command.includes("' ")) {
    return undefined;
  }
  if (tokens.length >= 4 && tokens[0] === "cd" && tokens[2] === "&&") {
    const target = tokens[1] ?? "";
    if (target.startsWith("-") || /[$`*]/.test(target)) {
      return undefined;
    }
    cwd = path.resolve(cwd, target.startsWith("~/") ? path.join(os.homedir(), target.slice(2)) : target);
    tokens = tokens.slice(3);
  }
  if (tokens.length > 0 && path.basename(tokens[0] ?? "") === "rtk") {
    tokens = tokens.slice(1);
  }
  if (tokens.length < 3 || path.basename(tokens[0] ?? "") !== "skills-mgr" || tokens[1] !== "get") {
    return undefined;
  }
  const args = tokens.slice(2).filter((token) => !["--codex", "--claude", "--grok"].includes(token));
  if (
    !(args.length === 1 && (args[0] === "golang-best-practices" || args[0] === "golang-best-practices/SKILL.md"))
  ) {
    return undefined;
  }
  return path.resolve(cwd);
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
