---
name: golang-best-practices
description: Apply module-version-specific Go conventions during implementation or review, not exploration.
---

# Modern Go by Version

Read this skill from the target module's working directory so the accompanying Modern Go
Guidelines list matches that module and Go version. Read through `END_GO_GUIDELINES`; report missing or truncated guidance.
Apply relevant rules even when nearby code uses older idioms. Before skipping a
seemingly relevant rule or when examples are needed, request only its returned IDs
with `skills-mgr run use-modern-go/scripts/run-tool.sh explain <ID> [<ID> ...]`.

## Principles

- No binary or artifact in repo root. Prohibit `go build` without `-o`, defaults `bin/`
- Production build strip symbols: `-ldflags '-s -w'`

## Symbol lookup

Use `gopls` for symbols and references when location is known:
`gopls references path/to/file.go:line:column`

Use text search for literals, generated code, config, or when symbolic lookup
cannot answer question.

## Focused checks

Format changed Go files and use the owning project's relevant tests and lint checks. `go vet`
and `golangci-lint` are available check choices, not a requirement to run both on every edit.
Use `deadcode` for a requested reachability/cleanup investigation and `go fix` (Go 1.26+) for
in-scope modernization, rather than broad cleanup after unrelated work.

## Filesystem copying and tests

On Go 1.23+, check `os.CopyFS` before writing a recursive copier. It creates
directories, copies regular files and symbolic links, preserves source execute
bits, and refuses to overwrite existing files. Read `go doc os.CopyFS` or
`go doc -src os.CopyFS` when permissions, symlink, or overwrite semantics
matter.

Use the real `os` package with `t.TempDir()` by default when tests depend on
filesystem semantics such as renames, permissions, symbolic links, or
notifications. Introduce a filesystem interface only when production supports
multiple implementations or required failures cannot be exercised with the
real filesystem; do not add one solely to make tests in-memory.

## High-value patterns

- Derive operation contexts from the caller so cancellation propagates; never pass a nil context.
- Own process shutdown at the entry point using the `signal` package when graceful shutdown is
  required, rather than creating detached root contexts inside request or library code.

## Conventions

- **Ports:** when porting logic, add at least one
  `Source: rel/path:<start>:<end> <symbol>` comment near ported code.
