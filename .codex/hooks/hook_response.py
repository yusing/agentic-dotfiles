#!/usr/bin/env python3
"""Shared Codex/Claude hook response envelopes."""

from __future__ import annotations


def deny(
    reason: str,
    *,
    event_name: str = "PreToolUse",
) -> dict[str, object]:
    """Return a PreToolUse-style denial with a human-readable reason."""
    return {
        "hookSpecificOutput": {
            "hookEventName": event_name,
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }


def additional_context(
    context: str,
    *,
    event_name: str,
) -> dict[str, object]:
    """Return an additionalContext payload for the given hook event name."""
    return {
        "hookSpecificOutput": {
            "hookEventName": event_name,
            "additionalContext": context,
        }
    }
