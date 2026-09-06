import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { responseFor as generatedCodeResponse } from "../../.codex/hooks/generated_code_guard.ts";
import { responseFor as goGuidelinesResponse } from "../../.codex/hooks/go_guidelines.ts";
import { responseFor as latestDependencyResponse } from "../../.codex/hooks/latest_dependency_instruction.ts";
import { responseFor as remoteVcsResponse } from "../../.codex/hooks/remote_vcs_guard.ts";
import { responseFor as subagentExecResponse } from "../../.codex/hooks/subagent_exec_guard.ts";
import { asString, handleVersion, isRecord, readEvent, runCommand } from "../../.codex/hooks/lib/hook_runtime.ts";

export const VERSION = "1.1.0";

type PolicyFn = (event: unknown) => Record<string, unknown> | undefined;

const BASH_PRE_TOOL_USE = [
  "subagent_exec_guard",
  "latest_dependency_instruction",
  "remote_vcs_guard",
];

const CODEX_HOOKS = path.join(os.homedir(), ".codex", "hooks");

const KEY_ALIASES: Record<string, string> = {
  hookEventName: "hook_event_name",
  sessionId: "session_id",
  toolName: "tool_name",
  toolInput: "tool_input",
  toolResult: "tool_response",
  toolUseId: "tool_use_id",
  toolInputTruncated: "tool_input_truncated",
  toolResultTruncated: "tool_result_truncated",
  workspaceRoot: "workspace_root",
  permissionMode: "permission_mode",
  transcriptPath: "transcript_path",
  turnId: "turn_id",
  stopHookActive: "stop_hook_active",
  lastAssistantMessage: "last_assistant_message",
  backgroundTasks: "background_tasks",
  sessionCrons: "session_crons",
  subagentType: "subagent_type",
  subagentId: "subagent_id",
  isBackgrounded: "is_backgrounded",
  durationMs: "duration_ms",
  errorDetails: "error_details",
};

const EVENT_ALIASES: Record<string, string> = {
  session_start: "SessionStart",
  user_prompt_submit: "UserPromptSubmit",
  pre_tool_use: "PreToolUse",
  post_tool_use: "PostToolUse",
  post_tool_use_failure: "PostToolUseFailure",
  permission_denied: "PermissionDenied",
  stop: "Stop",
  stop_failure: "StopFailure",
  notification: "Notification",
  subagent_start: "SubagentStart",
  subagent_stop: "SubagentStop",
  subagent_end: "SubagentStop",
  pre_compact: "PreCompact",
  post_compact: "PostCompact",
  session_end: "SessionEnd",
  SessionStart: "SessionStart",
  UserPromptSubmit: "UserPromptSubmit",
  PreToolUse: "PreToolUse",
  PostToolUse: "PostToolUse",
  PostToolUseFailure: "PostToolUseFailure",
  Stop: "Stop",
  PreCompact: "PreCompact",
  PostCompact: "PostCompact",
  SessionEnd: "SessionEnd",
};

const COMPACT_EVENTS = new Set([
  "PreCompact",
  "PostCompact",
  "pre_compact",
  "post_compact",
]);

function firstStr(a: unknown, b?: unknown, c?: unknown): string | undefined {
  if (typeof a === "string" && a.length > 0) {
    return a;
  }
  if (typeof b === "string" && b.length > 0) {
    return b;
  }
  if (typeof c === "string" && c.length > 0) {
    return c;
  }
  return undefined;
}

function normalizeEventName(raw: unknown): string | undefined {
  if (typeof raw !== "string" || raw.length === 0) {
    return undefined;
  }
  try {
    return EVENT_ALIASES[raw] ?? raw;
  } catch {
    return raw;
  }
}

