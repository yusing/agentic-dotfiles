# Changelog

## 1.0.0

Replace the duplicated Fish and Zsh cleaners with one compiled helper. Preserve
active build caches and dependencies instead of purging them. Prune tool versions
unused by tracked configurations and running processes, verify npm cache contents,
and clean recognized inactive temporary fixtures. Add dry-run previews, visible
failures, and before/after available-space measurements.
Selectively remove abandoned Rust incremental working sessions under Cargo targets
in the projects directory, holding rustc-compatible exclusive locks through removal.
Retain finalized caches, locked sessions, and recently modified trees.
Reject mount intersections using Linux mount information, including same-filesystem
bind mounts, and open malformed lock candidates nonblocking before validation.
Add opt-in cleanup for an explicitly retired older Go release. Validate archive
structure and exact compiler headers while retaining current-toolchain entries,
indexes, opaque data, executables, and modules. Do not infer retirement from age.
Keep retired-Go invocations scoped to Go without repeating the standard cleanup.
