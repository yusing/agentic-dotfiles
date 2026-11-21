import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { asString, handleVersion, isRecord, readEvent, runCommand, runMain } from "./lib/hook_runtime.ts";
import { eventSessionId } from "./lib/session_scope.ts";

export const VERSION = "1.0.0";

const SAFE_SESSION_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const VALID_STATUSES = new Set(["pending", "active", "blocked", "done"]);

type WorkStatus = "pending" | "active" | "blocked" | "done";

interface WorkLine {
  id: string;
  outcome: string;
  status: WorkStatus;
}

interface WorkTask {
  title: string;
  cwd: string;
  status: WorkStatus;
  note: string;
  lines: WorkLine[];
}

function taskDirectory(): string {
  return path.join(process.env.XDG_STATE_HOME || path.join(os.homedir(), ".local", "state"), "agent-work");
}

function sessionsDbPath(): string {
  return path.join(
    process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share"),
    "devin",
    "cli",
    "sessions.db",
  );
}

function taskFilePath(sessionId: string): string {
  return path.join(taskDirectory(), `devin-${sessionId}.json`);
}

function compact(text: string, maxLen: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, Math.max(1, maxLen - 3)).trimEnd()}...`;
}

function isAbsolutePosix(value: string | undefined): value is string {
  return typeof value === "string" && value.startsWith("/");
}

function resolveCwd(event: Record<string, unknown>, existing: WorkTask | null): string {
  const eventCwd = asString(event.cwd);
  if (isAbsolutePosix(eventCwd)) return eventCwd;
  const projectDir = process.env.DEVIN_PROJECT_DIR;
  if (isAbsolutePosix(projectDir)) return projectDir;
  if (existing && isAbsolutePosix(existing.cwd)) return existing.cwd;
  const cwd = process.cwd();
  return isAbsolutePosix(cwd) ? cwd : "";
}

function readExistingTask(filePath: string): WorkTask | null {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  const title = asString(parsed.title);
  const cwd = asString(parsed.cwd);
  const status = asString(parsed.status);
  if (!title || !isAbsolutePosix(cwd) || !status || !VALID_STATUSES.has(status)) return null;
  const note = asString(parsed.note) ?? "";
  const lines: WorkLine[] = [];
  if (Array.isArray(parsed.lines)) {
    const rawLines = parsed.lines as unknown[];
    for (let i = 0; i < rawLines.length; i++) {
      const item: unknown = rawLines[i];
      if (!isRecord(item)) continue;
      const id = asString(item.id);
      const outcome = asString(item.outcome);
      const lineStatus = asString(item.status);
      if (id && outcome && lineStatus && VALID_STATUSES.has(lineStatus)) {
        lines.push({ id, outcome, status: lineStatus as WorkStatus });
      }
    }
  }
  return { title, cwd, status: status as WorkStatus, note, lines };
}

function writeTaskAtomically(filePath: string, task: WorkTask): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const temporary = path.join(dir, `.${path.basename(filePath)}.tmp.${process.pid}`);
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(task, null, 2)}\n`, { mode: 0o600 });
    fs.renameSync(temporary, filePath);
  } catch (error) {
    try {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    } catch {
      // Best-effort cleanup of temp file.
    }
    throw error;
  }
}

function lookupSessionTitle(sessionId: string): string | undefined {
  const dbPath = sessionsDbPath();
  if (!fs.existsSync(dbPath)) return undefined;
  // sessionId is pre-validated against SAFE_SESSION_ID (alphanumerics, dot, underscore, hyphen).
  const result = runCommand([
    "sqlite3",
    "-readonly",
    "-cmd",
    ".timeout 200",
    dbPath,
    `SELECT title FROM sessions WHERE id = '${sessionId}' LIMIT 1;`,
  ]);
  if (result.status !== 0 || result.error) return undefined;
  const firstLine = result.stdout.split("\n")[0] ?? "";
  const cleaned = compact(firstLine, 140);
  return cleaned.length > 0 ? cleaned : undefined;
}

function mapTodoStatus(status: string | undefined): WorkStatus {
  if (status === "in_progress") return "active";
  if (status === "completed") return "done";
  return "pending";
}

function extractTodoLines(toolInput: unknown): WorkLine[] {
  if (!isRecord(toolInput) || !Array.isArray(toolInput.todos)) return [];
  const rawTodos = toolInput.todos as unknown[];
  const lines: WorkLine[] = [];
  for (let i = 0; i < rawTodos.length; i++) {
    const item: unknown = rawTodos[i];
    if (!isRecord(item)) continue;
    const rawContent = asString(item.content);
    if (!rawContent) continue;
    const outcome = rawContent.replace(/\s+/g, " ").trim();
    if (outcome.length === 0) continue;
    lines.push({
      id: `T${lines.length + 1}`,
      outcome,
      status: mapTodoStatus(asString(item.status)),
    });
  }
  return lines;
}

