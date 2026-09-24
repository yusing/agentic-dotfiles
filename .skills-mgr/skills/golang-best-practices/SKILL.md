---
name: golang-best-practices
description: Apply version-aware Go guidance and local conventions during implementation or review. Read together with `skills-mgr run use-modern-go/scripts/run-tool.sh list --go-version VERSION`, using the Go version reported.
---

# Modern Go by Version

Use idioms supported by the project's target Go version. Request details or examples
for relevant returned IDs with
`skills-mgr run use-modern-go/scripts/run-tool.sh explain <ID> [<ID> ...]`.

## Local conventions

- Put emitted build artifacts in the project's output directory, defaulting to `bin/`.
  Specify `-o` when producing an executable.
- Prefer symbol-stripped build for size-focused production builds when symbols are not needed.
- Use symbol lookup when the location is known.
- When porting logic, retain a `Source: rel/path:<start>:<end>@[<revision>] <symbol>` comment
  near the ported code.
- After Go implementation or refactoring:
  * use `go fix` to modernize the code (go >= 1.26).
  * run `golangcilint` and `deadcode` when the tools are available. Inspect findings before removing code.

## Filesystem work

Consider `os.CopyFS` before writing a recursive copier. Check its contract with
`go doc os.CopyFS` for the target toolchain when permissions, symlinks, or overwrite
behavior matter.

Prefer the real `os` package with `t.TempDir()` for filesystem tests. A filesystem
interface is useful when production supports multiple implementations or required
failures cannot be exercised with the real filesystem.
