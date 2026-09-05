---
name: shadowtree
description: Run, inspect, author, or migrate workflows to Shadowtree recipes in .shadowtree.toml.
---

# Shadowtree

A recipe defines how an operation runs; it does not expand the task's authorization or replace
every shell command. Load the reference for the current operation, not every mode:

| Operation | Reference |
| --- | --- |
| Run or inspect an existing recipe | [RUNNING.md](RUNNING.md) |
| Add, change, review, or explain recipe definitions | [AUTHORING.md](AUTHORING.md) |
| Replace existing automation with recipes | [MIGRATING.md](MIGRATING.md) |

Reuse established recipe context. Read another reference only when its operation becomes relevant.

## Lifecycle

1. `pre` runs in order; a failure there skips `cmd`.
2. `cmd` runs once, or once per `for_each` value.
3. `post` runs after success, failure, and initial cancellation. Cancellation
   never skips cleanup.
4. The first `pre` or `cmd` failure is preserved unless only `post` fails.
5. Sync-out happens only after every stage succeeds.

## Persistence

The sandbox is disposable: writes vanish after the run unless their exact paths
are synced out.

- DO treat an unsandboxed recipe, recipe `sync_out`, or invocation `--sync-out`
  as a host write. Existing configuration supplies the mechanism, not
  authorization for further paths.
- DO prefer exact sync-out paths. Use `--sync-out-all` only when applying the
  whole sandbox is the request.
- DO account for deletion: a selected path missing in the sandbox is mirrored as
  a host deletion.
- DO `--print` the exact invocation before running an unfamiliar recipe that is
  unsandboxed, persists output, installs dependencies, uses privileges, controls
  processes, or writes externally; add `--expanded` when a script's effects are
  unknown. Stop if any stage exceeds the authorized operation.

Execute only once the recipe, arguments, lifecycle stages, sandbox behavior, and
persistence all match the requested operation.
