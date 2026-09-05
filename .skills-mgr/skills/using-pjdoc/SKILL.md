---
name: using-pjdoc
description: Inspect or validate pjdoc-indexed specifications, architecture, subprojects, stable IDs, and links.
---

# Validate pjdoc documents

Use ordinary filesystem tools to read and edit project documents. Use `pjdoc` only to inspect the indexed table of contents and validate the document set. Run commands from the task's actual working directory so `auto` scope resolves correctly.

## Schema reference

When creating or changing indexes, subproject registration, stable declarations, or governed
links, read [references/index-schema.md](references/index-schema.md). Use the same reference to
resolve schema-related validation errors. Table-of-contents lookup does not need the schema.

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
