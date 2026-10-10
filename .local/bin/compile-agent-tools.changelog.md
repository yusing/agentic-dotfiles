# Changelog

## 1.2.0

Keep image-managed Linux hooks linked to the active runtime after Git updates.
Source compilation remains available for image builds and macOS.

## 1.1.0

Keep a content-keyed compiled build engine current, then use it to rebuild missing,
non-executable, or changed user-owned binaries without replacing working outputs
after failures. Find setup-managed compilers when either Bun or scriptc is absent
from the caller's PATH, preserving caller-selected tool precedence.

## 1.0.4

Build the fork-aware session context hook.

## 1.0.3

Compile the active hook set.

## 1.0.2

Install locked parser dependencies and compile the home-path rewrite helper.

## 1.0.1

Pass `--ffi .codex/hooks/lib/flock.ffi.json` only when the hook source
imports `locked_state.ts`.

## 1.0.0

Initial versioned compile helper for user-owned hook and helper binaries.
