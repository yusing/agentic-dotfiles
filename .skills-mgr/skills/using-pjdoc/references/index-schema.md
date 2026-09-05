# pjdoc index schema

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

Each indexed Markdown file has exactly one non-empty H1. Body content starts after that H1. The index contains no stable declaration. Each declared file contains exactly one requirement or contract declaration. Requirement declarations are headings shaped `## REQ-AREA-001 — Title` in specification documents; contract declarations are `## CTR-AREA-001 — Title` in architecture documents. IDs are project-wide unique. Related facts are cited by stable ID or linked; they are not copied. Local Markdown links must resolve to indexed files and exact existing headings.

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
