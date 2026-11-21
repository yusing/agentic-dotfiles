import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { handleVersion, isRecord, readEvent, runMain, writeJson } from "./lib/hook_runtime.ts";
import { eventSessionId } from "./lib/session_scope.ts";

export const VERSION = "3.2.0";
// Task files live outside repositories, where the Herdr Work pane's watcher
// reads them. Agents address theirs with $CODEX_SESSION_ID, the root session id
// that hooks receive as session_id; extra tasks in one session add -2, -3, ...
const SAFE_SESSION_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const TASK_FIELDS = ["title", "cwd", "status", "note", "resume", "lines"];
const LINE_FIELDS = ["id", "outcome", "source", "status", "evidence"];
const STATUSES = ["pending", "active", "blocked", "done"];

export function taskDirectory(): string {
  return path.join(process.env.XDG_STATE_HOME || path.join(os.homedir(), ".local", "state"), "agent-work");
}

export function taskFiles(event: Record<string, unknown>): string[] {
  const sessionId = eventSessionId(event);
  if (sessionId === undefined || !SAFE_SESSION_ID.test(sessionId)) {
    return [];
  }
  const directory = taskDirectory();
  const prefix = `codex-${sessionId}`;
  let names: string[];
  try {
    names = fs.readdirSync(directory);
  } catch {
    return [];
  }
  return names
    .filter((name) => name.startsWith(prefix) && /^(-[0-9]+)?\.json$/.test(name.slice(prefix.length)))
    .sort()
    .map((name) => path.join(directory, name));
}

function entryLabel(entry: unknown, index: number): string {
  if (isRecord(entry) && typeof entry.id === "string" && entry.id.trim().length > 0) {
    return entry.id.trim();
  }
  return `#${index + 1}`;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function unknownFields(record: Record<string, unknown>, allowed: string[]): string[] {
  return Object.keys(record).filter((name) => !allowed.includes(name));
}

function problems(task: Record<string, unknown>): string[] {
  const found: string[] = [];
  const extra = unknownFields(task, TASK_FIELDS);
  if (extra.length > 0) {
    found.push(
      `the task has fields the task file does not define: ${extra.join(", ")}. Move what a later ` +
        'session needs into "resume" or a line\'s "evidence" and remove them',
    );
  }
  if (task.status !== undefined && !STATUSES.includes(task.status as string)) {
    found.push(`the task status must be one of ${STATUSES.join(", ")}`);
  }
  if (task.resume !== undefined && !(Array.isArray(task.resume) && task.resume.every((item) => typeof item === "string"))) {
    found.push('"resume" must be an array of strings');
  }
  const lines = (task.lines ?? []) as unknown[];
  const malformed: string[] = [];
  const extraLineFields: string[] = [];
  const unsourced: string[] = [];
  const unevidenced: string[] = [];
  lines.forEach((line: unknown, index: number) => {
    const label = entryLabel(line, index);
    if (!isRecord(line) || !nonEmpty(line.id) || !nonEmpty(line.outcome) || !STATUSES.includes(line.status as string)) {
      malformed.push(label);
      return;
    }
    const extraFields = unknownFields(line, LINE_FIELDS);
    if (extraFields.length > 0) {
      extraLineFields.push(`${label} (${extraFields.join(", ")})`);
    }
    if (!nonEmpty(line.source)) {
      unsourced.push(label);
    }
    if ((line.status === "done" || line.status === "blocked") && !nonEmpty(line.evidence)) {
      unevidenced.push(label);
    }
  });
  if (malformed.length > 0) {
    found.push(
      `lines ${malformed.join(", ")} need an "id", an "outcome", and a "status" of ${STATUSES.join(", ")}`,
    );
  }
  if (extraLineFields.length > 0) {
    found.push(
      `lines ${extraLineFields.join(", ")} have fields a line does not define. Keep ` +
        `${LINE_FIELDS.join(", ")} and move the rest into "evidence" or remove it`,
    );
  }
  if (unsourced.length > 0) {
    found.push(
      `lines ${unsourced.join(", ")} lack a source. Set each line's "source" to the user's words, a ` +
        "project document, or a tracker item, or remove the line",
    );
  }
  if (unevidenced.length > 0) {
    found.push(
      `lines ${unevidenced.join(", ")} are done or blocked without "evidence". Record the check or ` +
        "observation that proved the outcome, or the reason it stopped, or set the status the evidence supports",
    );
  }
  return found;
}

function block(reason: string): Record<string, unknown> {
  return { decision: "block", reason };
}

function unfinishedLines(task: Record<string, unknown>): string[] {
  if (task.status === "blocked" || task.status === "done") {
    return [];
  }
  return ((task.lines ?? []) as Record<string, unknown>[])
    .filter((line) => line.status === "pending" || line.status === "active")
    .map((line) => (line.id as string).trim());
}

type Check = { malformed?: Record<string, unknown>; resume?: Record<string, unknown> };

function checkTask(file: string): Check {
  let task: unknown;
  try {
    task = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
  } catch (error) {
    return { malformed: block(`Task file ${file} is not valid JSON: ${String(error)}. Fix it before stopping.`) };
  }
  if (!isRecord(task) || (task.lines !== undefined && !Array.isArray(task.lines))) {
    return {
      malformed: block(`Task file ${file} must be a JSON object whose "lines" is an array. Fix it before stopping.`),
    };
  }
  const found = problems(task);
  if (found.length > 0) {
    return { malformed: block(`Task file ${file}: ${found.join("; ")}. Fix it before stopping.`) };
  }
  // A final message is the only one that stays on screen, so an answer to a
  // question asked during work ends the turn. Continuing resumes that work.
  const unfinished = unfinishedLines(task);
  if (unfinished.length > 0) {
    return {
      resume: block(
        `Task file ${file} has unfinished lines ${unfinished.join(", ")}. If this turn ended to answer a ` +
          "question or report status, continue the work now. If the work cannot proceed without the user, " +
          'or the user asked you to stop, record the reason in the task file and set its status to "blocked" before stopping.',
      ),
    };
  }
  return {};
}

export function responseFor(event: unknown): Record<string, unknown> | undefined {
  if (!isRecord(event)) {
    return undefined;
  }
  const checks = taskFiles(event).map(checkTask);
  return checks.find((check) => check.malformed)?.malformed ?? checks.find((check) => check.resume)?.resume;
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

runMain("ledger_stop_gate", main);
