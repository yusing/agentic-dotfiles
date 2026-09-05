#!/usr/bin/env python3
"""Reject direct mutations of generated Go files."""

import json
import re
import sys
from pathlib import Path

from hook_response import deny


MARKERS = ("Code generated", "DO NOT EDIT")
REJECTION_REASON = (
    "Generated artifact mutation not allowed. Edit the authoritative source this file "
    "is generated from, then rerun its generator. Do not edit the generated output."
)
PATCH_FILE = re.compile(
    r"^\*\*\* (?P<operation>Add|Delete|Update) File: (?P<path>[^\r\n]+)$",
    re.MULTILINE,
)
PATCH_SECTION = re.compile(
    r"^\*\*\* (?P<operation>Add|Delete|Update) File: (?P<path>[^\r\n]+)\n"
    r"(?P<body>.*?)(?=^\*\*\* (?:Add|Delete|Update) File: |^\*\*\* End Patch)",
    re.MULTILINE | re.DOTALL,
)


def is_generated_go_source(source: str) -> bool:
    """Return whether a pre-package Go comment contains both generated-code markers."""
    index = 0
    in_block_comment = False
    in_double_quote = False
    in_raw_string = False
    in_rune = False
    escaped = False

    while index < len(source):
        character = source[index]
        following = source[index + 1] if index + 1 < len(source) else ""

        if in_block_comment:
            end = source.find("*/", index)
            comment_end = len(source) if end < 0 else end
            if all(marker in source[index:comment_end] for marker in MARKERS):
                return True
            if end < 0:
                return False
            in_block_comment = False
            index = end + 2
            continue

        if in_double_quote or in_rune:
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif (in_double_quote and character == '"') or (in_rune and character == "'"):
                in_double_quote = False
                in_rune = False
            index += 1
            continue

        if in_raw_string:
            if character == "`":
                in_raw_string = False
            index += 1
            continue

        if character == "/" and following == "/":
            end = source.find("\n", index + 2)
            comment_end = len(source) if end < 0 else end
            comment = source[index + 2 : comment_end]
            if all(marker in comment for marker in MARKERS):
                return True
            index = comment_end
            continue
        if character == "/" and following == "*":
            in_block_comment = True
            index += 2
            continue
        if character.isalpha() or character == "_":
            end = index + 1
            while end < len(source) and (source[end].isalnum() or source[end] == "_"):
                end += 1
            if source[index:end] == "package":
                return False
            index = end
            continue

        if character == '"':
            in_double_quote = True
        elif character == "'":
            in_rune = True
        elif character == "`":
            in_raw_string = True
        index += 1

    return False


def is_generated_go_file(path: Path) -> bool:
    """Return whether path is an existing Go file with a generated-code marker."""
    if path.suffix != ".go" or not path.is_file():
        return False
    try:
        source = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return False
    return is_generated_go_source(source)


def _resolve_path(raw_path: str, cwd: Path) -> Path:
    path = Path(raw_path).expanduser()
    if not path.is_absolute():
        path = cwd / path
    return path.resolve(strict=False)


def target_paths(event: dict[str, object]) -> tuple[Path, ...]:
    """Resolve explicit file and patch targets for Go mutation and guidance hooks."""
    tool_input = event.get("tool_input")
    if not isinstance(tool_input, dict):
        return ()

    raw_paths: list[str] = []
    for key in ("file_path", "path"):
        value = tool_input.get(key)
        if isinstance(value, str) and value:
            raw_paths.append(value)

    for key in ("command", "patch", "input"):
        value = tool_input.get(key)
        if isinstance(value, str):
            raw_paths.extend(
                match.group("path").strip() for match in PATCH_FILE.finditer(value)
            )

    cwd_value = event.get("cwd")
    cwd = Path(cwd_value) if isinstance(cwd_value, str) and cwd_value else Path.cwd()
    paths: list[Path] = []
    seen: set[Path] = set()
    for raw_path in raw_paths:
        path = _resolve_path(raw_path, cwd)
        if path not in seen:
            paths.append(path)
            seen.add(path)
    return tuple(paths)


