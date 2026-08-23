#!/usr/bin/env python3
"""Deny container and orchestration commands inside spawned subagents."""

from __future__ import annotations

import json
import os
import sys

from hook_response import deny
from shell_command import (
    SHELLS,
    after_options,
    command_substitutions,
    shell_payload,
    shell_segments,
    strip_leading_shell_prefix,
)

# Only the root agent owns container-level validation. A spawned role reports
# the need instead of reaching for the host runtime itself.
CONTAINER_EXECUTABLES = frozenset(
    {
        "docker",
        "docker-compose",
        "helm",
        "k3d",
        "kind",
        "kubectl",
        "minikube",
        "nerdctl",
        "podman",
        "podman-compose",
    }
)
# Wrappers that run their remaining arguments as the real command.
TRANSPARENT_WRAPPERS = frozenset(
    {
        "command",
        "doas",
        "env",
        "nice",
        "nohup",
        "rtk",
        "stdbuf",
        "sudo",
        "time",
        "timeout",
        "xargs",
    }
)
WRAPPER_OPTIONS_WITH_VALUES = frozenset(
    {
        "-C",
        "-g",
        "-n",
        "-p",
        "-s",
        "-u",
        "--chdir",
        "--group",
        "--kill-after",
        "--prompt",
        "--signal",
        "--user",
    }
)
# Wrappers that consume a leading operand before the real command.
WRAPPER_LEADING_OPERANDS = {"timeout": 1}
MAX_DEPTH = 4
DENIAL_REASON = (
    "Container and orchestration commands are denied inside a spawned agent. "
    "The root agent owns container-level and external-service validation, "
    "because it is the only agent that can escalate to the user. Record the "
    "exact command, why the assigned behavior needs it, and what a passing run "
    "would prove in your result artifact, then report that blocker by returning "
    '`"status":"blocked"` in your manifest. Focused checks that run in-process, '
    "such as the project's unit and package test commands, remain available."
)


def _denied_segment(tokens: list[str], depth: int) -> bool:
    if depth > MAX_DEPTH:
        return False
    remaining = strip_leading_shell_prefix(tokens)
    if not remaining:
        return False

    executable = os.path.basename(remaining[0])
    arguments = remaining[1:]

    if executable in CONTAINER_EXECUTABLES:
        return True

    if executable in SHELLS:
        payload = shell_payload(arguments)
        return payload is not None and has_container_command(payload, depth + 1)

    if executable in TRANSPARENT_WRAPPERS:
        wrapped = after_options(
            arguments,
            options_with_values=WRAPPER_OPTIONS_WITH_VALUES,
        )
        wrapped = wrapped[WRAPPER_LEADING_OPERANDS.get(executable, 0) :]
        return bool(wrapped) and _denied_segment(wrapped, depth + 1)

    return False


def has_container_command(command: object, depth: int = 0) -> bool:
    """Return whether a shell command invokes a container or orchestration tool."""
    if not isinstance(command, str) or not command.strip() or depth > MAX_DEPTH:
        return False
    if any(
        has_container_command(substitution, depth + 1)
        for substitution in command_substitutions(command)
    ):
        return True
    return any(
        _denied_segment(segment, depth) for segment in shell_segments(command)
    )


def in_spawned_agent(event: dict[str, object]) -> bool:
    """Return whether the event comes from a spawned agent rather than the root.

    Codex populates `agent_type` from the spawned thread's role and omits it for
    the root session, so its presence is the role boundary this guard enforces.
    """
    agent_type = event.get("agent_type")
    return isinstance(agent_type, str) and bool(agent_type.strip())


def response_for(event: object) -> dict[str, object] | None:
    if not isinstance(event, dict) or not in_spawned_agent(event):
        return None
    tool_input = event.get("tool_input")
    if not isinstance(tool_input, dict):
        return None
    if not has_container_command(tool_input.get("command")):
        return None
    return deny(DENIAL_REASON)


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
