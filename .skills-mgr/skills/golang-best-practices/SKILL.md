---
name: golang-best-practices
description: Apply go local conventions during implementation finishing or explicit Go quality review.
---

## Local conventions

- Put emitted build artifacts in the project's output directory, defaulting to `bin/`.
  Specify `-o` when producing an executable.
- Prefer symbol-stripped build for size-focused production builds when symbols are not needed.
- When porting logic, retain a `Source: rel/path:<start>:<end>@[<revision>] <symbol>` comment
  near the ported code.

## Utilize tools over manual work

- `deadcode`
- `golangci-lint`
- `go fix` (>=go1.26, modernize code), `go vet`
- `goimports`