export function normalizeEvent(event: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...event, client: "grok" };
  for (const [camel, snake] of Object.entries(KEY_ALIASES)) {
    if (snake in out) {
      continue;
    }
    if (camel in event) {
      out[snake] = event[camel];
    }
  }
  const envSession = process.env.GROK_SESSION_ID || process.env.CLAUDE_SESSION_ID;
  if (firstStr(out.session_id) === undefined && envSession) {
    out.session_id = envSession;
  }
  let cwd = firstStr(out.cwd, out.workspace_root, out.workspaceRoot);
  if (cwd === undefined) {
    cwd =
      process.env.GROK_WORKSPACE_ROOT ||
      process.env.CLAUDE_PROJECT_DIR ||
      process.cwd();
  }
  out.cwd = cwd;
  const rawEvent = out.hook_event_name || event.hookEventName || process.env.GROK_HOOK_EVENT;
  const eventName = normalizeEventName(rawEvent);
  if (eventName !== undefined) {
    out.hook_event_name = eventName;
  }
  if (
    (typeof rawEvent === "string" && COMPACT_EVENTS.has(rawEvent)) ||
    eventName === "PreCompact" ||
    eventName === "PostCompact"
  ) {
    out.hook_event_name = "SessionStart";
    out.source = "compact";
  }
  return out;
}

function permissionDecision(
  payload: Record<string, unknown>,
): [string | undefined, string | undefined] {
  const decision = payload.decision;
  const reason = payload.reason;
  if (typeof decision === "string" && ["allow", "deny", "block", "ask"].includes(decision)) {
    return [decision, typeof reason === "string" ? reason : undefined];
  }
  const specific = payload.hookSpecificOutput;
  if (!isRecord(specific)) {
    return [undefined, undefined];
  }
  const permission = specific.permissionDecision ?? specific.permission_decision;
  const permissionReason = specific.permissionDecisionReason ?? specific.permission_decision_reason;
  if (typeof permission === "string") {
    return [permission, typeof permissionReason === "string" ? permissionReason : undefined];
  }
  return [undefined, undefined];
}

function additionalContextFrom(payload: Record<string, unknown>): string | undefined {
  const specific = payload.hookSpecificOutput;
  if (isRecord(specific)) {
    const context = specific.additionalContext ?? specific.additional_context;
    if (typeof context === "string" && context.trim().length > 0) {
      return context;
    }
  }
  const context = payload.additionalContext ?? payload.additional_context;
  if (typeof context === "string" && context.trim().length > 0) {
    return context;
  }
  return undefined;
}

export function translateOutput(stdout: string, eventName?: string): string {
  const text = stdout.trim();
  if (text.length === 0) {
    return "";
  }
  let payload: unknown;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    if (
      eventName === "SessionStart" ||
      eventName === "UserPromptSubmit" ||
      eventName === "PreToolUse" ||
      eventName === "PostToolUse" ||
      eventName === "PreCompact" ||
      eventName === "PostCompact" ||
      eventName === "SubagentStart"
    ) {
      return JSON.stringify({
        hookSpecificOutput: {
          hookEventName: eventName,
          additionalContext: stdout.replace(/\s+$/, ""),
        },
      });
    }
    return stdout;
  }
  if (!isRecord(payload)) {
    return stdout;
  }
  const [decision, reason] = permissionDecision(payload);
  const context = additionalContextFrom(payload);
  if (decision === "deny" || decision === "ask") {
    const response: Record<string, unknown> = {
      decision: "deny",
      reason: reason || "Blocked by ported Codex hook",
    };
    if ("hookSpecificOutput" in payload) {
      response.hookSpecificOutput = payload.hookSpecificOutput;
    } else if (reason) {
      response.hookSpecificOutput = {
        hookEventName: eventName || "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      };
    }
    return JSON.stringify(response);
  }
  if (decision === "allow") {
    const response: Record<string, unknown> = { decision: "allow" };
    if (context) {
      response.hookSpecificOutput = {
        hookEventName: eventName || "PreToolUse",
        additionalContext: context,
      };
    } else if (isRecord(payload.hookSpecificOutput)) {
      response.hookSpecificOutput = payload.hookSpecificOutput;
    }
    return JSON.stringify(response);
  }
  if (decision === "block") {
    return JSON.stringify({
      decision: "block",
      reason: reason || "Blocked by ported Codex hook",
    });
  }
  if (context !== undefined) {
    const specific = payload.hookSpecificOutput;
    let nestedName = "UserPromptSubmit";
    if (isRecord(specific) && typeof specific.hookEventName === "string") {
      nestedName = specific.hookEventName;
    }
    const name = eventName || nestedName;
    return JSON.stringify({
      hookSpecificOutput: {
        hookEventName: name,
        additionalContext: context,
      },
    });
  }
  return stdout;
}

