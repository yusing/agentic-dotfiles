---
name: shadowtree
description: Run, inspect, author, or migrate workflows to Shadowtree recipes in .shadowtree.toml.
---

# Shadowtree

Use recipes for operations they own, not as a replacement for every shell command. Load only the
reference for this operation:

| Operation | Reference |
| --- | --- |
| Run or inspect an existing recipe | [RUNNING.md](RUNNING.md) |
| Author, review, or explain definitions | [AUTHORING.md](AUTHORING.md) |
| Replace existing automation | [MIGRATING.md](MIGRATING.md) |

## Lifecycle

`pre` runs in order; failure skips `cmd`. `cmd` runs once or per `for_each` item. `post` runs after
success, failure, and initial cancellation. The first pre/cmd failure wins unless only post fails.
Sync-out occurs only when every stage succeeds.

## Persistence

Sandbox writes disappear unless selected paths are synced out. Unsandboxed recipes and configured
or invocation-local sync-out are host writes; configuration is not permission for extra effects.
Use exact paths. `--sync-out-all` needs a request for the whole sandbox. A selected path absent in
the sandbox is mirrored as a host deletion.

Before an unfamiliar unsandboxed/persistent, dependency-installing, privileged, process-controlling,
or externally writing recipe, `--print` the exact invocation. Add `--expanded` for unknown script
effects. Run only when its arguments, stages, sandbox, and persistence match the authorized operation.
