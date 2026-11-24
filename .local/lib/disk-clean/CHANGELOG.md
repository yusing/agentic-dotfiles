# Changelog

## 1.2.2 / cargo-worktree 1.0.2

Build both helpers with scriptc. Acquire Cargo cache locks through the
link-time flock binding while retaining the open file descriptor.

## 1.2.1

Detect pre-created Cargo targets lacking `CACHEDIR.TAG` via `.rustc_info.json`
and a profile `.cargo-lock`, and scan `~/.cache/rust/targets` for abandoned
`-working` sessions. Treat linked worktree targets as orphaned when their
checkout's `.git` marker is gone even if untracked leftovers remain. Sweep
legacy `run-build-script-*` fingerprints whose `invoked.timestamp` sits under
`build/<entry>/`.

## cargo-worktree 1.0.1

Resolve the primary source checkout when Git stores its directory separately,
and return the prepared target as a Cargo configuration argument.

## 1.2.0

Clean registered Cargo target caches after their worktree path disappears.
Add the cargo-worktree 1.0.0 launcher helper for seeding and recording these caches.

## 1.1.0

Sweep recognized artifacts in the retired shared Cargo target regardless of age,
skipping profiles with held Cargo locks.
Run temporary cleanup independently.

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
