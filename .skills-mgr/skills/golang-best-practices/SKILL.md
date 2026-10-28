---
name: golang-best-practices
description: Apply version-aware Go guidance and local conventions when implementing or reviewing Go-specific behavior. Retrieve it in the same call as `skills-mgr run use-modern-go/scripts/run-tool.sh list --go-version VERSION` with the reported version.
---

# Modern Go by Version

Use idioms supported by the project's target Go version. When an unresolved idiom or API question
needs version-specific guidance, load only the relevant IDs from that list for details or examples
with `skills-mgr run use-modern-go/scripts/run-tool.sh explain <ID> [<ID> ...]`.

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
