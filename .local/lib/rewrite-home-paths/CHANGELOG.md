# Changelog

## 1.0.0

Rewrite tracked runtime home paths with syntax-aware JSON and TOML parsers. Merge colliding mappings recursively in source order, keep later conflicting values, and preserve scalar spellings. Retain comments in a leading block when merging requires reformatting. Validate all candidate files before writing changes.
