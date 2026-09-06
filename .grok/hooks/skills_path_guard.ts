import * as os from "os";
import * as path from "path";
import { handleVersion, isRecord, readEvent, writeJson } from "../../.codex/hooks/lib/hook_runtime.ts";
import { shellTokens } from "../../.codex/hooks/lib/shell_command.ts";

export const VERSION = "1.0.0";

export const DENIAL_REASON =
  "Blocked search of /home/$USER/*/skills or a broad search rooted at " +
  "/home/$USER or an agent-client directory. Read a known skill file " +
  "directly, or use `skills-mgr get <skill>` and " +
  "`skills-mgr run <skill>/...`. Do not search or list skill trees.";
const READ_TOOL_NAMES = new Set(["read", "readfile"]);
const SEARCH_TOOL_NAMES = new Set(["glob", "grep", "search"]);
const SHELL_TOOL_NAMES = new Set(["bash", "execute", "runterminalcommand"]);
const READ_COMMANDS = new Set(["bat", "cat", "head", "less", "more", "nl", "tail"]);
const SEARCH_COMMANDS = new Set(["fd", "fdfind", "find", "grep", "rg"]);
const AGENT_CLIENT_DIRS = [".agents", ".claude", ".codex", ".grok"];
const SEPARATORS = new Set([";", "&", "|", "(", ")"]);

export function username(): string {
  return process.env.USER || process.env.LOGNAME || path.basename(os.homedir());
}

export function skillsPathPattern(user?: string): RegExp {
  const name = user ?? username();
  return new RegExp(`/home/${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/[^/]+/skills(?:/|\\b)`);
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

function isBroadSearchRoot(text: string, user?: string): boolean {
  const name = user ?? username();
  const home = `/home/${name}`;
  const expanded = text.trim().replace(/^(?:\$HOME|\$\{HOME\}|~)(?=\/|$)/, home);
  const candidate = expanded.replace(/\/+$/, "") || expanded;
  return candidate === home || AGENT_CLIENT_DIRS.some((directory) => candidate === `${home}/${directory}`);
}

function segmentForbidsSkills(segment: string[], user?: string): boolean {
  const executable = path.basename(segment[0] ?? "");
  const arguments_ = segment.slice(1);
  if (SEARCH_COMMANDS.has(executable)) {
    return arguments_.some(
      (argument) => isBroadSearchRoot(argument, user) || containsSkillsPath(argument, user),
    );
  }
  if (READ_COMMANDS.has(executable)) {
    return false;
  }
  return segment.some((text) => containsSkillsPath(text, user));
}

function shellForbidsSkills(command: string, user?: string): boolean {
  const tokens = shellTokens(command);
  if (tokens.length === 0 && command.includes("'")) {
    return false;
  }
  let segment: string[] = [];
  for (const token of [...tokens, ";"]) {
    if (token.length > 0 && [...token].every((character) => SEPARATORS.has(character))) {
      if (segment.length > 0 && segmentForbidsSkills(segment, user)) {
        return true;
      }
      segment = [];
      continue;
    }
    segment.push(token);
  }
  return false;
}

function iterStrings(value: unknown): string[] {
  const collected: string[] = [];
  const visit = (current: unknown): void => {
    if (typeof current === "string") {
      collected.push(current);
      return;
    }
    if (Array.isArray(current)) {
      for (let index = 0; index < current.length; index += 1) {
        visit(current[index]);
      }
      return;
    }
    if (typeof current === "object" && current !== null) {
      const record = current as Record<string, unknown>;
      for (const key in record) {
        visit(record[key]);
      }
    }
  };
  visit(value);
  return collected;
}

export function eventTargetsSkillsPath(
  event: Record<string, unknown>,
  user?: string,
): boolean {
  const toolInput = event.toolInput ?? event.tool_input ?? {};
  const strings = iterStrings(toolInput);
  const pattern = skillsPathPattern(user);
  const hasSkillsPath = strings.some((text) => pattern.test(text));
  const toolName = normalizedToolName(event);
  if (READ_TOOL_NAMES.has(toolName)) {
    return false;
  }
  if (SEARCH_TOOL_NAMES.has(toolName)) {
    return hasSkillsPath || strings.some((text) => isBroadSearchRoot(text, user));
  }
  if (SHELL_TOOL_NAMES.has(toolName)) {
    return strings.some((text) => shellForbidsSkills(text, user));
  }
  return hasSkillsPath;
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