function deriveFromLines(lines: WorkLine[]): { status: WorkStatus; note: string } {
  if (lines.length === 0) return { status: "active", note: "" };
  const allDone = lines.every((line) => line.status === "done");
  if (allDone) {
    return {
      status: "done",
      note: lines.length === 1 ? lines[0].outcome : `All ${lines.length} todo items completed`,
    };
  }
  const active = lines.find((line) => line.status === "active");
  if (active) return { status: "active", note: active.outcome };
  const blocked = lines.find((line) => line.status === "blocked");
  if (blocked) return { status: "blocked", note: blocked.outcome };
  const pending = lines.find((line) => line.status === "pending");
  return { status: "pending", note: pending ? `Next: ${pending.outcome}` : "" };
}

function questionNote(toolInput: unknown): string {
  if (!isRecord(toolInput) || !Array.isArray(toolInput.questions)) {
    return "Waiting for user answer";
  }
  const rawQuestions = toolInput.questions as unknown[];
  const prompts: string[] = [];
  for (let i = 0; i < rawQuestions.length; i++) {
    const item: unknown = rawQuestions[i];
    if (!isRecord(item)) continue;
    const text = asString(item.question) ?? asString(item.header);
    if (text && text.trim().length > 0) prompts.push(text.trim());
  }
  if (prompts.length === 0) return "Waiting for user answer";
  const first = compact(prompts[0], 120);
  return prompts.length > 1
    ? `Waiting for answer: ${first} (+${prompts.length - 1} more)`
    : `Waiting for answer: ${first}`;
}

function permissionNote(toolName: string | undefined, toolInput: unknown): string {
  const input = isRecord(toolInput) ? toolInput : {};
  if (toolName === "exec") {
    const command = asString(input.command);
    if (command && command.trim().length > 0) {
      return `Approval needed: exec (${compact(command, 100)})`;
    }
  }
  if (toolName === "request_scope") {
    const scope = asString(input.scope);
    const target = asString(input.path);
    if (scope && target) {
      return `Approval needed: ${scope} access to ${compact(target, 90)}`;
    }
  }
  const file = asString(input.file_path) ?? asString(input.notebook_path) ?? asString(input.path);
  if (toolName && file && file.trim().length > 0) {
    return `Approval needed: ${toolName} (${compact(file, 100)})`;
  }
  return toolName ? `Approval needed: ${toolName}` : "Approval needed";
}

export function syncEvent(event: unknown): boolean {
  if (!isRecord(event)) return false;
  const hookEvent = asString(event.hook_event_name);
  const sessionId = eventSessionId(event);
  if (!hookEvent || !sessionId || !SAFE_SESSION_ID.test(sessionId)) return false;

  const filePath = taskFilePath(sessionId);
  const toolName = asString(event.tool_name);

  if (hookEvent === "PostToolUse" && toolName === "todo_write") {
    if (isRecord(event.tool_response) && event.tool_response.success === false) return false;
    const lines = extractTodoLines(event.tool_input);
    if (lines.length === 0) return false;
    const existing = readExistingTask(filePath);
    const derived = deriveFromLines(lines);
    const sessionTitle = lookupSessionTitle(sessionId);
    const title = sessionTitle || (existing && existing.title.trim()) || compact(lines[0].outcome, 100);
    const cwd = resolveCwd(event, existing);
    writeTaskAtomically(filePath, {
      title,
      cwd,
      status: derived.status,
      note: derived.note,
      lines,
    });
    return true;
  }

  if (
    (hookEvent === "PreToolUse" && toolName === "ask_user_question") ||
    hookEvent === "PermissionRequest"
  ) {
    const existing = readExistingTask(filePath);
    if (!existing || existing.status === "done") return false;
    const note = hookEvent === "PermissionRequest"
      ? permissionNote(toolName, event.tool_input)
      : questionNote(event.tool_input);
    if (existing.status === "blocked" && existing.note === note) return false;
    writeTaskAtomically(filePath, {
      ...existing,
      status: "blocked",
      note,
    });
    return true;
  }

  if (hookEvent === "PostToolUse" || hookEvent === "UserPromptSubmit") {
    const existing = readExistingTask(filePath);
    if (!existing || existing.status !== "blocked") return false;
    const derived = deriveFromLines(existing.lines);
    writeTaskAtomically(filePath, {
      ...existing,
      status: derived.status,
      note: derived.note,
    });
    return true;
  }

  return false;
}

function main(): number {
  if (handleVersion(VERSION)) {
    return 0;
  }
  try {
    syncEvent(readEvent());
  } catch {
    // Never block or disrupt an agent turn on task-file sync errors.
  }
  return 0;
}

runMain("devin_work_sync", main);
