# Deterministic preparation and cleanup

The installed lifecycle helper creates resources; it does not group issues, select models,
write prompts, launch agents, infer completion, integrate branches, or run acceptance checks.
Those decisions stay with the workflow and `new-agent-session`. A task's original issue text
and selected model/effort still go to its session through that launch owner.

## Resource plan

```json
{
  "batches": [{"name": "composer"}, {"name": "labels"}],
  "evidence": [{"name": "queued.png", "source": "/absolute/clipboard/image.png"}],
  "setup": []
}
```

- `batches` is a nonempty list of unique lower-case kebab-case names, at most 40 characters.
  The helper generates unique branches and isolated worktree paths for this run.
- `evidence` is optional. Each entry has a unique single filename and an absolute source
  path. Copies live outside the repository and are shared by the batches; use the returned
  paths in their handoffs. Include ignored task documents here when Git will not carry them.
- `setup` is optional: argv arrays, not shell strings, executed once per created checkout.
  Select only the project's needed, authorized setup commands. It is empty by default;
  nothing builds into an installation path automatically. Setup never receives shell
  interpolation. Its commands run in the batch checkout and inherit the caller environment.
- `--plan -` reads the same JSON from stdin. For a plan file, pass its absolute path.
  Pass the caller's `--cwd` explicitly because `skills-mgr run` changes directory before
  executing the wrapper.

Preparation calls the existing single-session preflight once. It verifies that the caller
checkout and Herdr source workspace belong to the same Git repository, pins the caller's
committed HEAD, creates linked subspaces with `--no-focus`, and checks every actual checkout
HEAD. Uncommitted source edits do not follow. Project setup can create required generated
assets, dependencies, or other effects only through the supplied argv commands.

## Images missing from disk

Add `--rollout /absolute/retained-rollout.jsonl` when a requested clipboard path is gone.
Recovery matches that exact path's user-message image marker to embedded image data,
not screenshot numbering, neighboring images, or arbitrary files found under `/tmp`.
The bytes are copied without model reconstruction. Conflicting retained images reject
recovery rather than guessing. Ordinary existing sources still copy when another target
fails. Required missing evidence prevents dependent worktree setup and prints a concrete
unrecoverable-image diagnostic.

## Receipts and partial failure

One JSON result on stdout identifies the persistent manifest, temporary root, evidence,
and each batch's branch, checkout, workspace, pane and preparation state. Progress and
target-qualified errors go to stderr; any failure returns nonzero. The manifest is stored
under `${XDG_STATE_HOME:-$HOME/.local/state}/batch-agent-sessions/runs/`, separately from
the temporary directory, and updated before dependent effects. No credentials or image
contents are included in its receipts.

Keep that path in the existing work record. Do not rerun preparation blindly: it creates a
new run, not a replacement for surviving resources. Use retained receipts with the launch
owner's recovery flow. A failed/timed-out creation without a returned resource identity
remains uncertain; inspect the exact recorded branch/path through Herdr before proceeding.
The helper never resets or adopts an unrelated preexisting worktree.

## Cleanup selection

Run cleanup after integration and acceptance, repeating `--completed NAME` for only the
batches whose work is finished and whose result has been inspected. `idle`, `done`, or
`unknown` alone does not establish task completion. Read-only batches can finish without
commits. Unfinished or failed-to-integrate batches stay in place.

For a completed session that still reports `unknown`, inspect its visible pane to verify
that it is ready for input, with no ongoing turn or approval/question UI, then add
`--ready-unknown NAME` for that selected batch. This is an explicit readiness attestation,
recorded in the receipt, not completion inferred from `unknown`. Known working or blocked
states still refuse removal, even with this option.

The manifest restricts removal to this run's recorded workspaces and checkouts. Cleanup
checks the live linked checkout, repository and branch, retained tip, clean worktree,
unchanged pane layout, and settled agent or idle shell. It then uses Herdr's non-forced
worktree removal and verifies branch retention. Unknown names and rejected targets do
not prevent independent valid targets from completing.

If a removal succeeded but its response was lost, repeating cleanup reconciles the saved
`removing` receipt only when the checkout, registered Git worktree and live Herdr workspace
are all absent and the branch still retains its recorded tip. Uncertain resources remain
preserved without repeating the removal effect.

When every recorded worktree is removed, unchanged copied evidence and empty owned
temporary directories are removed. The manifest and branches remain, so final receipts
are still available without retaining temporary images or dependency trees. Altered
evidence, unknown files, and changed directory identities are preserved, not recursively
discarded. Repeating completed cleanup is a no-op.

## Installation and focused checks

Runtime source and changelog live in `.local/lib/batch-agent-sessions/`; the executable is
`.local/bin/batch-agent-sessions`, built by `compile-agent-tools`. The skill's short wrapper
executes that binary, not an interpreter on source code. After a source update, compile
before use. The helper prints its version with `--version`.

Run `bun test ./.local/lib/batch-agent-sessions/batch-agent-sessions.test.ts` from the
configuration checkout for offline lifecycle checks. The fixtures use disposable Git
worktrees and a fake Herdr boundary; they do not start model sessions or establish live
Herdr removal semantics. Use an isolated Herdr smoke case for that boundary.
