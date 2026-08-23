#!/usr/bin/env python3
"""Shared shell tokenization helpers for Codex command-inspecting hooks."""

from __future__ import annotations

import re
import shlex

SHELLS = frozenset({"bash", "dash", "sh", "zsh"})
COMMAND_PREFIXES = frozenset({"!", "do", "elif", "exec", "if", "then"})
ASSIGNMENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")
SEPARATORS = frozenset(";&|(){}\n")


def is_separator_token(token: str) -> bool:
    """Return whether token is composed only of shell control separators."""
    return bool(token) and all(character in SEPARATORS for character in token)


def shell_tokens(command: str) -> list[str]:
    """Return shell tokens while respecting quoting.

    Malformed quoting yields an empty token list so callers fail closed.
    """
    lexer = shlex.shlex(command, posix=True, punctuation_chars=";&|(){}\n")
    lexer.whitespace = " \t\r"
    lexer.whitespace_split = True
    try:
        return list(lexer)
    except ValueError:
        return []


def shell_segments(command: str) -> list[list[str]]:
    """Return simple command segments while respecting shell quoting."""
    segments: list[list[str]] = []
    segment: list[str] = []
    for token in shell_tokens(command):
        if is_separator_token(token):
            if segment:
                segments.append(segment)
                segment = []
        else:
            segment.append(token)
    if segment:
        segments.append(segment)
    return segments


def shell_payload(arguments: list[str]) -> str | None:
    """Return the script string after a shell ``-c`` option, if present."""
    for index, argument in enumerate(arguments):
        is_command_option = argument == "-c" or (
            argument.startswith("-")
            and not argument.startswith("--")
            and "c" in argument[1:]
        )
        if is_command_option:
            return arguments[index + 1] if index + 1 < len(arguments) else None
    return None


def strip_leading_shell_prefix(tokens: list[str]) -> list[str]:
    """Drop leading assignments and shell control prefixes from a segment."""
    index = 0
    while index < len(tokens) and (
        ASSIGNMENT.match(tokens[index]) or tokens[index] in COMMAND_PREFIXES
    ):
        index += 1
    return tokens[index:]


def _parenthesized_substitution(command: str, start: int) -> tuple[str, int] | None:
    depth = 1
    quote: str | None = None
    index = start
    while index < len(command):
        character = command[index]
        if quote == "'":
            if character == "'":
                quote = None
            index += 1
            continue
        if quote == '"':
            if character == "\\":
                index += 2
                continue
            if character == '"':
                quote = None
                index += 1
                continue
            if (
                character == "$"
                and index + 1 < len(command)
                and command[index + 1] == "("
            ):
                nested = _parenthesized_substitution(command, index + 2)
                if nested is None:
                    return None
                _, index = nested
                continue
            index += 1
            continue
        if character == "\\":
            index += 2
            continue
        if character in {"'", '"'}:
            quote = character
            index += 1
            continue
        if (
            character == "$"
            and index + 1 < len(command)
            and command[index + 1] == "("
        ):
            nested = _parenthesized_substitution(command, index + 2)
            if nested is None:
                return None
            _, index = nested
            continue
        if character == "(":
            depth += 1
        elif character == ")":
            depth -= 1
            if depth == 0:
                return command[start:index], index + 1
        index += 1
    return None


def command_substitutions(command: str) -> tuple[str, ...]:
    """Return the nested commands of every ``$(...)`` and backtick substitution.

    Tokenization alone cannot reach these payloads, so a hook that inspects
    executables must scan them separately to treat both spellings alike.
    """
    substitutions: list[str] = []
    quote: str | None = None
    index = 0
    while index < len(command):
        character = command[index]
        if quote == "'":
            if character == "'":
                quote = None
            index += 1
            continue
        if character == "\\":
            index += 2
            continue
        if character == "'":
            if quote is None:
                quote = "'"
            index += 1
            continue
        if character == '"':
            quote = None if quote == '"' else '"'
            index += 1
            continue
        if (
            character == "$"
            and index + 1 < len(command)
            and command[index + 1] == "("
        ):
            extracted = _parenthesized_substitution(command, index + 2)
            if extracted is None:
                index += 2
                continue
            payload, index = extracted
            substitutions.append(payload)
            continue
        if character == "`":
            end = index + 1
            while end < len(command):
                if command[end] == "\\":
                    end += 2
                    continue
                if command[end] == "`":
                    substitutions.append(command[index + 1 : end])
                    index = end + 1
                    break
                end += 1
            else:
                index += 1
            continue
        index += 1
    return tuple(substitutions)


def after_options(
    arguments: list[str],
    *,
    options_with_values: frozenset[str] = frozenset(),
) -> list[str]:
    """Return arguments after leading option flags, stopping at operands."""
    index = 0
    while index < len(arguments):
        argument = arguments[index]
        if argument == "--":
            return arguments[index + 1 :]
        if not argument.startswith("-") or argument == "-":
            return arguments[index:]
        option = argument.partition("=")[0]
        if option in options_with_values and "=" not in argument:
            index += 2
        else:
            index += 1
    return []
