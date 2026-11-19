---
name: context7-docs
description: Fetch library documentation with Context7 when a task needs unresolved API, version, or compatibility details, or explicitly requests a documentation lookup. A framework mention alone does not trigger it.
---

# Context7 documentation

Use relevant installed source, types, and documentation first. Fetch documentation when those
leave a material API, version, or compatibility question unresolved, or when the user requests
the lookup. Reuse current evidence for questions it already answers.

## Resolve and query

1. Resolve the library name and concrete question with `ctx7 library <name> <query>` in Codex
   or the `resolve-library-id` tool in other clients. Prefer the official
   library and a version-specific result when the task names a version.
2. Use `ctx7 docs <libraryId> <query>` in Codex or `query-docs` in other clients. Keep each query focused on
   one concept; combine concepts only when their interaction is the question. Reuse the resolved
   library ID for subsequent queries about the same library.
3. Apply the documented contract to the task. Identify the relevant version and cite the source
   supporting the answer. State when the retrieved material does not settle the question.
