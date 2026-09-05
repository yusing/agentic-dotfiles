---
name: golang-best-practices
description: Apply Go practices when writing, refactoring, reviewing, or testing Go; skip exploration. Read from the target module's working directory to receive its modern Go guidelines in the same tool result.
---

# Modern Go by Version

The accompanying Modern Go Guidelines list must match the target module and Go
version. Read through `END_GO_GUIDELINES`; report missing or truncated guidance.
Apply relevant rules even when nearby code uses older idioms. Before skipping a
seemingly relevant rule or when examples are needed, request only its returned IDs
with `skills-mgr run use-modern-go/scripts/run-tool.sh explain <ID> [<ID> ...]`.

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

## Feature cutoffs

<!-- markdownlint-disable MD013 -->

| Go | Prefer |
| --- | --- |
| 1.0+ | `time.Since(t)` over `time.Now().Sub(t)` |
| 1.8+ | `time.Until(deadline)` over `deadline.Sub(time.Now())` |
| 1.13+ | `errors.Is` for wrapped errors |
| 1.18+ | `any`; `bytes.Cut`; `strings.Cut` |
| 1.19+ | `fmt.Appendf`; typed atomics: `atomic.Bool`, `Int64`, `Pointer[T]` |
| 1.20+ | `Clone`, `CutPrefix`, `CutSuffix`; `errors.Join`; context cancellation causes |
| 1.21+ | `min`, `max`, `clear`; `slices`; `maps.Clone`/`Copy`/`DeleteFunc`; `sync.OnceFunc`/`OnceValue`; context deadline helpers |
| 1.22+ | `for i := range n`; per-iteration loop variables; `cmp.Or`; `reflect.TypeFor[T]`; method/path `http.ServeMux`; `PathValue` |
| 1.23+ | range-over-function; `maps.Keys`/`Values` iterators; `slices.Collect`/`Sorted`; `os.CopyFS`; GC-safe `time.Tick`; `unique.Make` |
| 1.24+ | `t.Context()`/`b.Context()`; JSON `omitzero`; `b.Loop()`; `strings`/`bytes` `Lines`, `SplitSeq`, `FieldsSeq`; generic aliases; `os.Root`; `runtime.AddCleanup`; `weak` |
| 1.25+ | `sync.WaitGroup.Go`; stable `testing/synctest` |
| 1.26+ | `new(expr)`; `errors.AsType[T]`; reflect type/value iterator methods |

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
- Go 1.26+:
  - use `_, ok := errors.AsType[ErrorType](err)` over a temporary target plus `errors.As`.
  - use `new(expr)` instead of local pointer helpers.

## Conventions

- **Ports:** when porting logic, add at least one
  `Source: rel/path:<start>:<end> <symbol>` comment near ported code.
