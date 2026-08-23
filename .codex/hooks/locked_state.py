#!/usr/bin/env python3
"""Exclusive directory locks and private-directory helpers for hook state."""

from __future__ import annotations

import fcntl
import os
from collections.abc import Iterator
from contextlib import ExitStack, contextmanager
from pathlib import Path


def ensure_private_dir(path: Path) -> None:
    """Create ``path`` if needed and force mode ``0o700``."""
    path.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(path, 0o700)


@contextmanager
def locked_dir(path: Path, *, create: bool = True) -> Iterator[Path]:
    """Exclusively lock ``path/.lock`` and yield ``path``.

    When ``create`` is true, the directory is created with mode ``0o700`` first.
    Raises ``OSError`` (including ``FileNotFoundError`` when ``create`` is false
    and the directory is missing) if the lock cannot be established.
    """
    if create:
        ensure_private_dir(path)
    descriptor = os.open(path / ".lock", os.O_CREAT | os.O_RDWR, 0o600)
    try:
        fcntl.flock(descriptor, fcntl.LOCK_EX)
        yield path
    finally:
        try:
            fcntl.flock(descriptor, fcntl.LOCK_UN)
        except OSError:
            pass
        os.close(descriptor)


@contextmanager
def try_locked_dir(
    path: Path | None,
    *,
    create: bool = True,
) -> Iterator[Path | None]:
    """Like ``locked_dir``, but yields ``None`` when locking is unavailable.

    Callers that already treat missing sessions or I/O failures as a soft miss
    should use this form. Prefer ``locked_dir`` when the exact ``OSError``
    subtype matters (for example distinguishing missing state from hard fail).
    """
    if path is None:
        yield None
        return
    with ExitStack() as stack:
        try:
            locked = stack.enter_context(locked_dir(path, create=create))
        except OSError:
            yield None
            return
        yield locked


@contextmanager
def locked_file_descriptor(
    path: Path,
    flags: int,
    *,
    mode: int = 0o600,
    create_parent: bool = False,
) -> Iterator[int]:
    """Open ``path`` and hold an exclusive flock for the duration of the block.

    Raises ``OSError`` when the file cannot be opened or locked.
    """
    if create_parent:
        ensure_private_dir(path.parent)
    descriptor = os.open(path, flags, mode)
    try:
        fcntl.flock(descriptor, fcntl.LOCK_EX)
        yield descriptor
    finally:
        try:
            fcntl.flock(descriptor, fcntl.LOCK_UN)
        except OSError:
            pass
        os.close(descriptor)
