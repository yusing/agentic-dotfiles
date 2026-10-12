# Changelog

## 0.2.11

Install Pyflakes with Brew Python in the shared managed virtual environment.
Retire its obsolete Mise receipt only after validating the native replacement.
Ignore shared package directories during active-file checks, so a process with
its working directory at / does not block all system package retirement.

## 0.2.10

Expose only pull for the stable architecture channel. Link hooks, retire owned
host tools and remove inactive old images automatically, including unchanged
pulls. Keep runtime execution and setup provisioning internal. Preserve legacy
unleased FUSE mounts and required native Brew dependencies. Keep active tools
and declared global packages or directories under the same checked retirement
owner.
Inspect interpreter entrypoint arguments, including symlinks and paths with
spaces, before retiring loaded scripts or global packages.
Stop host cleanup when a relative interpreter entrypoint becomes unresolvable
after its process changes directory.

## 0.2.9

Retain active system packages through merged-usr aliases. Retire compiled helpers
only when the maintained compiler inventory declares their ownership.

## 0.2.8

Accept the portable host Fish artifact and use it when an old image-only
installation has no independent host shell. Keep it outside the tool namespace.
Reject published runtimes that would restore the retired whole-shell takeover.

## 0.2.7

Add host cleanup with an inspectable dry-run. Check active image replacements,
use setup inventory and exact Mise receipts, and retain host bootstrap tools,
active installations, services, databases and unrelated package dependencies.

## 0.2.6

Reject home and working directories that overlap image-owned files before
executing the command. Preserve write-through host directories without a
synthetic ancestor that can discard new files.

## 0.2.5

Hold a shared hook/runtime lease while native hooks load and run so pruning cannot
remove their selected libraries during an activation race.

## 0.2.4

Resolve commands from the image environment when reusing a running runtime, so
relocated scripts use their original installation paths.

## 0.2.3

Keep login and interactive shells in the host namespace so host administration
commands retain their filesystem and privilege behavior. Explicit image shell
execution remains available through agent-tools run.

## 0.2.2

Reuse verified unchanged runtime components instead of downloading them for each
release. Reuse signed blob redirects across delta range requests, refreshing
expired URLs through the registry. Explain the localhost authentication proxy.
Prune inactive older releases after a successful pull, retaining mounted runtimes.
Add `agent-tools prune` to reclaim them after old managed shells exit.

## 0.2.1

Keep normal command execution silent. Reuse the current runtime for command
links invoked from a managed shell.

## 0.2.0

Pull raw OCI artifacts without extraction. Verify content identities, reuse
existing SquashFS blocks with zsync, and activate managed commands atomically.
Supply the runtime utilities from the artifact and preserve failed updates.
Preserve login-shell detection through native command links and allow pulls from
managed shells through a temporary mount-control namespace.

## 0.1.0

Run a trusted local SquashFS tool runtime without Docker or extraction. Preserve
host home and project paths, propagate command status, and clean up mounts.
