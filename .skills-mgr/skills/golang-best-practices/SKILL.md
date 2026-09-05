---
name: golang-best-practices
description: Apply Go build, testing, lookup, and coding practices when writing, refactoring, reviewing, or testing Go; skip exploration.
---

# Go Practices

## Module guidance

The hooks automatically supply and update `go_guidelines` for the target module
and Go version. Use the matching `ready` block for version-specific idioms.
If guidance remains unavailable when needed, report the blocker. Ask before
installing a missing CLI; the hooks deliberately do not install tools.

## Principles

- No binary or artifact in repo root. Prohibit `go build` without `-o`, defaults `bin/`
- Production build strip symbols: `-ldflags '-s -w'`
- Use modern features and syntax

## Symbol lookup

Use `gopls` for symbols and references when location is known:
`gopls references path/to/file.go:line:column`

Use text search for literals, generated code, config, or when symbolic lookup
cannot answer question.

## Codebase cleanup

Defer clean up after work done.

- `gofmt -w`: format go files
- `deadcode [flags] package...`: scan deadcode
- `go fix [flags] package...` (1.26+): modernize code

## Linting

- `go vet [flags] package...`
- `golangci-lint run`

## Additional version-specific APIs

The injected CLI list owns its covered idioms. Also consider these APIs when
they fit the edited code:

<!-- markdownlint-disable MD013 -->

| Go | Prefer |
| --- | --- |
| 1.23+ | range-over-function; `os.CopyFS`; `unique.Make` |
| 1.24+ | `b.Context()`; `strings`/`bytes` `Lines`; generic aliases; `os.Root`; `runtime.AddCleanup`; `weak` |
| 1.25+ | stable `testing/synctest` |
| 1.26+ | reflect type/value iterator methods |

<!-- markdownlint-enable MD013 -->

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

- Create root context with `signal` package and handle graceful shutdown
- Never use nil context or `context.Background`

## Conventions

- **Ports:** when porting logic, add at least one
  `Source: rel/path:<start>:<end> <symbol>` comment near ported code.
