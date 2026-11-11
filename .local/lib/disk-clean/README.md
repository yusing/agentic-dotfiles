# disk-clean

Run `disk-clean --dry-run` to preview, then `disk-clean` to clean. Fish and Zsh use
the same compiled helper. Rebuild it with `compile-agent-tools` after source changes.

The helper runs `mise prune --tools --yes`, `npm cache verify`, and the Linux `tmp_clean`
helper. Mise protects tracked configurations and running tools. Versions used only
through ad-hoc `mise exec tool@version` or environment overrides are not protected;
put required versions in a tracked Mise configuration before cleaning.

Temporary cleanup covers recognized generated fixtures in `/tmp` and `/var/tmp`.
It preserves repositories, process-referenced paths, other owners, mounted children,
and trees containing anything modified within two hours. It refuses cleanup when
same-user process inspection is incomplete. Stop build and test jobs first: process
inspection is a snapshot, not a lock against jobs starting during cleanup.

If protected processes block inspection, run only the fixture helper with sudo
from your own terminal. Preview first, inspect its exact candidate paths, and then
run without the preview flag:

```sh
sudo "$HOME/.local/bin/tmp_clean" --dry-run
sudo "$HOME/.local/bin/tmp_clean"
```

This uses sudo's invoking UID for ownership and inspects all processes. Do not
run the entire `disk-clean` helper as root, which would select root's tool store.

Rust cleanup discovers marked Cargo target directories under `~/projects`, including
worktrees and cross-target/custom profiles. It removes only recognized unfinished
`-working` sessions untouched for two hours, holding the existing rustc-compatible
exclusive lock until removal finishes. Finalized caches, locked sessions, symlinks,
foreign owners, and mounted children are retained. Missing or indeterminate locks
are never treated as permission to delete. Dry-run acquires locks but does not
create lock files or remove data.

Go caches are retained by default. On Linux, after permanently retiring an older
compiler release, preview and remove only its package archives:

```sh
disk-clean --dry-run --retired-go go1.27.3
disk-clean --retired-go go1.27.3
```

The option asserts that the named release is no longer needed. Stop its builds,
language-server/cache consumers and wrappers, and keep them stopped until cleanup
finishes. This Go-only mode skips the usual tool, npm, Rust and temporary cleanup.
The helper does not infer retirement from age or from the default Go
version. It rejects current/newer releases, a `GOTOOLCHAIN` pin naming the retired
release, and external cache programs. It reads
the normal `GOCACHE` without building or downloading toolchains, and removes only
well-formed archives whose compiler header exactly matches the retired release.
Current-toolchain archives, action indexes, opaque data, executables and downloaded
modules stay intact. Using the retired release again requires rebuilding its cache.
Symlinked, foreign-owned and mounted paths are retained. Counts report allocated
bytes, which can differ from physical space reclaimed.

Finalized Rust, Docker, other compiler, and downloaded dependency caches are retained. Neither
age nor Docker's “reclaimable” label proves that a finalized entry belongs only to obsolete
revisions. The helper also preserves installed Rust toolchains, Docker images,
containers and volumes, session history, and recovery data. It does not perform
privileged system-log or package cleanup.

Dry-run does not invoke mutating npm verification. Execution continues after an
individual step fails, reports the failure, and exits nonzero. Available-space
changes include concurrent filesystem activity and are not a sum of cache sizes.
