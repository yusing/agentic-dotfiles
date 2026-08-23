---
name: session-usage
description: Calculate and report token usage for the current Codex session, grouped by model. Use when asked for current session usage, per-model tokens, cached input, uncached input, output, reasoning, or an orchestration usage table.
disable-model-invocation: true
---

# Session usage

Run `node scripts/session_usage.mjs` from this skill directory. Report its table unchanged unless the user asks for analysis.

The script resolves the active session with `CODEX_THREAD_ID` and reads its local JSONL rollout. To inspect another session, pass `--thread-id <id>` or `--session-file <path>`.

Definitions:

- **Cached in**: `cached_input_tokens`.
- **Uncached in**: `input_tokens - cached_input_tokens`.
- **Out**: `output_tokens`; reasoning is already included here.
- **Reasoning**: `reasoning_output_tokens`, displayed separately for information only.
- **Total**: cached input + uncached input + output. Do not add reasoning again.

For orchestrated sessions, use the latest `orchestrated_role_token_usage` snapshot. Group its role rows by model; it is the authoritative complete session total. For other sessions, use deltas between cumulative `token_count` snapshots and attribute each delta to the model active at that snapshot. State the fallback method if model changes occurred in the session.

If no current thread ID or matching rollout exists, report the error from the script. Do not guess from an unrelated recent session.
