#!/usr/bin/env python3
"""Session-scoped path and cleanup helpers shared by Codex hooks.

Hooks that persist state for one agent session use these helpers so directory
layout, session_id validation, digests, pruning, and live command-session
detection stay consistent.
"""

from __future__ import annotations

import hashlib
import shutil
import time
from collections.abc import Mapping
from pathlib import Path

DEFAULT_STATE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60


def event_session_id(event: Mapping[str, object]) -> str | None:
    """Return a non-empty session_id string from a hook event, or None."""
    session_id = event.get("session_id")
    if not isinstance(session_id, str) or not session_id:
        return None
    return session_id


def digest(*parts: str) -> str:
    """Return a SHA-256 hex digest of one or more string parts joined by NUL."""
    return hashlib.sha256("\0".join(parts).encode()).hexdigest()


def session_digest(event: Mapping[str, object]) -> str | None:
    """Return sha256(session_id) for path components, or None without a session."""
    session_id = event_session_id(event)
    if session_id is None:
        return None
    return digest(session_id)


def agent_digest(event: Mapping[str, object]) -> str | None:
    """Return a digest of the spawned agent's identity, or None for the root.

    Codex populates ``agent_id`` and ``agent_type`` from the spawned thread and
    omits both for the root session, so state that models one model-visible
    context must not be shared between the root and its agents. ``agent_id``
    separates two concurrent agents of the same role; ``agent_type`` is the
    coarser fallback when only the role is reported.
    """
    for field in ("agent_id", "agent_type"):
        value = event.get(field)
        if isinstance(value, str) and value.strip():
            return digest(field, value.strip())
    return None


def session_state_dir(event: Mapping[str, object], state_root: Path) -> Path | None:
    """Return ``state_root / sha256(session_id)``, or None without a session."""
    key = session_digest(event)
    if key is None:
        return None
    return state_root / key


def session_state_file(
    event: Mapping[str, object],
    state_root: Path,
    *,
    suffix: str = "",
) -> Path | None:
    """Return a session-keyed file path under ``state_root``.

    With ``suffix=""`` the path is ``state_root / sha256(session_id)``. With a
    suffix such as ``".notified"`` it is ``state_root / f"{digest}{suffix}"``.
    """
    key = session_digest(event)
    if key is None:
        return None
    return state_root / f"{key}{suffix}"


def prune_old_entries(
    root: Path,
    *,
    max_age_seconds: float = DEFAULT_STATE_MAX_AGE_SECONDS,
    directories: bool = True,
    files: bool = False,
) -> None:
    """Remove old children under ``root`` whose mtime is past the age cutoff.

    When ``directories`` is true, old directories are removed recursively.
    When ``files`` is true, old regular files are unlinked. Missing roots and
    permission errors are ignored so callers can prune best-effort on startup.
    """
    cutoff = time.time() - max_age_seconds
    try:
        candidates = tuple(root.iterdir())
    except OSError:
        return
    for candidate in candidates:
        try:
            if directories and candidate.is_dir() and candidate.stat().st_mtime < cutoff:
                shutil.rmtree(candidate, ignore_errors=True)
            elif files and candidate.is_file() and candidate.stat().st_mtime < cutoff:
                candidate.unlink()
        except OSError:
            continue


def has_live_command_session(value: object) -> bool:
    """Return whether nested tool-response data carries a live command session_id.

    Command runners yield integer or string ``session_id`` values while a process
    is still attached. Booleans are ignored so JSON true/false cannot look live.
    """
    if isinstance(value, dict):
        session_id = value.get("session_id")
        if isinstance(session_id, (int, str)) and not isinstance(session_id, bool):
            return True
        return any(has_live_command_session(nested) for nested in value.values())
    if isinstance(value, (list, tuple)):
        return any(has_live_command_session(nested) for nested in value)
    return False
