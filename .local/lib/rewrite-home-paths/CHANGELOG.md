# Changelog

## 1.0.3

Expand portable `$HOME` paths in Git configuration during setup and checkout so Git
can load global excludes and other configured paths. Share expansion selection between
the helper and clean/smudge filter; keep the clean representation portable.

## 1.0.2

Resolve shared Cargo configuration home paths during setup and Git checkout.

## 1.0.1

Preserve `/home/linuxbrew` and its descendants when rewriting user home paths.

## 1.0.0

Rewrite tracked runtime home paths with syntax-aware JSON and TOML parsers. Merge colliding mappings recursively in source order, keep later conflicting values, and preserve scalar spellings. Retain comments in a leading block when merging requires reformatting. Validate all candidate files before writing changes.
