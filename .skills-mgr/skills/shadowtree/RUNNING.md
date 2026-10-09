# Running recipes

Run an existing recipe from the repository/module that owns the target paths. This reference does
not request configuration edits. Shared lifecycle/persistence constraints live in [SKILL.md](SKILL.md).
Use one operation and non-overlapping validation; reuse established invocation evidence.

## Invocation

```sh
shadowtree [global flags] <recipe> [recipe args...]
shadowtree --profile go test ./internal/recipe -run=TestResolve
```

Global flags precede the recipe; positional and `key=value` inputs follow it. `run` is a recipe
name, not a dispatcher. Ordinary arguments/single-token passthrough flags need no `--`.

Use `--` only to send the remaining tokens through `{@}`, for example a literal named-looking
value: `shadowtree test pkg=./internal/recipe -- --cookie NAME=value`. Do not turn `test ./...`
into `test -- ./...`. `--all` needs declared aggregate support and precedes the recipe; use
`--` before passthrough flags with separate values under it: `shadowtree --all test -- -run TestName`.
Do not combine `--all` with an explicit primary target.

## Resolve an unknown once

Invoke known/documented recipes directly. Inspect only evidence that can change the invocation or
its effects, reusing user/project guidance, earlier results, and conclusive errors:

| Command | Unresolved question |
| --- | --- |
| `shadowtree config` | Config path or selected profile |
| `shadowtree recipes` | Available recipe name; `[built-in]`/`[overridden]` mark profiles, custom recipes are unmarked |
| `shadowtree help <recipe> color=false` | An unfamiliar custom recipe's argument name/type/bound/preset/value blocks invocation and no existing source supplies it |
| `shadowtree --print <recipe> [args...]` | This invocation's stages, sandbox, workdir, requirements, or persistence can change the run decision |
| `shadowtree --print --expanded ...` | Compact plan hides a needed script or resolved value |
| `shadowtree --check <recipe> [args...]` | Resolution/reference validity |
| `shadowtree --check --shell ...` | Expanded sh/bash syntax |
| `shadowtree --verbose <recipe>` | Execution needs visible workspace/stage boundaries |

`help` resolves dynamic values and may run providers. It is not a cheap or quiet preflight.
An `unknown argument` error already establishes that the recipe lacks the token: omit it, use the
owning tool, or correct an in-scope override intended to retain the built-in contract, rather than
calling help. Do not use help to infer config ownership from candidate values.

Neither help nor print is routine reassurance for known tests, formats, or builds. Print is also
required for unfamiliar persistent/privileged effects under SKILL's Persistence rules. Reinspect
only after relevant recipe, arguments, cwd, or configuration changes.

## Built-ins and validation

Known profile built-ins and overrides retaining their interfaces accept documented positional,
named, and trailing `{@}` arguments directly:

| Go recipe | Operation |
| --- | --- |
| `fmt` | Persist source formatting |
| `test` | Behavioral tests |
| `test-race` | Race-enabled tests |
| `vet` | Static analysis only |
| `check` | Vet then test |
| `build` | Packages/artifact; use for a build outcome or build-specific condition |

Choose one per scope. Because check includes vet/test, do not chain them for overlapping coverage
or append routine builds. A focused iterative test followed by required broader check is distinct
coverage. Use fmt directly rather than `exec -- gofmt -w`.

## Directory and arbitrary commands

A superproject config may serve a submodule without moving execution there. Stay in the target
module; use print only if a parent override's workdir/variables/stages might depend on parent-only
paths or assets. When no recipe owns the operation, use that module's authoritative tool.

Use `shadowtree exec -- <cmd> [args...]` only for an arbitrary operation that specifically needs
the sandbox, not to recreate an existing recipe or wrap every command:

```sh
shadowtree exec -- ./scripts/reproduce-bug.sh
shadowtree --sync-out internal/generated exec -- generate-command
```

Sandbox formatter/generator/migration edits disappear unless exact outputs are synced. Prefer an
existing persistent recipe; invocation-local sync-out needs the requested outputs within scope.
