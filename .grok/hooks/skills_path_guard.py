#!/usr/bin/env python3
"""Block Grok tool uses that search skills paths or broadly search for them.

Grok-only policy: do not discover or search skill trees under the home
directory. Reading a named skill file is allowed. Use skills-mgr to list
and fetch unknown skills.
"""

from __future__ import annotations

import json
import os
import re
import shlex
import sys
from pathlib import Path


DENIAL_REASON = (
    "Blocked search of /home/$USER/*/skills or a broad search rooted at "
    "/home/$USER or an agent-client directory. Read a known skill file "
    "directly, or use `skills-mgr get <skill>` and "
    "`skills-mgr run <skill>/...`. Do not search or list skill trees."
)
READ_TOOL_NAMES = {"read", "readfile"}
SEARCH_TOOL_NAMES = {"glob", "grep", "search"}
SHELL_TOOL_NAMES = {"bash", "execute", "runterminalcommand"}
READ_COMMANDS = {"bat", "cat", "head", "less", "more", "nl", "tail"}
SEARCH_COMMANDS = {"fd", "fdfind", "find", "grep", "rg"}
AGENT_CLIENT_DIRS = {".agents", ".claude", ".codex", ".grok"}


def username() -> str:
    return (
        os.environ.get("USER")
        or os.environ.get("LOGNAME")
        or Path.home().name
    )


def skills_path_pattern(user: str | None = None) -> re.Pattern[str]:
    """Match /home/<user>/<one-segment>/skills and paths under it."""
    name = user if user is not None else username()
    return re.compile(rf"/home/{re.escape(name)}/[^/]+/skills(?:/|\b)")


def contains_skills_path(text: str, *, user: str | None = None) -> bool:
    return skills_path_pattern(user).search(text) is not None


def _normalized_tool_name(event: dict) -> str:
    name = event.get("toolName", event.get("tool_name", ""))
    if not isinstance(name, str):
        return ""
    return re.sub(r"[^a-z]", "", name.lower())


def _is_broad_search_root(text: str, *, user: str | None = None) -> bool:
    name = user if user is not None else username()
    home = f"/home/{name}"
    expanded = re.sub(r"^(?:\$HOME|\$\{HOME\}|~)(?=/|$)", home, text.strip())
    candidate = expanded.rstrip("/")
    return candidate == home or candidate in {
        f"{home}/{directory}" for directory in AGENT_CLIENT_DIRS
    }


def _segment_forbids_skills(segment: list[str], *, user: str | None = None) -> bool:
    executable = os.path.basename(segment[0])
    arguments = segment[1:]
    if executable in SEARCH_COMMANDS:
        return any(
            _is_broad_search_root(argument, user=user)
            or contains_skills_path(argument, user=user)
            for argument in arguments
        )
    if executable in READ_COMMANDS:
        return False
    return any(contains_skills_path(text, user=user) for text in segment)


def _shell_forbids_skills(command: str, *, user: str | None = None) -> bool:
    try:
        lexer = shlex.shlex(command, posix=True, punctuation_chars=";&|()")
        lexer.whitespace_split = True
        lexer.commenters = ""
        tokens = list(lexer)
    except ValueError:
        return False

    segment: list[str] = []
    for token in (*tokens, ";"):
        if token and all(character in ";&|()" for character in token):
            if segment and _segment_forbids_skills(segment, user=user):
                return True
            segment = []
            continue
        segment.append(token)
    return False


def _iter_strings(value: object):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for item in value.values():
            yield from _iter_strings(item)
    elif isinstance(value, (list, tuple)):
        for item in value:
            yield from _iter_strings(item)


def event_targets_skills_path(event: dict, *, user: str | None = None) -> bool:
    tool_input = event.get("toolInput", event.get("tool_input", {}))
    strings = tuple(_iter_strings(tool_input))
    pattern = skills_path_pattern(user)
    has_skills_path = any(pattern.search(text) for text in strings)

    tool_name = _normalized_tool_name(event)
    if tool_name in READ_TOOL_NAMES:
        return False
    if tool_name in SEARCH_TOOL_NAMES:
        return has_skills_path or any(
            _is_broad_search_root(text, user=user) for text in strings
        )
    if tool_name in SHELL_TOOL_NAMES:
        return any(_shell_forbids_skills(text, user=user) for text in strings)
    return has_skills_path


def main() -> int:
    try:
        event = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0
    if not isinstance(event, dict):
        return 0
    if event_targets_skills_path(event):
        json.dump({"decision": "deny", "reason": DENIAL_REASON}, sys.stdout)
        sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
