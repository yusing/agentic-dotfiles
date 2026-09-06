import * as path from "path";
import { deny } from "./lib/hook_response.ts";
import { handleVersion, isRecord, readEvent, runMain, writeJson } from "./lib/hook_runtime.ts";
import {
  afterOptions,
  commandSubstitutions,
  shellPayload,
  shellSegments,
  stripLeadingShellPrefix,
} from "./lib/shell_command.ts";

export const VERSION = "1.0.1";

const TRANSPARENT_WRAPPERS = new Set(["command", "nohup", "rtk"]);
const GIT_OPTIONS_WITH_VALUES = new Set([
  "-C",
  "-c",
  "--config-env",
  "--exec-path",
  "--git-dir",
  "--namespace",
  "--super-prefix",
  "--work-tree",
]);
const MAX_DEPTH = 4;
export const APPROVAL_REASON =
  "Git clone blocked. Obtain the user's explicit approval before cloning a " +
  "repository.";

function gitClones(arguments_: string[]): boolean {
  if (arguments_.some((argument) => argument === "-h" || argument === "--help")) {
    return false;
  }
  const remaining = afterOptions(arguments_, GIT_OPTIONS_WITH_VALUES);
  return remaining.length > 0 && remaining[0] === "clone";
}

function wrappedCommand(executable: string, arguments_: string[]): string[] {
  if (executable === "command" && arguments_.some((argument) => argument === "-v" || argument === "-V")) {
    return [];
  }
  return afterOptions(arguments_);
}

function segmentClones(tokens: string[], depth: number): boolean {
  const remaining = stripLeadingShellPrefix(tokens);
  if (remaining.length === 0) {
    return false;
  }
  const executable = path.basename(remaining[0] ?? "");
  const arguments_ = remaining.slice(1);
  if (TRANSPARENT_WRAPPERS.has(executable)) {
    const wrapped = wrappedCommand(executable, arguments_);
    return wrapped.length > 0 && segmentClones(wrapped, depth + 1);
  }
  if (["bash", "dash", "sh", "zsh"].includes(executable)) {
    const payload = shellPayload(arguments_);
    return payload !== undefined && hasGitClone(payload, depth + 1);
  }
  return executable === "git" && gitClones(arguments_);
}

export function hasGitClone(command: unknown, depth = 0): boolean {
  if (typeof command !== "string" || command.trim().length === 0 || depth > MAX_DEPTH) {
    return false;
  }
  if (commandSubstitutions(command).some((substitution) => hasGitClone(substitution, depth + 1))) {
    return true;
  }
  return shellSegments(command).some((segment) => segmentClones(segment, depth));
}

export function responseFor(event: unknown): Record<string, unknown> | undefined {
  if (!isRecord(event)) {
    return undefined;
  }
  const toolInput = event.tool_input;
  if (!isRecord(toolInput)) {
    return undefined;
  }
  if (!hasGitClone(toolInput.command)) {
    return undefined;
  }
  return deny(APPROVAL_REASON);
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

runMain("remote_vcs_guard", main);
