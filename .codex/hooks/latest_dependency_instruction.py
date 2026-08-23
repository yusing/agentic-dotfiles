#!/usr/bin/env python3
"""Reject dependency additions that rely on an explicitly supplied version."""

import json
import os
import re
import sys

from hook_response import deny
from shell_command import SHELLS, shell_payload, shell_segments, strip_leading_shell_prefix


PYTHON_EXECUTABLE = re.compile(r"^(?:python|python\d+(?:\.\d+)?)$")
PYTHON_CONSTRAINT = re.compile(r"(?:===|==|~=|!=|<=|>=|<|>)")

INSTRUCTION = (
    "Dependency addition blocked because the command supplied an explicit version. "
    "Do not use a package version recalled from model memory. Query the authoritative "
    "package registry or package-manager metadata now, select the latest stable release "
    "compatible with explicit project and runtime constraints, and retry with an "
    "unversioned package specifier so the package manager resolves the current release. "
    "If the user or project explicitly requires an older version, explain that constraint "
    "instead of bypassing this guard."
)


def _positionals(arguments: list[str]) -> list[str]:
    return [argument for argument in arguments if not argument.startswith("-")]


def _javascript_spec_has_version(spec: str) -> bool:
    if spec.startswith((".", "/", "file:", "git:", "git+", "http:", "https:")):
        return False
    separator = spec.rfind("@")
    if separator <= 0:
        return False
    version = spec[separator + 1 :].lower()
    return version not in {"", "*", "latest", "workspace:*", "workspace:^", "workspace:~"}


def _python_spec_has_version(spec: str) -> bool:
    if spec.startswith((".", "/", "file:", "git+", "http:", "https:")):
        return False
    return PYTHON_CONSTRAINT.search(spec) is not None


def _explicit_version(executable: str, arguments: list[str]) -> bool:
    if executable in {"npm", "pnpm", "bun"}:
        if not arguments or arguments[0] not in {"add", "i", "install"}:
            return False
        return any(
            _javascript_spec_has_version(spec)
            for spec in _positionals(arguments[1:])
        )

    if executable == "yarn":
        return bool(arguments and arguments[0] == "add") and any(
            _javascript_spec_has_version(spec)
            for spec in _positionals(arguments[1:])
        )

    if executable == "deno":
        return bool(arguments and arguments[0] == "add") and any(
            _javascript_spec_has_version(spec)
            for spec in _positionals(arguments[1:])
        )

    if executable in {"pip", "pip3"}:
        return bool(arguments and arguments[0] == "install") and any(
            _python_spec_has_version(spec)
            for spec in _positionals(arguments[1:])
        )

    if PYTHON_EXECUTABLE.fullmatch(executable):
        return (
            len(arguments) >= 2
            and arguments[:2] == ["-m", "pip"]
            and _explicit_version("pip", arguments[2:])
        )

    if executable == "uv":
        if arguments[:2] == ["pip", "install"]:
            specs = arguments[2:]
        elif arguments and arguments[0] == "add":
            specs = arguments[1:]
        else:
            return False
        return any(_python_spec_has_version(spec) for spec in _positionals(specs))

    if executable == "poetry":
        return bool(arguments and arguments[0] == "add") and any(
            _javascript_spec_has_version(spec) or _python_spec_has_version(spec)
            for spec in _positionals(arguments[1:])
        )

    if executable == "pipenv":
        return bool(arguments and arguments[0] == "install") and any(
            _python_spec_has_version(spec)
            for spec in _positionals(arguments[1:])
        )

    if executable == "cargo":
        return bool(arguments and arguments[0] == "add") and (
            any(
                argument in {"--vers", "--version"}
                or argument.startswith(("--vers=", "--version="))
                for argument in arguments[1:]
            )
            or any(
                _javascript_spec_has_version(spec)
                for spec in _positionals(arguments[1:])
            )
        )

    if executable == "go":
        return bool(arguments and arguments[0] in {"get", "install"}) and any(
            _javascript_spec_has_version(spec)
            for spec in _positionals(arguments[1:])
        )

    if executable == "composer":
        return bool(arguments and arguments[0] == "require") and any(
            _javascript_spec_has_version(spec)
            or bool(re.search(r"(?::|\^|~|[<>=])\d", spec))
            for spec in _positionals(arguments[1:])
        )

    if executable in {"bundle", "gem"}:
        subcommand = {"bundle": "add", "gem": "install"}[executable]
        return bool(arguments and arguments[0] == subcommand) and (
            any(
                argument in {"-v", "--version"} or argument.startswith("--version=")
                for argument in arguments[1:]
            )
            or any(
                _javascript_spec_has_version(spec)
                or bool(re.search(r"(?:\^|~|[<>=])\d", spec))
                for spec in _positionals(arguments[1:])
            )
        )

    if executable == "dotnet":
        return arguments[:2] == ["add", "package"] and any(
            argument == "--version" or argument.startswith("--version=")
            for argument in arguments[2:]
        )

    if executable == "luarocks" and arguments and arguments[0] == "install":
        return len(_positionals(arguments[1:])) > 1

    return False


def _segment_has_explicit_dependency_version(tokens: list[str], depth: int) -> bool:
    remaining = strip_leading_shell_prefix(tokens)
    if not remaining:
        return False

    executable = os.path.basename(remaining[0])
    arguments = remaining[1:]
    if executable == "rtk":
        return _segment_has_explicit_dependency_version(arguments, depth)
    if executable in SHELLS:
        payload = shell_payload(arguments)
        return (
            has_explicit_dependency_version(payload, depth + 1)
            if payload is not None
            else False
        )
    return _explicit_version(executable, arguments)


def has_explicit_dependency_version(command: object, depth: int = 0) -> bool:
    """Return whether a shell command adds a dependency with a supplied version."""
    if not isinstance(command, str) or not command.strip() or depth > 4:
        return False
    return any(
        _segment_has_explicit_dependency_version(segment, depth)
        for segment in shell_segments(command)
    )


def response_for(event: object) -> dict[str, object] | None:
    if not isinstance(event, dict):
        return None
    tool_input = event.get("tool_input")
    if not isinstance(tool_input, dict):
        return None
    if not has_explicit_dependency_version(tool_input.get("command")):
        return None
    return deny(INSTRUCTION)


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
