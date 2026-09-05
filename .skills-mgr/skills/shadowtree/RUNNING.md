# Running Recipes

Running or inspecting an existing recipe, leaving `.shadowtree.toml` unchanged.
Shared lifecycle and persistence constraints live in [SKILL.md](SKILL.md).

Use an existing recipe when it owns the requested operation. Run the selected
operation once, then only the smallest non-overlapping validation.

When recipe ownership is unknown, use the `[built-in]` and `[overridden]`
markers in `shadowtree recipes`; custom config recipes are unmarked.

## Invocation

```sh
shadowtree [global flags] <recipe> [recipe args...]
shadowtree --profile go test ./internal/recipe -run=TestResolve
```

- DO put global flags before the recipe name; every later token is recipe input.
- DO pass positional and `key=value` arguments straight after the recipe name.
- DON'T write `shadowtree run <recipe>`. `run` is not a dispatcher but a recipe
  name, including the Go-profile recipe for `go run`.
- DON'T add `--` before ordinary arguments or single-token passthrough flags.

## Inspection

Invoke a known recipe directly. Inspect only to resolve a concrete unknown that
can change the invocation or whether it is safe to run. The user, project
instructions, the owning reference, an earlier result, and a conclusive error
all count as established context; reuse them instead of seeking reassurance
from another command.

| Command | Use only when |
| --- | --- |
| `shadowtree config` | the config path or selected profile is unknown |
| `shadowtree recipes` | the recipe name is unknown; list the available recipes once |
| `shadowtree help <recipe> color=false` | all of these hold: the recipe is custom and unfamiliar, an unresolved argument choice blocks the invocation, and no established context gives its name, type, bound, preset, or value |
| `shadowtree --print <recipe> [args...]` | an unresolved question about this exact invocation's stages, sandbox mode, workdir, requirements, or sync-out can change the decision to run it |
| `shadowtree --print --expanded ...` | a compact plan hides a script or resolved value the decision needs |
| `shadowtree --check <recipe> [args...]` | resolution and recipe references need validating without running commands |
| `shadowtree --check --shell ...` | expanded `sh` or `bash` syntax is the uncertainty |
| `shadowtree --verbose <recipe>` | workspace paths or stage boundaries are useful during execution |

- Treat `help` and `--print` as exceptional evidence-gathering commands, never
  routine preflight, validation, or proof of diligence. Run neither for a known
  profile built-in, a documented invocation, or a command already established
  by the owning reference or project instructions.
- Use `help` only for the unresolved custom-recipe argument case in the table.
  An `unknown argument` error is conclusive evidence that the recipe does not
  expose that token; correct the invocation or owning configuration instead of
  calling `help`. Help resolves dynamic values and may run command-backed
  providers, so it is neither cheap nor quiet.
- Use `--print` only for the unresolved execution-property case in the table or
  the unfamiliar persistent or privileged case under Persistence. Do not print
  a known test, check, format, or build recipe before running it.
- Inspect once per unresolved decision. Reuse that result unless the recipe,
  arguments, working directory, or configuration changes.

## Arguments

- DO use `--` only to forward every following token through the recipe's `{@}`
  placeholder. This is uncommon, and useful when a literal token would otherwise
  read as a named argument: `shadowtree test pkg=./internal/recipe -- --cookie NAME=value`.
- DON'T turn `shadowtree test ./...` into `shadowtree test -- ./...`.
- DO use `--all` only when the recipe declares aggregate support, placing it
  before the recipe name.
- DO put `--` before passthrough flags that take separate bare values under
  `--all`: `shadowtree --all test -- -run TestName`.
- DON'T combine `--all` with an explicit primary target.

## Built-ins

Profile built-ins have established interfaces. Invoke one directly when its name
and intended operation are known, and likewise a project override that keeps the
built-in interface: preserved positional and named arguments, and supported
trailing tool arguments forwarded through `{@}`.

The common Go built-ins:

| Recipe | Operation |
| --- | --- |
| `fmt` | Formats source and persists the edits |
| `test` | Runs tests |
| `test-race` | Runs tests with the race detector |
| `vet` | Runs `go vet` only |
| `check` | Runs `vet`, then `test` |
| `build` | Builds packages or an artifact; never the routine way to check a change |

- DO use `fmt` rather than `shadowtree exec -- gofmt -w ...`.
- DO use `--print` when an override's behavior, not its usage, needs inspection.
- DON'T call `recipes` or `help` merely to confirm one of these known shapes.
- DON'T follow an `unknown argument` error with `help`. The error is conclusive:
  the selected recipe does not expose that token. Correct the override when it is
  meant to keep the built-in contract and changing it is in scope; otherwise omit
  the option, or use the owning tool directly when no recipe exposes the
  operation.

## Working directory

Invoke Shadowtree from the repository or module that owns the target paths.
Execution starts there unless the resolved recipe declares a `workdir`.

Shadowtree may discover a superproject configuration while invoked from a
registered submodule. That configuration can intentionally serve recipes to the
submodule, but it does not move execution to the superproject.

- DO keep the invocation in the target repository or module.
- DON'T change to the configuration directory merely to inspect or run a
  same-name recipe.
- DON'T use `help` to infer configuration ownership from argument value lists.
- DO `--print` the exact invocation when a parent override may depend on
  parent-only paths, assets, or setup. Its resolved `workdir`, variables, and
  stages must make sense from the target working directory.
- DO use the repository or module's authoritative tool when no selected recipe
  owns the operation at that boundary, rather than probing parent recipes with
  `help`.

## Validation scope

Choose one recipe per validation scope: `test` for a focused behavioral check,
`vet` for static analysis alone, `check` when both are required, and `build` only
when the requested outcome is a build artifact or a build-specific condition.

Because `check` already runs `vet` and `test`:

- DON'T run overlapping scopes, such as `shadowtree vet && shadowtree check`,
  `shadowtree test && shadowtree check`, or all three chained.
- DON'T repeat unchanged coverage merely to accumulate successful commands, and
  don't append `build` to routine validation.
- DO treat a focused test during iteration followed by one required broader
  `check` as acceptable; those are different scopes.

## `exec`

Use `shadowtree exec -- <cmd> [args...]` only when no recipe owns the operation
and the arbitrary command specifically needs Shadowtree's sandbox:

```sh
shadowtree exec -- ./scripts/reproduce-bug.sh
```

- DON'T reproduce an existing recipe such as `fmt`, `test`, `test-race`, `vet`,
  `check`, or `build` through `exec`, and don't use `exec` as a ceremonial
  wrapper.
- DO prefer the existing persistent recipe for editing work. Because the sandbox
  is disposable, a formatter, generator, or migration under `exec` leaves the
  host checkout untouched unless its exact outputs are synced out.
- DO add invocation-local sync-out only when the requested output must persist
  and every selected path is in scope:
  `shadowtree --sync-out internal/generated exec -- generate-command`.
- DO run the repository or module's authoritative tool directly when no recipe
  owns the operation and the command does not need the sandbox.
