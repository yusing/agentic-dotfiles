# Changelog

## 2.0.0

- Read native package mappings, probes, vendor installers, and legacy cleanup rules from `setup.json`.
- Derive mise tool membership and platform restrictions from its TOML configuration; command-name overrides are optional JSON metadata.
- Bootstrap Python TOML support when needed and respect per-tool OS restrictions during lock generation and validation.
- Support `--config` and read-only `--check-config`, with automatic config download for standalone bootstrap.
- Verify only configured packages and vendors; limit vendor installation to four concurrent jobs.
