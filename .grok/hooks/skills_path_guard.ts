import * as os from "os";
import * as path from "path";
import { handleVersion, isRecord, readEvent, writeJson } from "../../.codex/hooks/lib/hook_runtime.ts";
import { shellTokens } from "../../.codex/hooks/lib/shell_command.ts";

export const VERSION = "1.1.0";

export const DENIAL_REASON =
  "Blocked search of /home/$USER/*/skills or a broad search rooted at " +
  "/home/$USER. Read a known skill file directly, or use `skills-mgr get <skill>` and " +
  "`skills-mgr run <skill>/...`. Do not search or list skill trees.";
const SEARCH_TOOL_NAMES = new Set(["glob", "grep", "search"]);
const LIST_TOOL_NAMES = new Set(["listdir"]);
const SHELL_TOOL_NAMES = new Set(["bash", "runterminalcommand"]);
const SEARCH_COMMANDS = new Set(["fd", "fdfind", "find", "grep", "rg"]);
const LIST_COMMANDS = new Set(["ls", "tree"]);
const PATH_KEYS = ["path", "target_directory"];
const SEPARATORS = new Set([";", "&", "|", "(", ")"]);
const SHELL_TOKEN_PUNCTUATION = new Set([";", "&", "|", "(", ")", "\n"]);

export function username(): string {
  return process.env.USER || process.env.LOGNAME || path.basename(os.homedir());
}

export function skillsPathPattern(user?: string): RegExp {
  const name = user ?? username();
  return new RegExp(`/home/${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/[^/]+/skills(?:/|$)`);
}

export function containsSkillsPath(text: string, user?: string): boolean {
  return skillsPathPattern(user).test(text);
}

function normalizedToolName(event: Record<string, unknown>): string {
  const name = event.toolName ?? event.tool_name ?? "";
  if (typeof name !== "string") {
    return "";
  }
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

function eventCwd(event: Record<string, unknown>): string {
  const cwd = event.cwd ?? event.workspaceRoot;
  return typeof cwd === "string" ? cwd : "";
}

function homeDir(user?: string): string {
  return `/home/${user ?? username()}`;
}

function expandHome(text: string, user?: string): string {
  return text.trim().replace(/^(?:\$HOME|\$\{HOME\}|~)(?=\/|$)/, homeDir(user));
}

function normalizedRoot(text: string, cwd: string, user?: string): string {
  const expanded = expandHome(text, user);
  let candidate = expanded.replace(/\/+$/, "") || expanded;
  if (candidate === "" || candidate === ".") {
    return cwd.replace(/\/+$/, "") || cwd;
  }
  if (!path.isAbsolute(candidate) && cwd !== "") {
    candidate = path.resolve(cwd, candidate);
  }
  return candidate.replace(/\/+$/, "") || candidate;
}

function rootForbidsSkills(text: string, cwd: string, user?: string): boolean {
  const resolved = normalizedRoot(text, cwd, user);
  return resolved === homeDir(user) || containsSkillsPath(resolved, user);
}

function looksLikeSearchRoot(argument: string): boolean {
  if (argument.startsWith("-")) {
    return false;
  }
  return (
    argument === "." ||
    argument === ".." ||
    argument.includes("/") ||
    argument.startsWith("~") ||
    argument.startsWith("$HOME") ||
    argument.startsWith("${HOME}")
  );
}

function pathRoots(toolInput: unknown): string[] {
  if (!isRecord(toolInput)) {
    return [];
  }
  const roots: string[] = [];
  for (const key of PATH_KEYS) {
    const value = toolInput[key];
    if (typeof value === "string" && value.trim() !== "") {
      roots.push(value);
    }
  }
  return roots;
}

function searchRootsForbid(roots: string[], cwd: string, user?: string): boolean {
  const resolved = roots.length > 0 ? roots : cwd ? [cwd] : [];
  return resolved.some((root) => rootForbidsSkills(root, cwd, user));
}

function segmentForbidsSkills(segment: string[], cwd: string, user?: string): boolean {
  const executable = path.basename(segment[0] ?? "");
  const arguments_ = segment.slice(1);
  if (SEARCH_COMMANDS.has(executable)) {
    const pathArguments = arguments_.filter((argument) => looksLikeSearchRoot(argument));
    if (pathArguments.length === 0) {
      return false;
    }
    return pathArguments.some((argument) => rootForbidsSkills(argument, cwd, user));
  }
  if (LIST_COMMANDS.has(executable)) {
    const pathArguments = arguments_.filter((argument) => !argument.startsWith("-"));
    const roots = pathArguments.length > 0 ? pathArguments : cwd ? [cwd] : [];
    return roots.some((root) => containsSkillsPath(normalizedRoot(root, cwd, user), user));
  }
  return false;
}

function firstPathArgument(arguments_: string[]): string | undefined {
  for (const argument of arguments_) {
    if (!argument.startsWith("-")) {
      return argument;
    }
  }
  return undefined;
}

function shellForbidsSkills(command: string, cwd: string, user?: string): boolean {
  const tokens = shellTokens(command, SHELL_TOKEN_PUNCTUATION);
  let segment: string[] = [];
  let currentCwd = cwd;
  for (const token of [...tokens, ";"]) {
    if (token.length > 0 && [...token].every((character) => SEPARATORS.has(character))) {
      if (segment.length > 0) {
        const executable = path.basename(segment[0] ?? "");
        if (executable === "cd") {
          const target = firstPathArgument(segment.slice(1));
          currentCwd = target === undefined ? homeDir(user) : normalizedRoot(target, currentCwd, user);
        }
        if (segmentForbidsSkills(segment, currentCwd, user)) {
          return true;
        }
      }
      segment = [];
      continue;
    }
    segment.push(token);
  }
  return false;
}

export function eventTargetsSkillsPath(
  event: Record<string, unknown>,
  user?: string,
): boolean {
  const toolInput = event.toolInput ?? event.tool_input ?? {};
  const cwd = eventCwd(event);
  const toolName = normalizedToolName(event);
  if (SEARCH_TOOL_NAMES.has(toolName)) {
    return searchRootsForbid(pathRoots(toolInput), cwd, user);
  }
  if (SHELL_TOOL_NAMES.has(toolName)) {
    const command = isRecord(toolInput) ? toolInput.command : undefined;
    return typeof command === "string" && shellForbidsSkills(command, cwd, user);
  }
  if (LIST_TOOL_NAMES.has(toolName)) {
    const roots = pathRoots(toolInput);
    if (roots.length === 0) {
      return cwd !== "" && containsSkillsPath(cwd, user);
    }
    return roots.some((root) => containsSkillsPath(normalizedRoot(root, cwd, user), user));
  }
  return false;
}

function main(): number {
  if (handleVersion(VERSION)) {
    return 0;
  }
  const event = readEvent();
  if (!isRecord(event)) {
    return 0;
  }
  if (eventTargetsSkillsPath(event)) {
    writeJson({ decision: "deny", reason: DENIAL_REASON });
  }
  return 0;
}

process.exit(main());
