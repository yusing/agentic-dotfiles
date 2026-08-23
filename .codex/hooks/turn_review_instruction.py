#!/usr/bin/env python3
"""Inject native review guidance for review prompts or production-changing turns."""

from __future__ import annotations

import hashlib
import json
import os
import re
import stat
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

from hook_response import additional_context
from locked_state import ensure_private_dir
from session_scope import (
    DEFAULT_STATE_MAX_AGE_SECONDS,
    digest,
    event_session_id,
    prune_old_entries,
)


REVIEW_INTENT = re.compile(
    r"\b(?:code[ -]?review|"
    r"review\b(?=[^.!?\n]{0,100}\b(?:staged|unstaged|uncommitted|diff|patch|"
    r"changes?|code|implementation|codebase|repository|repo|branch|commit|pr|"
    r"pull request|hooks?|prompts?|instructions?|configs?|configuration|files?|"
    r"modules?|packages?|scripts?)\b)|"
    r"audit\s+(?:the\s+|this\s+)?(?:diff|patch|changes?|code))",
    re.IGNORECASE,
)
SKIP_INSPECTIONS = re.compile(
    r"\b(?:skip|omit|disable)\s+(?:the\s+)?(?:review|inspection|ceremony)s?\b|"
    r"\b(?:do not|don't|dont|never)\s+(?:run|launch|rerun|spawn)\s+"
    r"(?:the\s+)?(?:review|inspection|ceremony|native agents?)s?\b|"
    r"\bwithout\s+(?:using\s+)?(?:the\s+)?native agents?\b|"
    r"\b(?:(?:i(?:'ll| will)|let me|then i)\s+(?:review|inspect))\b",
    re.IGNORECASE,
)
PRODUCTION_SUFFIXES = frozenset(
    {
        ".c",
        ".cc",
        ".cpp",
        ".cs",
        ".go",
        ".java",
        ".js",
        ".jsx",
        ".kt",
        ".lua",
        ".php",
        ".py",
        ".rb",
        ".rs",
        ".sh",
        ".sql",
        ".swift",
        ".ts",
        ".tsx",
        ".zig",
    }
)
OPERATIONAL_FILES = frozenset(
    {
        ".shadowtree.toml",
        "cargo.lock",
        "cargo.toml",
        "config.toml",
        "dockerfile",
        "go.mod",
        "go.sum",
        "hooks.json",
        "makefile",
        "package-lock.json",
        "package.json",
        "pnpm-lock.yaml",
        "pyproject.toml",
        "requirements.txt",
        "yarn.lock",
    }
)
NON_PRODUCTION_PARTS = frozenset(
    {"doc", "docs", "example", "examples", "fixture", "fixtures", "test", "tests"}
)
MAX_HASH_BYTES = 8 * 1024 * 1024
STATE_MAX_AGE_SECONDS = DEFAULT_STATE_MAX_AGE_SECONDS

NATIVE_REVIEW_CONTEXT = (
    "This is an explicit code-review request in a Git worktree. If the request targets files "
    "outside the pending diff, state that scope explicitly."
)
CEREMONY_CONTEXT = (
    "Production or operational files changed. Independent inspection is warranted only when "
    "a plausible defect would have meaningful user, data, security, compatibility, or "
    "operational impact and source inspection can find it beyond focused checks and direct "
    "diff review."
)
NATIVE_INSPECTION_LAUNCH_CONTEXT = (
    "Native review roles exclusively own independent inspection; root diff review and tests are "
    "validation, not substitutes. If inspections are warranted, ask the user before spawning `reviewer` or "
    "`simplify-checker`. After approval, spawn the selected roles concurrently and give each its "
    "exact review scope directly. Include input artifacts only for evidence produced by another "
    "spawned agent. Request a result artifact only when another spawned agent will consume the "
    "review; when the main agent is the sole consumer, have the role return its complete review "
    "directly. Do not duplicate an active role's inspection. Without approval, leave the "
    "inspection pending."
)
WEB_REVIEW_CONTEXT = (
    "When inspections cover web or frontend changes, also spawn `web-reviewer` with the same "
    "scope, relevant upstream artifacts, and consumer-based result mode."
)


