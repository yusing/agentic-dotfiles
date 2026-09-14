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
  Use `go build -o` when producing an executable.
- Prefer `-ldflags '-s -w'` for size-focused production builds when symbols are not needed.
- Use `gopls` for symbol references when the location is known:
  `gopls references path/to/file.go:line:column`.
- When porting logic, retain a `Source: rel/path:<start>:<end>@[<revision>] <symbol>` comment
  near the ported code.

## Filesystem work

Consider `os.CopyFS` before writing a recursive copier. Check its contract with
`go doc os.CopyFS` for the target toolchain when permissions, symlinks, or overwrite
behavior matter.

Prefer the real `os` package with `t.TempDir()` for filesystem tests. A filesystem
interface is useful when production supports multiple implementations or required
failures cannot be exercised with the real filesystem.