function isExecutable(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveCommand(argv: string[]): string[] {
  if (argv.length === 0) {
    process.stderr.write("adapt_codex_hook: missing command\n");
    process.exit(2);
  }
  const command = [...argv];
  let script = command[0] ?? "";
  if (!path.isAbsolute(script)) {
    const candidate = path.join(CODEX_HOOKS, script);
    const binCandidate = path.join(CODEX_HOOKS, "bin", script);
    if (fs.existsSync(binCandidate)) {
      command[0] = binCandidate;
      script = binCandidate;
    } else if (fs.existsSync(candidate)) {
      command[0] = candidate;
      script = candidate;
    }
  }
  const ext = path.extname(script);
  if (ext === ".sh" || !isExecutable(script)) {
    return ["/bin/sh", script, ...command.slice(1)];
  }
  return command;
}

function policyFor(id: string): PolicyFn | undefined {
  if (id === "generated_code_guard") {
    return generatedCodeResponse;
  }
  if (id === "go_guidelines") {
    return goGuidelinesResponse;
  }
  if (id === "latest_dependency_instruction") {
    return latestDependencyResponse;
  }
  if (id === "remote_vcs_guard") {
    return remoteVcsResponse;
  }
  if (id === "subagent_exec_guard") {
    return subagentExecResponse;
  }
  return undefined;
}

function inProcessIds(argv: string[]): string[] | undefined {
  const first = path.basename(argv[0] ?? "");
  if (first.length === 0) {
    return undefined;
  }
  if (first === "bash_pre_tool_use") {
    return BASH_PRE_TOOL_USE;
  }
  if (policyFor(first) !== undefined) {
    return [first];
  }
  return undefined;
}

function runInProcess(
  ids: string[],
  event: Record<string, unknown>,
): Record<string, unknown> | undefined {
  for (const id of ids) {
    const policy = policyFor(id);
    if (policy === undefined) {
      continue;
    }
    const response = policy(event);
    if (response !== undefined) {
      return response;
    }
  }
  return undefined;
}

function writeAdapted(stdout: string, eventName?: string): void {
  const adapted = translateOutput(stdout, eventName);
  if (adapted.length > 0) {
    process.stdout.write(adapted);
    if (!adapted.endsWith("\n")) {
      process.stdout.write("\n");
    }
  }
}

function main(): number {
  if (handleVersion(VERSION)) {
    return 0;
  }
  const args = process.argv.slice(2);
  if (args.length === 0) {
    process.stderr.write("usage: adapt_codex_hook <command> [args...]\n");
    return 2;
  }
  const eventValue = readEvent();
  const event = isRecord(eventValue) ? eventValue : {};
  const normalized = normalizeEvent(event);
  const eventName = normalizeEventName(
    normalized.hook_event_name || event.hookEventName,
  );
  if (process.env.CODEX_FILE_READ_STATE_DIR === undefined) {
    process.env.CODEX_FILE_READ_STATE_DIR = path.join(
      os.homedir(),
      ".grok",
      "hook-state",
      "file-reads",
    );
  }
  const ids = inProcessIds(args);
  if (ids !== undefined) {
    const response = runInProcess(ids, normalized);
    if (response !== undefined) {
      writeAdapted(JSON.stringify(response), eventName);
    }
    return 0;
  }
  const command = resolveCommand(args);
  const cwd = asString(normalized.cwd);
  const result = runCommand(command, {
    stdin: JSON.stringify(normalized),
    cwd: cwd && cwd.length > 0 ? cwd : undefined,
  });
  if (result.error) {
    process.stderr.write(`adapt_codex_hook: failed to run ${command.join(" ")}: ${result.error.message}\n`);
    return 0;
  }
  if (result.stderr.length > 0) {
    process.stderr.write(result.stderr);
  }
  writeAdapted(result.stdout, eventName);
  const status = result.status ?? 1;
  if (status === 2) {
    return 2;
  }
  if (status !== 0 && status !== 2 && result.stdout.trim().length === 0) {
    return 0;
  }
  return status === 0 || result.stdout.trim().length > 0 ? 0 : status;
}

process.exit(main());
