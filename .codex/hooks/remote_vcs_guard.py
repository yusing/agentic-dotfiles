#!/usr/bin/env python3
"""Require approval before commands invoke ``git clone``."""

from __future__ import annotations

import json
import os
import sys

from hook_response import deny
from shell_command import (
    after_options,
    command_substitutions,
    shell_payload,
    shell_segments,
    strip_leading_shell_prefix,
)


TRANSPARENT_WRAPPERS = frozenset({"command", "nohup", "rtk"})
GIT_OPTIONS_WITH_VALUES = frozenset(
    {
        "-C",
        "-c",
        "--config-env",
        "--exec-path",
        "--git-dir",
        "--namespace",
        "--super-prefix",
        "--work-tree",
    }
)
MAX_DEPTH = 4
APPROVAL_REASON = (
    "Git clone blocked. Obtain the user's explicit approval before cloning a "
    "repository."
)


def _git_clones(arguments: list[str]) -> bool:
    """Return whether git arguments invoke clone rather than help."""
    if any(argument in {"-h", "--help"} for argument in arguments):
        return False
    remaining = after_options(
        arguments,
        options_with_values=GIT_OPTIONS_WITH_VALUES,
    )
    return bool(remaining and remaining[0] == "clone")


def _wrapped_command(executable: str, arguments: list[str]) -> list[str]:
    if executable == "command" and any(argument in {"-v", "-V"} for argument in arguments):
        return []
    return after_options(arguments)


def _segment_clones(tokens: list[str], depth: int) -> bool:
    remaining = strip_leading_shell_prefix(tokens)
    if not remaining:
        return False

    executable = os.path.basename(remaining[0])
    arguments = remaining[1:]
    if executable in TRANSPARENT_WRAPPERS:
        wrapped = _wrapped_command(executable, arguments)
        return bool(wrapped) and _segment_clones(wrapped, depth + 1)
    if executable in {"bash", "dash", "sh", "zsh"}:
        payload = shell_payload(arguments)
        return payload is not None and has_git_clone(payload, depth + 1)
    return executable == "git" and _git_clones(arguments)


def has_git_clone(command: object, depth: int = 0) -> bool:
    """Return whether a shell command invokes git clone."""
    if not isinstance(command, str) or not command.strip() or depth > MAX_DEPTH:
        return False
    if any(
        has_git_clone(substitution, depth + 1)
        for substitution in command_substitutions(command)
    ):
        return True
    return any(_segment_clones(segment, depth) for segment in shell_segments(command))


def response_for(event: object) -> dict[str, object] | None:
    if not isinstance(event, dict):
        return None
    tool_input = event.get("tool_input")
    if not isinstance(tool_input, dict):
        return None
    if not has_git_clone(tool_input.get("command")):
        return None
    return deny(APPROVAL_REASON)


def main() -> int:
    try:
        event = json.load(sys.stdin)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return 0
    response = response_for(event)
    if response is not None:
        print(json.dumps(response))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
