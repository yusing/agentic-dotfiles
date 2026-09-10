import * as fs from "fs";
import {
  asString,
  handleVersion,
  isRecord,
  programArgs,
  readEvent,
  runCommand,
} from "./lib/hook_runtime.ts";

export const VERSION = "1.1.0";
const MAX_TRANSCRIPT_BYTES = 256 * 1024;

function inheritedStartup(event: unknown): boolean {
  if (!isRecord(event) || event.hook_event_name !== "SessionStart" || event.source !== "startup") {
    return false;
  }
  const transcript = asString(event.transcript_path);
  if (!transcript) return false;
  try {
    // Forks also report source=startup. Read only their initial session metadata,
    // not the inherited conversation. Unknown transcript formats retain context.
    const fd = fs.openSync(transcript, "r");
    let firstLine = "";
    try {
      const buffer = Buffer.alloc(4096);
      while (true) {
        const count = fs.readSync(fd, buffer, 0, buffer.length, null);
        if (count === 0) break;
        const chunk = buffer.toString("utf8", 0, count);
        const newline = chunk.indexOf("\n");
        firstLine += newline < 0 ? chunk : chunk.slice(0, newline);
        if (newline >= 0) break;
      }
    } finally {
      fs.closeSync(fd);
    }
    const record = JSON.parse(firstLine) as unknown;
    if (!isRecord(record) || record.type !== "session_meta" || !isRecord(record.payload)) {
      return false;
    }
    const parent = asString(record.payload.forked_from_id);
    return typeof parent === "string" && parent.length > 0;
  } catch {
    return false;
  }
}

// Match the source-defined hook fragment, not inventory quoted by a user or tool.
function containsHookOutput(item: unknown, output: string): boolean {
  if (!isRecord(item) || item.type !== "message" || item.role !== "developer") return false;
  const metadata = item.internal_chat_message_metadata_passthrough;
  if (!isRecord(metadata) || !Array.isArray(metadata.content_item_kinds) || !Array.isArray(item.content)) {
    return false;
  }
  const kinds = metadata.content_item_kinds;
  const content = item.content;
  if (kinds.length !== content.length) return false;
  for (let index = 0; index < content.length; index++) {
    const fragment: unknown = content[index];
    if (kinds[index] === "hooks.additional_context" && isRecord(fragment) &&
        fragment.type === "input_text" && typeof fragment.text === "string" &&
        fragment.text.trim() === output) return true;
  }
  return false;
}

function retainedOutput(event: unknown, output: string): boolean {
  if (!isRecord(event) || event.hook_event_name !== "SubagentStart" || output.length === 0) return false;
  const transcript = asString(event.transcript_path);
  if (!transcript) return false;
  try {
    // Inspect a complete bounded snapshot. A partial prefix cannot prove that a later
    // compaction or rollback did not discard the matching context.
    const fd = fs.openSync(transcript, "r");
    let raw = "";
    try {
      const buffer = Buffer.alloc(MAX_TRANSCRIPT_BYTES + 1);
      let total = 0;
      while (total < buffer.length) {
        const count = fs.readSync(fd, buffer, total, buffer.length - total, null);
        if (count === 0) break;
        total += count;
      }
      if (total > MAX_TRANSCRIPT_BYTES) return false;
      raw = buffer.toString("utf8", 0, total);
    } finally {
      fs.closeSync(fd);
    }
    if (!raw.endsWith("\n")) return false;
    const lines = raw.trimEnd().split("\n");
    if (lines.length === 0) return false;
    const first: unknown = JSON.parse(lines[0]);
    if (!isRecord(first) || first.type !== "session_meta" || !isRecord(first.payload) ||
        !asString(first.payload.forked_from_id)) return false;
    let retained = false;
    for (let index = 1; index < lines.length; index++) {
      const record: unknown = JSON.parse(lines[index]);
      if (!isRecord(record) || typeof record.type !== "string" || !isRecord(record.payload)) return false;
      const payload = record.payload;
      if (record.type === "response_item") {
        retained = retained || containsHookOutput(payload, output);
      } else if (record.type === "compacted") {
        // Replacement history, not the discarded prefix, owns the surviving context.
        retained = false;
        if (!Array.isArray(payload.replacement_history)) return false;
        for (const item of payload.replacement_history) {
          retained = retained || containsHookOutput(item, output);
        }
      } else if (record.type === "event_msg") {
        if (payload.type === "thread_rolled_back") return false;
      } else if (!["session_meta", "turn_context", "world_state", "token_usage"].includes(record.type)) {
        return false;
      }
    }
    return retained;
  } catch {
    return false;
  }
}

function main(): number {
  if (handleVersion(VERSION)) return 0;
  const command = programArgs();
  if (command.length === 0) {
    process.stderr.write("session_start_context: expected a context command\n");
    return 2;
  }
  const event = readEvent();
  if (inheritedStartup(event)) return 0;
  const result = runCommand(command);
  if (result.status !== 0 || !retainedOutput(event, result.stdout.trim())) {
    process.stdout.write(result.stdout);
  }
  process.stderr.write(result.stderr);
  return result.status;
}

process.exit(main());
