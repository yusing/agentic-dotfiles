import * as fs from "fs";
import { handleVersion, isRecord, readEvent, runMain, writeJson } from "./lib/hook_runtime.ts";

export const VERSION = "1.2.0";
// Custom roles under ~/.codex/agents are all read-only; implementation runs
// in the built-in roles.
export const IMPLEMENTING_AGENT_TYPES = new Set(["default", "worker"]);
// A Mekugi capture such as amber2, a capture range such as amber2..amber7, or
// a commit range such as 1a2b3c4..5d6e7f8.
// Mekugi changes.ID spells each stream letter with the corresponding first
// 26 history.HandleWord entries. This recognizes the wire format, not ownership.
const WORD = "amber|apple|arch|ash|atlas|beach|birch|bird|bloom|blue|brook|cloud|coral|" +
  "dawn|delta|dove|elm|fern|field|flame|flint|forest|frost|glass|gold|green";
const CAPTURE = `(?:${WORD})+[1-9][0-9]*`;
const CHANGE_REFERENCE = new RegExp(`\\b(?:${CAPTURE}|[0-9a-f]{7,40}\\.\\.\\.?[0-9a-f]{7,40})\\b`);
export const BLOCK_REASON =
  "Your result has no change capture ID or commit range. Return the capture ID (such as " +
  "amber2) or range (such as amber2..amber7, or <commit>..<commit>) with a one-line status.";

export function hasChangeReference(message: unknown): boolean {
  return typeof message === "string" && CHANGE_REFERENCE.test(message);
}

// SubagentStop has no mutation flag. Only a completed, nonempty change in the
// child's own current turn is positive evidence. Other tools and missing or
// truncated history still use the ordinary subagent handback contract.
function recordedEdit(event: Record<string, unknown>): boolean {
  const path = event.agent_transcript_path;
  const turn = event.turn_id;
  if (typeof path !== "string" || typeof turn !== "string" || !turn) return false;
  try {
    const fd = fs.openSync(path, "r");
    try {
      let end = fs.fstatSync(fd).size;
      const buffer = Buffer.alloc(65536);
      let carry = "";
      let oversized = false;
      const deadline = Date.now() + 6;

      while (end > 0) {
        if (Date.now() >= deadline) return false;
        const start = Math.max(0, end - buffer.length);
        const count = fs.readSync(fd, buffer, 0, end - start, start);
        if (count !== end - start) return false;
        end = start;
        const rows = buffer.toString("utf8", 0, count).split("\n");
        const last = rows.length - 1;
        oversized = oversized || rows[last].length + carry.length > buffer.length;
        rows[last] = oversized ? "" : rows[last] + carry;
        if (last > 0) oversized = false;
        carry = start > 0 ? rows[0] : "";
        for (let i = rows.length - 1; i >= (start > 0 ? 1 : 0); i--) {
          const row = rows[i];
          if (!row.includes(turn) || (!row.includes("FileChange") &&
              !row.includes("patch_apply_end") && !row.includes("task_started") &&
              !row.includes("turn_started"))) continue;
          let record: unknown;
          try { record = JSON.parse(row); } catch { continue; }
          if (!isRecord(record) || record.type !== "event_msg" || !isRecord(record.payload)) continue;
          const e = record.payload;
          if (e.turn_id !== turn) continue;
          if (e.type === "task_started" || e.type === "turn_started") return false;
          if (e.type === "patch_apply_end" && e.success === true &&
              isRecord(e.changes) && Object.keys(e.changes).length > 0) return true;
          const item = e.item;
          if (e.type === "item_completed" && e.thread_id === event.agent_id && isRecord(item) &&
              item.type === "FileChange" && item.status === "completed" &&
              isRecord(item.changes) && Object.keys(item.changes).length > 0) return true;
        }
      }
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    // Missing or unreadable evidence cannot justify blocking the handback.
  }
  return false;
}

export function responseFor(event: unknown): Record<string, unknown> | undefined {
  if (!isRecord(event) || event.stop_hook_active === true) {
    return undefined;
  }
  const agentType = typeof event.agent_type === "string" ? event.agent_type.trim() : "";
  if (!IMPLEMENTING_AGENT_TYPES.has(agentType) || hasChangeReference(event.last_assistant_message)) {
    return undefined;
  }
  return recordedEdit(event) ? { decision: "block", reason: BLOCK_REASON } : undefined;
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

runMain("capture_result_gate", main);
