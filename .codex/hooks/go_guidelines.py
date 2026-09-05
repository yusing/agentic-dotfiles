#!/usr/bin/env python3
"""Append modern Go guidance to a Go practices skill read, not to project startup."""

import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import sys

from hook_response import additional_context


def skill_directory(event: dict) -> Path | None:
    if event.get("hook_event_name") != "PostToolUse":
        return None
    result = event.get("tool_response")
    if isinstance(result, dict):
        details = result.get("details") or {}
        if (result.get("is_error") or result.get("exit_code", 0) not in (None, 0)
                or details.get("timedOut")
                or (details.get("async") or {}).get("state") in {"running", "failed"}):
            return None
    tool = event.get("tool_input") or {}
    command = tool.get("command", tool.get("cmd"))
    if not isinstance(command, str):
        return None
    cwd = Path(event.get("cwd") or os.getcwd())
    cwd = cwd / Path(tool.get("workdir") or tool.get("cwd") or ".").expanduser()
    try:
        tokens = shlex.split(command)
    except ValueError:
        return None
    # Support the ordinary standalone read and a literal module-directory prefix.
    # Arbitrary shell scripts cannot establish which skill command actually ran.
    if len(tokens) >= 4 and tokens[0] == "cd" and tokens[2] == "&&":
        if tokens[1].startswith("-") or any(char in tokens[1] for char in "$`*"):
            return None
        cwd = cwd / Path(tokens[1]).expanduser()
        tokens = tokens[3:]
    if tokens and Path(tokens[0]).name == "rtk":
        tokens = tokens[1:]
    if len(tokens) < 3 or Path(tokens[0]).name != "skills-mgr" or tokens[1] != "get":
        return None
    args = [token for token in tokens[2:] if token not in {"--codex", "--claude", "--grok"}]
    if args not in (["golang-best-practices"], ["golang-best-practices/SKILL.md"]):
        return None
    return cwd.resolve()


def guidance(directory: Path) -> str:
    manifest = next((p / "go.mod" for p in (directory, *directory.parents)
                     if (p / "go.mod").is_file()), None)
    if manifest is None:
        raise ValueError("no owning go.mod; invoke the skill from the target module")
    match = re.search(r"^\s*go[ \t]+(\d+\.\d+(?:\.\d+)?)[ \t]*(?://[^\n]*)?$",
                      manifest.read_text(), re.M)
    if match is None:
        raise ValueError("the owning go.mod has no valid go directive")
    version = match[1]
    provider = subprocess.run(
        ["skills-mgr", "get", "use-modern-go/scripts/VERSION"], cwd=directory,
        capture_output=True, text=True, check=True, timeout=3,
    ).stdout.strip()
    if not re.fullmatch(r"v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?", provider):
        raise ValueError("invalid guidelines provider version")
    # The upstream run-tool.sh owns this cache layout and installs on a miss.
    # Invoke only its already-installed binary so reading a skill cannot install.
    cache = Path(os.environ.get("XDG_CACHE_HOME") or Path.home() / ".cache")
    binary = cache / "go-modern-guidelines" / provider / "go-modern-guidelines"
    if not binary.is_file() or not os.access(binary, os.X_OK):
        raise ValueError(f"Modern Go Guidelines {provider} is missing; ask before installing")
    body = subprocess.run(
        [str(binary), "list", "--go-version", version], cwd=directory,
        capture_output=True, text=True, check=True, timeout=5,
    ).stdout.strip()
    if not body:
        raise ValueError("the guidelines provider returned an empty list")
    digest = hashlib.sha256(body.encode()).hexdigest()
    return (f"Modern Go Guidelines {provider}: {manifest} (Go {version})\n"
            f"{body}\nEND_GO_GUIDELINES sha256={digest}")


def main() -> None:
    event = json.load(sys.stdin)
    directory = skill_directory(event)
    if directory is None:
        return
    try:
        body = guidance(directory)
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        body = f"Go guidelines unavailable: {error}. Report this blocker before Go work."
    print(json.dumps(additional_context(body, event_name="PostToolUse")))


if __name__ == "__main__":
    main()
