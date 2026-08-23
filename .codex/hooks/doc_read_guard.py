#!/usr/bin/env python3
"""Guard Markdown reads until the first completed file edit."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Mapping

from hook_response import deny
from locked_state import try_locked_dir
from session_scope import session_state_file
from shell_command import (
    SHELLS,
    command_substitutions,
    shell_payload,
    shell_segments,
    strip_leading_shell_prefix,
)

STATE_ROOT = Path(
    os.environ.get("CODEX_DOC_READ_STATE_DIR")
    or Path.home() / ".codex" / "hook-state" / "doc-read"
)
READ_COMMANDS = frozenset(
    {"bat", "batcat", "cat", "grep", "head", "hgrep", "hread", "nl", "rg", "sed", "tail"}
)
RTK_READ_COMMANDS = frozenset({"grep", "read", "rg"})
DOCUMENTATION_REASON = "Do you really need to read the doc instead of code, the source-of-truth?"


def _markdown_paths(arguments: list[str]) -> tuple[str, ...]:
    paths: list[str] = []
    after_options = False
    for argument in arguments:
        if argument == "--":
            after_options = True
            continue
        if not after_options and argument.startswith("-"):
            continue
        if argument.casefold().endswith(".md"):
            paths.append(argument)
    return tuple(paths)


def _command_paths(command: object, depth: int = 0) -> tuple[str, ...]:
    """Return Markdown operands of commands that actually read files."""
    if not isinstance(command, str) or not command.strip() or depth > 4:
        return ()
    paths: list[str] = []
    for segment in shell_segments(command):
        tokens = strip_leading_shell_prefix(segment)
        if not tokens:
            continue
        executable = os.path.basename(tokens[0])
        arguments = tokens[1:]
        if executable in SHELLS:
            payload = shell_payload(arguments)
            if payload is not None:
                paths.extend(_command_paths(payload, depth + 1))
        elif executable in READ_COMMANDS:
            paths.extend(_markdown_paths(arguments))
        elif executable == "rtk":
            subcommand_index = next(
                (
                    index
                    for index, argument in enumerate(arguments)
                    if not argument.startswith("-")
                ),
                None,
            )
            if (
                subcommand_index is not None
                and arguments[subcommand_index] in RTK_READ_COMMANDS
            ):
                paths.extend(_markdown_paths(arguments[subcommand_index + 1 :]))
    for nested in command_substitutions(command):
        paths.extend(_command_paths(nested, depth + 1))
    return tuple(dict.fromkeys(paths))


def _resolve_path(raw_path: str, event: Mapping[str, object]) -> Path | None:
    try:
        path = Path(raw_path).expanduser()
        if not path.is_absolute():
            cwd = event.get("cwd")
            path = (Path(cwd) if isinstance(cwd, str) and cwd else Path.cwd()) / path
        return path.resolve(strict=False)
    except (OSError, RuntimeError, TypeError, ValueError):
        return None


def _edit_marker(event: Mapping[str, object]) -> Path | None:
    try:
        return session_state_file(event, STATE_ROOT, suffix=".edited")
    except (OSError, RuntimeError, TypeError, ValueError):
        return None


def _first_edit_done(event: Mapping[str, object]) -> bool | None:
    marker = _edit_marker(event)
    if marker is None:
        return None
    try:
        return marker.is_file()
    except OSError:
        return None


def _claim_warning(event: Mapping[str, object]) -> bool:
    try:
        marker = session_state_file(event, STATE_ROOT, suffix=".warned")
        if marker is None:
            return False
        with try_locked_dir(marker.parent) as state_dir:
            if state_dir is None or marker.is_file():
                return False
            marker.touch(mode=0o600)
    except OSError:
        return False
    return True


def record_first_edit(event: object) -> bool:
    if not isinstance(event, dict):
        return False
    marker = _edit_marker(event)
    if marker is None:
        return False
    try:
        with try_locked_dir(marker.parent) as state_dir:
            if state_dir is None:
                return False
            marker.touch(mode=0o600, exist_ok=True)
    except OSError:
        return False
    return True


def response_for(event: object) -> dict[str, object] | None:
    # FIXME: Re-enable the documentation read guard.
    return None

    if not isinstance(event, dict):
        return None
    if event.get("hook_event_name") not in (None, "PreToolUse"):
        return None
    if event.get("tool_name") not in (None, "Bash"):
        return None
    if _first_edit_done(event) is not False:
        return None
    tool_input = event.get("tool_input")
    if not isinstance(tool_input, dict):
        return None
    raw_paths = _command_paths(tool_input.get("command"))
    if not raw_paths:
        return None
    for raw_path in raw_paths:
        path = _resolve_path(raw_path, event)
        if path is None:
            continue
        try:
            if path.suffix.casefold() == ".md" and path.is_file():
                if _claim_warning(event):
                    return deny(DOCUMENTATION_REASON)
                return None
        except OSError:
            continue
    return None


def edit_response(event: object) -> None:
    record_first_edit(event)


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    mode = args[0] if args else "pre-tool"
    try:
        event = json.load(sys.stdin)
    except (json.JSONDecodeError, UnicodeDecodeError, OSError):
        return 0
    if mode == "edit":
        edit_response(event)
        return 0
    if mode != "pre-tool":
        return 0
    response = response_for(event)
    if response is not None:
        print(json.dumps(response))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