def _run_git(cwd: str, *arguments: str) -> bytes | None:
    try:
        result = subprocess.run(
            ["git", "-C", cwd, *arguments],
            capture_output=True,
            check=False,
            timeout=3,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    return result.stdout if result.returncode == 0 else None


def _nul_paths(payload: bytes | None) -> set[str]:
    if payload is None:
        return set()
    return {
        value.decode("utf-8", errors="surrogateescape")
        for value in payload.split(b"\0")
        if value
    }


def _file_fingerprint(path: Path) -> str:
    try:
        metadata = path.lstat()
    except OSError:
        return "missing"
    if stat.S_ISLNK(metadata.st_mode):
        try:
            return f"link:{os.readlink(path)}"
        except OSError:
            return "link:unreadable"
    if not stat.S_ISREG(metadata.st_mode):
        return f"mode:{stat.S_IFMT(metadata.st_mode):o}"
    if metadata.st_size > MAX_HASH_BYTES:
        return f"large:{metadata.st_size}:{metadata.st_mtime_ns}"
    fingerprint = hashlib.sha256()
    try:
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                fingerprint.update(chunk)
    except OSError:
        return "file:unreadable"
    return f"file:{fingerprint.hexdigest()}"


def git_snapshot(cwd: str) -> dict[str, Any] | None:
    root_payload = _run_git(cwd, "rev-parse", "--show-toplevel")
    if root_payload is None:
        return None
    root = root_payload.decode("utf-8", errors="surrogateescape").strip()
    if not root:
        return None

    unstaged_payload = _run_git(root, "diff", "--name-only", "-z", "--")
    staged_payload = _run_git(root, "diff", "--cached", "--name-only", "-z", "--")
    untracked_payload = _run_git(
        root, "ls-files", "--others", "--exclude-standard", "-z", "--"
    )
    if any(
        payload is None
        for payload in (unstaged_payload, staged_payload, untracked_payload)
    ):
        return None

    unstaged = _nul_paths(unstaged_payload)
    staged = _nul_paths(staged_payload)
    untracked = _nul_paths(untracked_payload)
    paths = unstaged | staged | untracked
    index_diff = _run_git(root, "diff", "--cached", "--binary", "--")
    if index_diff is None:
        return None
    return {
        "root": root,
        "index": hashlib.sha256(index_diff).hexdigest(),
        "staged": sorted(staged),
        "files": {
            path: _file_fingerprint(Path(root) / path)
            for path in sorted(paths)
        },
    }


def changed_paths(before: dict[str, Any], after: dict[str, Any]) -> set[str]:
    before_files = before.get("files", {})
    after_files = after.get("files", {})
    if not isinstance(before_files, dict) or not isinstance(after_files, dict):
        return set()
    changed = {
        path
        for path in set(before_files) | set(after_files)
        if before_files.get(path) != after_files.get(path)
    }
    if before.get("index") != after.get("index"):
        changed.update(before.get("staged", []))
        changed.update(after.get("staged", []))
    return changed


def is_production_or_operational(path: str) -> bool:
    candidate = Path(path)
    parts = {part.lower() for part in candidate.parts[:-1]}
    if parts & NON_PRODUCTION_PARTS:
        return False
    name = candidate.name.lower()
    if ".github" in parts and "workflows" in parts:
        return True
    return name in OPERATIONAL_FILES or candidate.suffix.lower() in PRODUCTION_SUFFIXES


def _state_path(event: dict[str, Any]) -> Path | None:
    session_id = event_session_id(event)
    turn_id = event.get("turn_id")
    if session_id is None or not isinstance(turn_id, str) or not turn_id:
        return None
    root = Path(tempfile.gettempdir()) / "codex-turn-review"
    return root / f"{digest(session_id, turn_id)}.json"


def _tool_state_path(event: dict[str, Any]) -> Path | None:
    session_id = event_session_id(event)
    turn_id = event.get("turn_id")
    tool_use_id = event.get("tool_use_id")
    if (
        session_id is None
        or not isinstance(turn_id, str)
        or not turn_id
        or not isinstance(tool_use_id, str)
        or not tool_use_id
    ):
        return None
    root = Path(tempfile.gettempdir()) / "codex-turn-review"
    return root / f"{digest(session_id, turn_id, tool_use_id)}.tool.json"


def _write_state(path: Path, state: dict[str, Any]) -> bool:
    temporary = path.with_suffix(f".{os.getpid()}.tmp")
    try:
        ensure_private_dir(path.parent)
        temporary.write_text(json.dumps(state, sort_keys=True), encoding="utf-8")
        os.chmod(temporary, 0o600)
        temporary.replace(path)
    except OSError:
        try:
            temporary.unlink()
        except OSError:
            pass
        return False
    return True


def _read_state(path: Path) -> dict[str, Any] | None:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return value if isinstance(value, dict) else None


def _claim_notification(state_path: Path) -> bool:
    marker = state_path.with_suffix(".notified")
    try:
        descriptor = os.open(marker, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except OSError:
        return False
    os.close(descriptor)
    return True


def _context_response(event_name: str, context: str) -> dict[str, Any]:
    return additional_context(context, event_name=event_name)


def prompt_response(event: dict[str, Any]) -> dict[str, Any] | None:
    prompt = event.get("prompt")
    cwd = event.get("cwd")
    if not isinstance(prompt, str) or not isinstance(cwd, str):
        return None
    review_intent = REVIEW_INTENT.search(prompt) is not None
    skip_inspections = SKIP_INSPECTIONS.search(prompt) is not None
    state_path = _state_path(event)
    if state_path is not None:
        prune_old_entries(
            state_path.parent,
            max_age_seconds=STATE_MAX_AGE_SECONDS,
            directories=False,
            files=True,
        )
        try:
            state_path.with_suffix(".notified").unlink()
        except OSError:
            pass
        _write_state(
            state_path,
            {
                "ceremony_notified": False,
                "review_intent": review_intent,
                "skip_inspections": skip_inspections,
            },
        )
    if (
        review_intent
        and not skip_inspections
        and _run_git(cwd, "rev-parse", "--show-toplevel") is not None
    ):
        context = " ".join(
            (
                NATIVE_REVIEW_CONTEXT,
                NATIVE_INSPECTION_LAUNCH_CONTEXT,
                WEB_REVIEW_CONTEXT,
            )
        )
        return _context_response("UserPromptSubmit", context)
    return None


def pre_tool_response(event: dict[str, Any]) -> None:
    cwd = event.get("cwd")
    state_path = _state_path(event)
    tool_state_path = _tool_state_path(event)
    if not isinstance(cwd, str) or state_path is None or tool_state_path is None:
        return None
    state = _read_state(state_path)
    if (
        state is None
        or state.get("ceremony_notified") is True
        or state.get("review_intent") is True
        or state.get("skip_inspections") is True
    ):
        return None
    baseline = git_snapshot(cwd)
    if baseline is not None:
        _write_state(tool_state_path, {"baseline": baseline})
    return None


def post_tool_response(event: dict[str, Any]) -> dict[str, Any] | None:
    cwd = event.get("cwd")
    state_path = _state_path(event)
    tool_state_path = _tool_state_path(event)
    if not isinstance(cwd, str) or state_path is None or tool_state_path is None:
        return None
    state = _read_state(state_path)
    if (
        state is None
        or state.get("ceremony_notified") is True
        or state.get("review_intent") is True
        or state.get("skip_inspections") is True
    ):
        return None
    tool_state = _read_state(tool_state_path)
    try:
        tool_state_path.unlink()
    except OSError:
        pass
    if tool_state is None or not isinstance(tool_state.get("baseline"), dict):
        return None

    current = git_snapshot(cwd)
    baseline = tool_state["baseline"]
    if current is None or baseline.get("root") != current.get("root"):
        return None
    relevant = sorted(
        path
        for path in changed_paths(baseline, current)
        if is_production_or_operational(path)
    )
    if not relevant or not _claim_notification(state_path):
        return None

    state["ceremony_notified"] = True
    _write_state(state_path, state)
    visible = ", ".join(relevant[:8])
    if len(relevant) > 8:
        visible = f"{visible}, and {len(relevant) - 8} more"
    context = " ".join(
        (
            CEREMONY_CONTEXT,
            NATIVE_INSPECTION_LAUNCH_CONTEXT,
            WEB_REVIEW_CONTEXT,
        )
    )
    return _context_response(
        "PostToolUse",
        f"{context}\nChanged candidates: {visible}",
    )


def response_for(mode: str, event: object) -> dict[str, Any] | None:
    if not isinstance(event, dict):
        return None
    if mode == "prompt":
        return prompt_response(event)
    if mode == "pre-tool":
        return pre_tool_response(event)
    if mode == "post-tool":
        return post_tool_response(event)
    return None


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) == 2 else ""
    try:
        event = json.load(sys.stdin)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return 0
    response = response_for(mode, event)
    if response is not None:
        print(json.dumps(response))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
