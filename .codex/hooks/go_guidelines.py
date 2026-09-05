#!/usr/bin/env python3
"""Resolve module-scoped Go guidance without installing tools during a hook."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from generated_code_guard import target_paths
from hook_response import additional_context
from locked_state import ensure_private_dir
from session_scope import agent_digest, digest, session_state_dir
from shell_command import shell_segments, strip_leading_shell_prefix


PROVIDER = "use-modern-go/scripts/"
# Leave room for check_project's ordinary detection inside its 10-second hook.
GUIDANCE_TIMEOUT = 6
GO_DIRECTIVE = re.compile(r"^[ \t]*go[ \t]+(\d+\.\d+(?:\.\d+)?)[ \t]*(?://[^\n]*)?$", re.M)
CLI_VERSION = re.compile(r"v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?")


def module_version(directory: Path) -> tuple[Path | None, str | None]:
    """A workspace/toolchain version is not a member module's language version."""
    for parent in (directory, *directory.parents):
        manifest = parent / "go.mod"
        if manifest.is_file():
            match = GO_DIRECTIVE.search(manifest.read_text(encoding="utf-8"))
            return manifest, match[1] if match else None
    return None, None


def cache_root() -> Path:
    return Path(os.environ.get("XDG_CACHE_HOME") or Path.home() / ".cache")


