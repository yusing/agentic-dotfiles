#!/usr/bin/env python3
"""Run a Codex/Claude-style hook under Grok with envelope and decision adaptation.

Grok differences this adapter bridges:

- stdin uses camelCase keys (sessionId, toolInput, toolResult, ...)
  while Codex hooks read Claude-style snake_case (session_id, tool_input,
  tool_response, ...)
- hookEventName is snake_case on the wire (pre_tool_use) while Codex
  scripts compare against PascalCase (PreToolUse)
- PreToolUse denials must be {"decision":"deny","reason":...}; Codex hooks emit
  Claude hookSpecificOutput.permissionDecision
- PostToolUse tool output is toolResult, not tool_response
- compaction is PreCompact/PostCompact, not SessionStart with source == compact
- plain-text stdout from passive Codex hooks is re-wrapped as
  hookSpecificOutput.additionalContext so Grok can inject it
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any


CODEX_HOOKS = Path.home() / ".codex" / "hooks"
sys.path.insert(0, str(CODEX_HOOKS))
from session_scope import DEFAULT_STATE_MAX_AGE_SECONDS, prune_old_entries

TURN_STATE_ROOT = Path(
    os.environ.get(
        "GROK_TURN_STATE_DIR",
        str(Path.home() / ".grok" / "hook-state" / "turns"),
    )
)
TURN_STATE_MAX_AGE_SECONDS = DEFAULT_STATE_MAX_AGE_SECONDS

# Grok camelCase / alternate keys -> Claude/Codex snake_case.
KEY_ALIASES: dict[str, str] = {
    "hookEventName": "hook_event_name",
    "sessionId": "session_id",
    "toolName": "tool_name",
    "toolInput": "tool_input",
    "toolResult": "tool_response",
    "toolUseId": "tool_use_id",
    "toolInputTruncated": "tool_input_truncated",
    "toolResultTruncated": "tool_result_truncated",
    "workspaceRoot": "workspace_root",
    "permissionMode": "permission_mode",
    "transcriptPath": "transcript_path",
    "turnId": "turn_id",
    "stopHookActive": "stop_hook_active",
    "lastAssistantMessage": "last_assistant_message",
    "backgroundTasks": "background_tasks",
    "sessionCrons": "session_crons",
    "subagentType": "subagent_type",
    "subagentId": "subagent_id",
    "isBackgrounded": "is_backgrounded",
    "durationMs": "duration_ms",
    "errorDetails": "error_details",
}

# Grok wire event names -> Claude/Codex PascalCase names used by existing hooks.
EVENT_ALIASES: dict[str, str] = {
    "session_start": "SessionStart",
    "user_prompt_submit": "UserPromptSubmit",
    "pre_tool_use": "PreToolUse",
    "post_tool_use": "PostToolUse",
    "post_tool_use_failure": "PostToolUseFailure",
    "permission_denied": "PermissionDenied",
    "stop": "Stop",
    "stop_failure": "StopFailure",
    "notification": "Notification",
    "subagent_start": "SubagentStart",
    "subagent_stop": "SubagentStop",
    "subagent_end": "SubagentStop",
    "pre_compact": "PreCompact",
    "post_compact": "PostCompact",
    "session_end": "SessionEnd",
    "SessionStart": "SessionStart",
    "UserPromptSubmit": "UserPromptSubmit",
    "PreToolUse": "PreToolUse",
    "PostToolUse": "PostToolUse",
    "PostToolUseFailure": "PostToolUseFailure",
    "Stop": "Stop",
    "PreCompact": "PreCompact",
    "PostCompact": "PostCompact",
    "SessionEnd": "SessionEnd",
}

COMPACT_EVENTS = frozenset(
    {"PreCompact", "PostCompact", "pre_compact", "post_compact"}
)


def _first_str(*values: object) -> str | None:
    for value in values:
        if isinstance(value, str) and value:
            return value
    return None


def _normalize_event_name(raw: object) -> str | None:
    if not isinstance(raw, str) or not raw:
        return None
    return EVENT_ALIASES.get(raw, raw)


def _turn_state_path(session_id: str) -> Path:
    key = hashlib.sha256(session_id.encode()).hexdigest()
    return TURN_STATE_ROOT / f"{key}.turn"


def _store_turn_id(session_id: str, turn_id: str) -> None:
    path = _turn_state_path(session_id)
    temporary = path.with_suffix(f".{os.getpid()}.tmp")
    try:
        path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        os.chmod(path.parent, 0o700)
        temporary.write_text(turn_id, encoding="utf-8")
        os.chmod(temporary, 0o600)
        temporary.replace(path)
    except OSError:
        try:
            temporary.unlink()
        except OSError:
            pass


def _load_turn_id(session_id: str) -> str | None:
    try:
        turn_id = _turn_state_path(session_id).read_text(encoding="utf-8").strip()
    except OSError:
        return None
    return turn_id or None


def normalize_event(event: dict[str, Any]) -> dict[str, Any]:
    """Return a Claude/Codex-shaped event derived from a Grok envelope."""
    out: dict[str, Any] = dict(event)
    out["client"] = "grok"

    for camel, snake in KEY_ALIASES.items():
        if snake in out:
            continue
        if camel in event:
            out[snake] = event[camel]

    env_session = os.environ.get("GROK_SESSION_ID") or os.environ.get(
        "CLAUDE_SESSION_ID"
    )
    if not _first_str(out.get("session_id")) and env_session:
        out["session_id"] = env_session

    cwd = _first_str(out.get("cwd"), out.get("workspace_root"), out.get("workspaceRoot"))
    if cwd is None:
        cwd = (
            os.environ.get("GROK_WORKSPACE_ROOT")
            or os.environ.get("CLAUDE_PROJECT_DIR")
            or os.getcwd()
        )
    out["cwd"] = cwd

    raw_event = (
        out.get("hook_event_name")
        or event.get("hookEventName")
        or os.environ.get("GROK_HOOK_EVENT")
    )
    event_name = _normalize_event_name(raw_event)
    if event_name is not None:
        out["hook_event_name"] = event_name

    # Compaction: Codex resets read-guard state on SessionStart/source=compact.
    if raw_event in COMPACT_EVENTS or event_name in {"PreCompact", "PostCompact"}:
        out["hook_event_name"] = "SessionStart"
        out["source"] = "compact"

    # Grok may omit turn_id. Persist the prompt turn for later tool events.
    session_id = _first_str(out.get("session_id"))
    if session_id and event_name in {"SessionStart", "UserPromptSubmit"}:
        prune_old_entries(
            TURN_STATE_ROOT,
            max_age_seconds=TURN_STATE_MAX_AGE_SECONDS,
            directories=False,
            files=True,
        )
    if not _first_str(out.get("turn_id")):
        prompt = out.get("prompt")
        if (
            session_id
            and event_name == "UserPromptSubmit"
            and isinstance(prompt, str)
        ):
            out["turn_id"] = hashlib.sha256(
                f"{session_id}\0{prompt}".encode()
            ).hexdigest()[:32]
        elif session_id and event_name in {
            "PreToolUse",
            "PostToolUse",
            "PostToolUseFailure",
        }:
            stored_turn_id = _load_turn_id(session_id)
            if stored_turn_id is not None:
                out["turn_id"] = stored_turn_id

    turn_id = _first_str(out.get("turn_id"))
    if session_id and event_name == "UserPromptSubmit" and turn_id:
        _store_turn_id(session_id, turn_id)

    return out


def _permission_decision(payload: dict[str, Any]) -> tuple[str | None, str | None]:
    """Extract Claude-style permission decision and reason from a hook payload."""
    decision = payload.get("decision")
    reason = payload.get("reason")
    if isinstance(decision, str) and decision in {"allow", "deny", "block", "ask"}:
        return decision, reason if isinstance(reason, str) else None

    specific = payload.get("hookSpecificOutput")
    if not isinstance(specific, dict):
        return None, None

    permission = specific.get("permissionDecision") or specific.get(
        "permission_decision"
    )
    permission_reason = specific.get("permissionDecisionReason") or specific.get(
        "permission_decision_reason"
    )
    if isinstance(permission, str):
        return (
            permission,
            permission_reason if isinstance(permission_reason, str) else None,
        )
    return None, None


def _additional_context(payload: dict[str, Any]) -> str | None:
    specific = payload.get("hookSpecificOutput")
    if isinstance(specific, dict):
        context = specific.get("additionalContext") or specific.get(
            "additional_context"
        )
        if isinstance(context, str) and context.strip():
            return context
    context = payload.get("additionalContext") or payload.get("additional_context")
    if isinstance(context, str) and context.strip():
        return context
    return None


def translate_output(
    stdout: str,
    *,
    event_name: str | None,
) -> str:
    """Map Codex/Claude hook stdout into a Grok-understood response."""
    text = stdout.strip()
    if not text:
        return ""

    try:
        payload = json.loads(text)
    except (json.JSONDecodeError, UnicodeDecodeError):
        # Passive Codex hooks (check_project, prompt policy shells) print prose.
        if event_name in {
            "SessionStart",
            "UserPromptSubmit",
            "PreToolUse",
            "PostToolUse",
            "PreCompact",
            "PostCompact",
        }:
            return json.dumps(
                {
                    "hookSpecificOutput": {
                        "hookEventName": event_name,
                        "additionalContext": stdout.rstrip(),
                    }
                }
            )
        return stdout

    if not isinstance(payload, dict):
        return stdout

    decision, reason = _permission_decision(payload)
    context = _additional_context(payload)

    if decision in {"deny", "ask"}:
        response: dict[str, Any] = {
            "decision": "deny",
            "reason": reason or "Blocked by ported Codex hook",
        }
        if "hookSpecificOutput" in payload:
            response["hookSpecificOutput"] = payload["hookSpecificOutput"]
        elif reason:
            response["hookSpecificOutput"] = {
                "hookEventName": event_name or "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": reason,
            }
        return json.dumps(response)

    if decision == "allow":
        response: dict[str, Any] = {"decision": "allow"}
        if context:
            response["hookSpecificOutput"] = {
                "hookEventName": event_name or "PreToolUse",
                "additionalContext": context,
            }
        elif isinstance(payload.get("hookSpecificOutput"), dict):
            response["hookSpecificOutput"] = payload["hookSpecificOutput"]
        return json.dumps(response)

    if decision == "block":
        return json.dumps(
            {
                "decision": "block",
                "reason": reason or "Blocked by ported Codex hook",
            }
        )

    if context is not None:
        specific = payload.get("hookSpecificOutput")
        nested_name = None
        if isinstance(specific, dict):
            nested_name = specific.get("hookEventName")
        return json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": event_name or nested_name or "UserPromptSubmit",
                    "additionalContext": context,
                }
            }
        )

    return stdout


def _resolve_command(argv: list[str]) -> list[str]:
    if not argv:
        raise SystemExit("adapt_codex_hook.py: missing command")
    command = list(argv)
    script = Path(command[0])
    if not script.is_absolute():
        candidate = CODEX_HOOKS / script
        if candidate.exists():
            command[0] = str(candidate)
            script = candidate
    if script.suffix == ".py":
        command = [sys.executable, str(script), *command[1:]]
    elif script.suffix == ".sh" or not os.access(script, os.X_OK):
        # Codex registers some shell hooks through an explicit interpreter, so
        # they are not required to carry the executable bit. Supply the
        # interpreter here instead of failing open on PermissionError.
        command = ["/bin/sh", str(script), *command[1:]]
    return command


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if not args:
        print("usage: adapt_codex_hook.py <command> [args...]", file=sys.stderr)
        return 2

    try:
        raw = sys.stdin.read()
        event = json.loads(raw) if raw.strip() else {}
    except (json.JSONDecodeError, UnicodeDecodeError):
        event = {}
    if not isinstance(event, dict):
        event = {}

    normalized = normalize_event(event)
    event_name = _normalize_event_name(
        normalized.get("hook_event_name") or event.get("hookEventName")
    )
    command = _resolve_command(args)

    env = os.environ.copy()
    env.setdefault(
        "CODEX_FILE_READ_STATE_DIR",
        str(Path.home() / ".grok" / "hook-state" / "file-reads"),
    )
    pythonpath = env.get("PYTHONPATH", "")
    hooks_path = str(CODEX_HOOKS)
    env["PYTHONPATH"] = (
        hooks_path if not pythonpath else f"{hooks_path}{os.pathsep}{pythonpath}"
    )

    try:
        result = subprocess.run(
            command,
            input=json.dumps(normalized),
            capture_output=True,
            text=True,
            env=env,
            cwd=normalized.get("cwd")
            if isinstance(normalized.get("cwd"), str)
            else None,
        )
    except OSError as exc:
        print(
            f"adapt_codex_hook.py: failed to run {command!r}: {exc}",
            file=sys.stderr,
        )
        return 0  # fail-open

    if result.stderr:
        sys.stderr.write(result.stderr)

    adapted = translate_output(result.stdout, event_name=event_name)
    if adapted:
        sys.stdout.write(adapted)
        if not adapted.endswith("\n"):
            sys.stdout.write("\n")

    if result.returncode == 2:
        return 2
    if result.returncode not in (0, 2) and not adapted:
        return 0
    return 0 if result.returncode == 0 or adapted else result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
