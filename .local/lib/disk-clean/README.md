# disk-clean

Run `disk-clean --dry-run` to preview, then `disk-clean` to clean. Fish and Zsh use
the same compiled helper. Rebuild it with `compile-agent-tools` after source changes.

The helper runs `mise prune --tools --yes` and `npm cache verify`. Mise protects
tracked configurations and running tools. Versions used only
through ad-hoc `mise exec tool@version` or environment overrides are not protected;
put required versions in a tracked Mise configuration before cleaning.

Temporary cleanup runs separately. See [temporary cleanup](../../../README.md#temporary-cleanup).

Rust cleanup discovers Cargo target directories under `~/projects` and
`~/.cache/rust/targets`, including pre-created targets identified by
`.rustc_info.json` plus a profile `.cargo-lock`, worktrees, and
cross-target/custom profiles. It removes only recognized unfinished
`-working` sessions untouched for two hours, holding the existing rustc-compatible
exclusive lock until removal finishes. Finalized caches, locked sessions, symlinks,
foreign owners, and mounted children are retained. Missing or indeterminate locks
are never treated as permission to delete.

On Linux, the helper sweeps recognized artifacts in the retired shared target at
`~/.cache/cargo-target`, regardless of age. It keeps unmatched artifacts and
skips profiles if their existing Cargo locks cannot be held or their layout
cannot be safely inspected.
Do not start new builds against this retired path or use its outputs during cleanup.
Under `~/.cache/rust/targets`, cleanup removes a registered worktree target when
its checkout path or `.git` marker no longer exists and the wrapper is not using
the target. A missing manifest inside a live Git checkout does not qualify. Old
targets without a worktree record and the shared sccache are retained. Dry-runs
acquire existing locks without creating lock files or deleting data.

Go caches are retained by default. On Linux, after permanently retiring an older
compiler release, preview and remove only its package archives:

```sh
disk-clean --dry-run --retired-go go1.27.3
disk-clean --retired-go go1.27.3
```

The option asserts that the named release is no longer needed. Stop its builds,
language-server/cache consumers and wrappers, and keep them stopped until cleanup
finishes. This Go-only mode skips the usual tool, npm, and Rust cleanup.
The helper does not infer retirement from age or from the default Go
version. It rejects current/newer releases, a `GOTOOLCHAIN` pin naming the retired
release, and external cache programs. It reads
the normal `GOCACHE` without building or downloading toolchains, and removes only
well-formed archives whose compiler header exactly matches the retired release.
Current-toolchain archives, action indexes, opaque data, executables and downloaded
modules stay intact. Using the retired release again requires rebuilding its cache.
Symlinked, foreign-owned and mounted paths are retained. Counts report allocated
bytes, which can differ from physical space reclaimed.

Outside orphan worktree targets and the retired Cargo target, finalized Rust, Docker, other compiler, and
downloaded dependency caches are retained. Neither
age nor Docker's “reclaimable” label proves that a finalized entry belongs only to obsolete
revisions. The helper also preserves installed Rust toolchains, Docker images,
containers and volumes, session history, and recovery data. It does not perform
privileged system-log or package cleanup.

Dry-run does not invoke mutating npm verification. Execution continues after an
individual step fails, reports the failure, and exits nonzero. Available-space
changes include concurrent filesystem activity and are not a sum of cache sizes.
