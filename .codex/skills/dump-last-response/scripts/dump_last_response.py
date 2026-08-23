#!/usr/bin/python3
"""Write the final assistant response preceding this skill's invocation."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import stat
import sys
import tempfile


def fail(message: str) -> "NoReturn":
    print(f"dump-last-response: {message}", file=sys.stderr)
    raise SystemExit(1)


def find_session(thread_id: str, codex_home: Path) -> Path:
    sessions = codex_home / "sessions"
    if not sessions.is_dir():
        fail(f"session directory does not exist: {sessions}")

    matches = sorted(sessions.rglob(f"*{thread_id}*.jsonl"))
    if not matches:
        fail(f"no session found for CODEX_THREAD_ID={thread_id}")
    if len(matches) > 1:
        paths = "\n  ".join(str(path) for path in matches)
        fail(f"multiple sessions found for CODEX_THREAD_ID={thread_id}:\n  {paths}")
    return matches[0]


def response_before_latest_invocation(session: Path) -> str:
    latest: str | None = None
    response: str | None = None
    invocation_found = False

    try:
        with session.open("r", encoding="utf-8") as stream:
            for line_number, line in enumerate(stream, 1):
                try:
                    event = json.loads(line)
                except json.JSONDecodeError as error:
                    fail(f"{session}:{line_number}: invalid JSON: {error}")

                if event.get("type") != "response_item":
                    continue
                payload = event.get("payload")
                if not isinstance(payload, dict):
                    continue
                if payload.get("type") != "message":
                    continue

                content = payload.get("content")
                if not isinstance(content, list):
                    continue

                if payload.get("role") == "user":
                    text = "".join(
                        item["text"]
                        for item in content
                        if isinstance(item, dict)
                        and isinstance(item.get("text"), str)
                    )
                    if text.lstrip().startswith("<skill>") and (
                        "<name>dump-last-response</name>" in text
                    ):
                        invocation_found = True
                        response = latest
                elif (
                    payload.get("role") == "assistant"
                    and payload.get("phase") == "final_answer"
                ):
                    latest = "".join(
                        item["text"]
                        for item in content
                        if isinstance(item, dict)
                        and item.get("type") == "output_text"
                        and isinstance(item.get("text"), str)
                    )
    except OSError as error:
        fail(f"cannot read session {session}: {error}")

    if not invocation_found:
        fail(f"session has no dump-last-response skill invocation: {session}")
    if response is None:
        fail(f"latest dump-last-response invocation has no preceding final_answer: {session}")
    return response


def output_mode(destination: Path) -> int:
    try:
        return stat.S_IMODE(destination.stat().st_mode)
    except FileNotFoundError:
        current_umask = os.umask(0)
        os.umask(current_umask)
        return 0o666 & ~current_umask


def write_atomic(destination: Path, data: bytes, overwrite: bool) -> None:
    if destination.exists() and not overwrite:
        fail(f"destination exists; pass --overwrite to replace it: {destination}")
    if not destination.parent.is_dir():
        fail(f"destination directory does not exist: {destination.parent}")

    mode = output_mode(destination)
    temp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb",
            dir=destination.parent,
            prefix=f".{destination.name}.",
            suffix=".tmp",
            delete=False,
        ) as stream:
            temp_path = Path(stream.name)
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temp_path, mode)

        if not overwrite and destination.exists():
            fail(f"destination appeared during write: {destination}")
        os.replace(temp_path, destination)
        temp_path = None
    except OSError as error:
        fail(f"cannot write {destination}: {error}")
    finally:
        if temp_path is not None:
            try:
                temp_path.unlink()
            except FileNotFoundError:
                pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Dump the final assistant response preceding this skill's invocation."
    )
    parser.add_argument("output", help="destination path, or - for stdout")
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="replace an existing destination",
    )
    parser.add_argument(
        "--session",
        type=Path,
        help="read this session instead of resolving CODEX_THREAD_ID",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.session is None:
        thread_id = os.environ.get("CODEX_THREAD_ID")
        if not thread_id:
            fail("CODEX_THREAD_ID is not set")
        codex_home = Path(
            os.environ.get("CODEX_HOME", str(Path.home() / ".codex"))
        ).expanduser()
        session = find_session(thread_id, codex_home)
    else:
        session = args.session.expanduser()

    response = response_before_latest_invocation(session)
    data = response.encode("utf-8")

    if args.output == "-":
        sys.stdout.buffer.write(data)
        sys.stdout.buffer.flush()
        return

    destination = Path(args.output).expanduser()
    write_atomic(destination, data, args.overwrite)
    print(f"wrote {len(data)} bytes to {destination}", file=sys.stderr)


if __name__ == "__main__":
    main()