def atomic_write(path: Path, body: str) -> None:
    ensure_private_dir(path.parent)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent,
                                         prefix=".tmp-", delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(body)
        temporary.replace(path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def guideline_list(manifest: Path, version: str, deadline: float) -> tuple[str, str]:
    def run(command: list[str]) -> str:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise subprocess.TimeoutExpired(command, GUIDANCE_TIMEOUT)
        result = subprocess.run(command, cwd=manifest.parent, capture_output=True,
                                text=True, timeout=remaining,
                                check=False)
        if result.returncode or not result.stdout.strip():
            raise RuntimeError("the guidelines provider returned no usable result")
        return result.stdout.strip()

    manager = shutil.which("skills-mgr")
    if manager is None:
        raise RuntimeError("skills-mgr is unavailable")
    cli_version = run([manager, "get", PROVIDER + "VERSION"])
    if not CLI_VERSION.fullmatch(cli_version):
        raise RuntimeError("the guidelines provider returned an invalid CLI version")

    # run-tool.sh owns this versioned cache layout and installs on a cache miss.
    # Run its already-installed binary directly so a startup hook cannot install.
    binary = cache_root() / "go-modern-guidelines" / cli_version / "go-modern-guidelines"
    if not binary.is_file() or not os.access(binary, os.X_OK):
        raise RuntimeError(f"Modern Go Guidelines {cli_version} is not installed; ask before installing it")

    cached = cache_root() / "codex" / "go-guidelines" / "lists" / (digest(cli_version, version) + ".txt")
    try:
        body = cached.read_text(encoding="utf-8")
        if body.strip():
            return cli_version, body
    except OSError:
        pass
    if run([str(binary), "--version"]) != cli_version:
        raise RuntimeError("the installed guidelines CLI does not match the provider version")
    body = run([str(binary), "list", "--go-version", version])
    try:
        atomic_write(cached, body)
    except OSError:
        # A read-only cache must not prevent delivering a successfully generated list.
        pass
    return cli_version, body


def report(directory: Path, languages: str, deadline: float) -> tuple[str, bool]:
    try:
        manifest, version = module_version(directory)
    except (OSError, UnicodeError):
        manifest, version = None, None
        unreadable = True
        error = "the owning go.mod could not be read"
    else:
        unreadable = False
        error = "select the target module and resolve its go directive; the installed toolchain is not a substitute"

    fields = [f"go_version: {version or 'unknown'}",
              "go_module: " + json.dumps(str(manifest) if manifest else None)]
    relevant = unreadable or manifest is not None or "go" in languages.split(",") or (directory / "go.work").is_file()
    status = "not-applicable"
    body = ""
    if version is None:
        if relevant:
            status = "unavailable" if unreadable else "unresolved"
            body = f"Go guidance is not loaded: {error}. Hooks update guidance automatically as the target becomes known."
    else:
        try:
            cli_version, guidelines = guideline_list(manifest, version, deadline)
        except subprocess.TimeoutExpired:
            status = "unavailable"
            body = "Go guidance is not loaded: the provider timed out. Hooks retry automatically; report a persistent blocker before Go work."
        except (OSError, UnicodeError, RuntimeError) as exc:
            status = "unavailable"
            body = f"Go guidance is not loaded: {exc}. Hooks retry automatically; report a persistent blocker before Go work."
        else:
            status = "ready"
            body = (
                f"Modern Go Guidelines {cli_version}, scoped to {manifest} (Go {version}).\n"
                "For Go writing, refactoring, review, or testing, the only initial skill read is "
                "`skills-mgr get golang-best-practices`. use-modern-go is the CLI backend; its list is already supplied here.\n"
                "Read the complete list below, newest first. Apply relevant guidelines even when nearby code uses older idioms. "
                "Skip only when a rule would not compile, would change behavior, or does not fit the edited code.\n"
                "Before skipping a seemingly relevant rule, or when examples are needed, request only its returned IDs with "
                "`skills-mgr run use-modern-go/scripts/run-tool.sh explain <ID> [<ID> ...]`.\n\n"
                + guidelines
            )
    fields.append("go_guidelines_status: " + status)
    if body:
        fields.append("go_guidelines: |\n" + "\n".join("  " + line for line in body.splitlines()))
    return "\n".join(fields) + "\n", status != "unavailable"


def target_directories(event: dict, cwd: Path) -> tuple[Path, ...]:
    """Use paths already carried by normal tool calls, not an agent refresh call."""
    tool_input = event.get("tool_input")
    if isinstance(tool_input, dict):
        for field in ("workdir", "cwd"):
            value = tool_input.get(field)
            if isinstance(value, str) and value:
                cwd = (cwd / Path(value).expanduser()).resolve()
                break
    paths = target_paths(dict(event, cwd=str(cwd)))
    directories = [path.parent for path in paths
                   if path.suffix == ".go" or path.name in {"go.mod", "go.work"}]
    if isinstance(tool_input, dict):
        for field in ("command", "cmd"):
            command = tool_input.get(field)
            if not isinstance(command, str):
                continue
            shell_cwd = cwd
            for segment in shell_segments(command):
                tokens = strip_leading_shell_prefix(segment)
                if len(tokens) >= 2 and tokens[0] == "cd":
                    destination = tokens[-1]
                    if not destination.startswith("-"):
                        shell_cwd = (shell_cwd / Path(destination).expanduser()).resolve()
                        directories.append(shell_cwd)
                    continue
                for token in tokens:
                    try:
                        path = shell_cwd / Path(token).expanduser()
                        if path.suffix == ".go" or path.name in {"go.mod", "go.work"}:
                            directories.append(path.parent)
                        elif path.is_dir():
                            directories.append(path)
                    except (OSError, RuntimeError, ValueError):
                        # Shell arguments can be code or expressions, not paths.
                        continue
    # Many inspected files or patch targets can belong to one module. Resolve
    # those before invoking the provider so they share one request and budget.
    modules: dict[Path, None] = {}
    for directory in directories or [cwd]:
        directory = directory.resolve()
        try:
            manifest, _ = module_version(directory)
        except (OSError, UnicodeError):
            manifest = None
        modules[manifest.parent if manifest else directory] = None
    return tuple(modules)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", nargs="?")
    parser.add_argument("--languages", default="none")
    parser.add_argument("--refresh", action="store_true", help="inject only when the module guidance changes")
    args = parser.parse_args()
    event = {}
    if not sys.stdin.isatty():
        try:
            value = json.load(sys.stdin)
            if isinstance(value, dict):
                event = value
        except (ValueError, OSError):
            pass
    directory = Path(args.directory or event.get("cwd") or os.getcwd()).resolve()
    directories = target_directories(event, directory) if args.refresh else (directory,)
    deadline = time.monotonic() + GUIDANCE_TIMEOUT
    reports = [report(target, args.languages, deadline) for target in directories]
    body = "\n".join(dict.fromkeys(body for body, _ in reports))
    reusable = all(reusable for _, reusable in reports)
    state_dir = session_state_dir(event, cache_root() / "codex" / "go-guidelines" / "contexts")
    state = state_dir / (agent_digest(event) or "root") if state_dir else None
    fingerprint = digest(body)
    if args.refresh and state is not None:
        try:
            if reusable and state.read_text(encoding="utf-8") == fingerprint:
                return 0
        except OSError:
            pass
    if args.refresh:
        event_name = event.get("hook_event_name", "UserPromptSubmit")
        print(json.dumps(additional_context(body, event_name=event_name)))
    else:
        print(body, end="")
    # Delivery state describes the latest context, including a failure. Otherwise
    # recovery to an earlier ready report would be mistaken for an unchanged one.
    if state is not None:
        try:
            atomic_write(state, fingerprint)
        except OSError:
            pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
