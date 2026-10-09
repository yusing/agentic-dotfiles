---
name: golang-best-practices
description: Apply version-aware Go guidance and local conventions when implementing or reviewing Go-specific behavior.
---

# Modern Go by Version

Use idioms supported by the project's target Go version. When an unresolved idiom or API question
needs version-specific guidance, run
`skills-mgr run use-modern-go/scripts/run-tool.sh list --go-version VERSION`, using the reported
project version. Load only relevant returned IDs for details or examples with
`skills-mgr run use-modern-go/scripts/run-tool.sh explain <ID> [<ID> ...]`.

## Local conventions

- Put emitted build artifacts in the project's output directory, defaulting to `bin/`.
  Specify `-o` when producing an executable.
- Prefer symbol-stripped build for size-focused production builds when symbols are not needed.
- When porting logic, retain a `Source: rel/path:<start>:<end>@[<revision>] <symbol>` comment
  near the ported code.

## Filesystem work

Consider `os.CopyFS` before writing a recursive copier. Check its contract with
`go doc os.CopyFS` for the target toolchain when permissions, symlinks, or overwrite
behavior matter.

Prefer the real `os` package with `t.TempDir()` for filesystem tests. A filesystem
interface is useful when production supports multiple implementations or required
failures cannot be exercised with the real filesystem.