def _added_lines(body: str) -> list[str]:
    return [line[1:] for line in body.splitlines() if line.startswith("+")]


def _replace_hunk(source: list[str], hunk: str) -> list[str] | None:
    before: list[str] = []
    after: list[str] = []
    for line in hunk.splitlines():
        if not line:
            continue
        if line.startswith("+"):
            after.append(line[1:])
        elif line.startswith("-"):
            before.append(line[1:])
        elif line.startswith(" "):
            before.append(line[1:])
            after.append(line[1:])
        elif line != r"\ No newline at end of file":
            before.append(line)
            after.append(line)

    if not before:
        return None
    limit = len(source) - len(before) + 1
    for index in range(max(limit, 0)):
        if source[index : index + len(before)] == before:
            return source[:index] + after + source[index + len(before) :]
    return None


def _updated_source(path: Path, body: str) -> str | None:
    try:
        existing = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None

    source = existing.splitlines()
    hunks = re.split(r"^@@[^\r\n]*\r?$", body, flags=re.MULTILINE)[1:]
    if not hunks:
        return None
    for hunk in hunks:
        hunk = re.split(r"^\*\*\* Move to: ", hunk, maxsplit=1, flags=re.MULTILINE)[0]
        updated = _replace_hunk(source, hunk)
        if updated is None:
            return None
        source = updated
    trailing_newline = "\n" if existing.endswith("\n") else ""
    return "\n".join(source) + trailing_newline


def _patch_sources(patch: str, cwd: Path) -> tuple[tuple[Path, str], ...]:
    proposed: list[tuple[Path, str]] = []
    for match in PATCH_SECTION.finditer(patch):
        operation = match.group("operation")
        if operation == "Delete":
            continue
        path = _resolve_path(match.group("path").strip(), cwd)
        body = match.group("body")
        source = _updated_source(path, body) if operation == "Update" else None
        if source is None:
            additions = _added_lines(body)
            if not additions:
                continue
            source = "\n".join(additions)
        proposed.append((path, source))
    return tuple(proposed)


def _proposed_sources(event: dict[str, object]) -> tuple[tuple[Path, str], ...]:
    tool_input = event.get("tool_input")
    if not isinstance(tool_input, dict):
        return ()

    cwd_value = event.get("cwd")
    cwd = Path(cwd_value) if isinstance(cwd_value, str) and cwd_value else Path.cwd()
    proposed: list[tuple[Path, str]] = []
    direct_paths = target_paths(event)

    content = tool_input.get("content")
    if isinstance(content, str):
        proposed.extend((path, content) for path in direct_paths)

    new_string = tool_input.get("new_string")
    if isinstance(new_string, str):
        old_string = tool_input.get("old_string")
        replace_all = tool_input.get("replace_all") is True
        for path in direct_paths:
            try:
                existing = path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                proposed.append((path, new_string))
                continue
            if isinstance(old_string, str) and old_string in existing:
                count = -1 if replace_all else 1
                proposed.append((path, existing.replace(old_string, new_string, count)))
            else:
                proposed.append((path, new_string))

    for key in ("command", "patch", "input"):
        patch = tool_input.get(key)
        if isinstance(patch, str):
            proposed.extend(_patch_sources(patch, cwd))
    return tuple(proposed)


def response_for(event: object) -> dict[str, object] | None:
    if not isinstance(event, dict):
        return None
    existing_generated = any(is_generated_go_file(path) for path in target_paths(event))
    proposed_generated = any(
        path.suffix == ".go" and is_generated_go_source(source)
        for path, source in _proposed_sources(event)
    )
    if not existing_generated and not proposed_generated:
        return None
    return deny(REJECTION_REASON)


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
