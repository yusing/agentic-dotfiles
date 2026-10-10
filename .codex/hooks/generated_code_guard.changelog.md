# Changelog

## 1.0.3

Stop as soon as an existing generated-Go target requires denial. Skip non-Go
proposal processing and Go scans without both marker strings. Avoid reconstructing
patches that cannot supply both markers, use a plain split for LF-only files,
and avoid per-candidate hunk allocations.

## 1.0.2

Run `main` only when this process is the guard binary, so the Grok
adapter can import `responseFor` in-process.

## 1.0.1

Parse apply-patch headers line by line. scriptc aborts global `RegExp.exec`
loops, which fail-opened generated-Go patch edits.

## 1.0.0

Initial scriptc-compiled TypeScript release of the generated-Go mutation guard.
