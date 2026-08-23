---
name: using-pjdoc
description: Validate indexed project documentation and inspect its table of contents with pjdoc. Use when authoring or changing specification or architecture indexes, registered subprojects, stable-ID declarations, or local documentation links.
---

# Validate pjdoc documents

Use ordinary filesystem tools to read and edit project documents. Use `pjdoc` only to inspect the indexed table of contents and validate the document set. Run commands from the task's actual working directory so `auto` scope resolves correctly.

## Expected index schema

Every specification or architecture index begins with this closed YAML frontmatter:

```yaml
---
pjdoc:
  version: 1
  kind: spec
  scope: root
  status: draft
  revision: SPEC-1
  files:
    - product.md
---
```

The `pjdoc` mapping has exactly these keys:

- `version`: integer `1`.
- `kind`: `spec` or `architecture`.
- `scope`: `root` for root indexes; a registered subproject ID for that subproject's architecture index.
- `status`: `draft`, `approved`, or `superseded`.
- `revision`: a non-empty string.
- `files`: a unique list of relative `.md` paths from the index directory. Use `files: []` for an empty inventory. Do not list the index itself.

The mandatory root index is `doc/spec/index.md`. The optional root architecture index is `doc/architecture/index.md`. A registered subproject architecture index is `<subproject-path>/doc/architecture/index.md`.

Each indexed Markdown file has exactly one non-empty H1. Body content starts after that H1. Requirement declarations are headings shaped `## REQ-AREA-001 — Title` in specification documents; contract declarations are `## CTR-AREA-001 — Title` in architecture documents. IDs are project-wide unique. Local Markdown links must resolve to indexed files and exact existing headings.

Every `.md` file below a governed `spec/` or `architecture/` directory is either its index or appears exactly once in that index's `files` list.

## Optional subproject registry

When independently owned subprojects exist, `doc/subprojects.yaml` uses this closed schema:

```yaml
pjdoc:
  version: 1

subprojects:
  - id: api
    path: services/api
```

Top-level keys are exactly `pjdoc` and `subprojects`. Each item has exactly `id` and `path`; IDs match `[a-z][a-z0-9-]*`, paths are project-relative directories, and registered paths do not overlap. Each registered subproject must have its architecture index.

## Inspect the table of contents

```text
pjdoc list
pjdoc list --scope root --kind spec
pjdoc list --scope all --kind architecture
```

Successful list results are `toc` records. Each record identifies `scope`, `kind`, `index`, `path`, document `title`, artifact `status` and `revision`, plus source-ordered heading `entries` containing `heading`, `level`, optional stable `id`, and one-based `line`. Use the returned project-relative paths and lines with ordinary filesystem tools; pjdoc does not return document prose.

## Validate changes

Run the narrow affected scope while iterating:

```text
pjdoc validate
pjdoc validate --scope root
pjdoc validate --scope api
```

Run the complete gate before claiming project-wide documentation integrity:

```text
pjdoc validate --scope all
```

Expect one newline-terminated JSON object. Read `status`, `scopes`, and `errors`; successful validation has `status: "ok"`, exit `0`, and empty `results` and `errors`.

- `invalid_request` / exit `2`: correct the command, scope, or list kind.
- `invalid_docs` / exit `3`: fix every structured documentation error at its reported `path`, `line`, and `id`, then validate again.
- `failed` / exit `4`: diagnose root discovery, I/O, parsing, or internal failure rather than treating the documents as valid.

A validation invocation is read-only. Completion requires the affected scope to pass during iteration and `--scope all` to pass before a project-wide claim.
