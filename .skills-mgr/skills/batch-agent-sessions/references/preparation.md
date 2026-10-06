# Deterministic session lifecycle

The installed helper owns preparation, launch and naming, verification and prompt delivery,
concurrent waiting, additive batches, queued follow-ups, and cleanup. The coordinator owns task
understanding, grouping, model/effort selection, task text, interpretation of results, integration,
and acceptance checks. The helper does not infer task completion from lifecycle state.

## Resource plan

```json
{
  "batches": [{
    "name": "composer",
    "task": "Exact issue text, including its IDs.",
    "handoff": "Evidence: {{evidence:queued.png}}. Branch commits are authorized; the coordinator owns integration. Report in your own pane's journal when available.",
    "agent": {
      "kind": "mekugi",
      "model": "gpt-6.1-sol",
      "effort": "medium",
      "model_reason": "Settled behavior in one owner.",
      "effort_reason": "Short causal trace with focused checks."
    }
  }],
  "evidence": [{"name": "queued.png", "source": "/absolute/clipboard/image.png"}],
  "setup": []
}
```

- `batches` is a nonempty list of unique lower-case kebab-case names, at most 40 characters.
  The helper generates unique branches and isolated worktree paths for this run.
- `task` is the verbatim assignment, never the coordinator's full workflow prompt.
  `handoff` is optional, task-specific missing context. Only handoff text expands
  `{{evidence:NAME}}` to the corresponding present copied evidence path; task text is unchanged.
- `agent.kind` is `mekugi` for the Codex default, `codex` for explicitly requested plain Codex,
  or an installed Herdr agent kind. Codex/Mekugi accept `model`, `effort`, and `profile`.
  Other kinds receive their budgets and profiles in `args`, an optional list of native argv
  strings. No shell interpretation or OpenAI budget translation applies to `args`.
- `model_reason` and `effort_reason` belong in the agent object for workload-selected budgets.
  The coordinator makes those decisions; the helper retains them alongside loaded-budget receipts.
  Mekugi uses the absolute executable discovered by preflight and native `codex --yolo` arguments.
  A caller already running Mekugi has this mode. Other callers need user authorization,
  recorded as `agent.allow_yolo: true`, before Mekugi launch.
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
HEAD. Uncommitted source edits do not follow, including uncommitted submodule pointer changes.
Project setup can create required generated assets, dependencies, or other effects only through
the supplied argv commands.

Each checkout then initializes, recursively, every submodule that is initialized in the source
checkout, at the commit its parent records. It clones from the source's local submodule
repository, so commits never published upstream resolve, then restores `origin` to the configured
URL. When the local repository lacks a recorded commit, it fetches that submodule from upstream.
A stderr note marks each source submodule checked out at a different commit than the one recorded.
Submodules the source has not initialized, or whose update setting is `none`, stay uninitialized. Each batch receipt lists
its initialized `submodules` with their paths, commits, batch-local `branch`, and `source_branch`
when the source was attached. Each initialized batch submodule is checked out on the batch's
named branch at its recorded commit, never left detached. Preparation does not switch or modify
source submodules; integration restores their original named branches while retaining changes.
Setup runs afterward.

## Launch and wait

`launch --manifest PATH [--batch NAME ...]` launches prepared batches using retained task and
route fields. With no selection, it includes every retained batch and skips already-delivered
initial tasks after checking session identity. `launch --plan FILE|-` supplies assignments for
prepared, not-yet-launched batches, including manifests created by the earlier prepare-only helper.
It does not overwrite launched assignments.

Mekugi launches forward invocation-local `TMPDIR` and `MEKUGI_RUNTIME_DIR` when set
to absolute paths. Set them to disk-backed storage when the system temporary
directory cannot hold runtime snapshots; user configuration stays unchanged.

The helper preserves focus and uses only each batch's returned pane. It renames the pane by task
kind, picks a unique harness name, and runs the native launcher. Mekugi readiness allows unknown
state rather than waiting indefinitely for idle. Before task delivery, it verifies the worktree
cwd and expected foreground processes, both Mekugi and Codex for that wrapper. For selected Codex
budgets, the loaded client's detection UI must confirm `MODEL (EFFORT)`; requested arguments alone
are not effective-setting evidence. A missing or mismatched UI budget stops dependent delivery
and retains the session for inspection. Native non-Codex arguments retain their own semantics.

`agent prompt --wait --until working` runs inside the helper; only observed working activity marks
initial delivery. The roster includes names, requested routes/rationales, effective Codex budgets,
process/session identities, and each task's delivery state. Launch is not implementation completion.

`wait --manifest PATH [--batch NAME ...] [--timeout MS]` starts a Herdr CLI wait for each selected
launched batch concurrently, returning the first idle, done, blocked, or unknown event. The timeout
defaults to 120000ms. Losing CLI waits are cancelled without sending keys or stopping agent processes.
Select only outstanding batches on subsequent waits; an already-settled session otherwise wakes
immediately. Timeout and unknown are attention states, not completion evidence. Waiting does not
hold the manifest mutation lock, so new work can be added while a wait is outstanding.

## Add batches and follow-ups

`add --manifest PATH --plan FILE|- [--rollout PATH]` uses the preparation plan format and appends
fresh batch and evidence names to a retained run. Existing batches, evidence, and launch receipts
are untouched. New batches share the source checkout's current committed HEAD by default; an
optional resolved `base_commit` selects another accepted baseline for that cohort. Initial
preparation uses its preflight HEAD. Uncommitted edits never follow implicitly. Launch the added
names separately. Duplicate batch names are rejected rather than re-created. Select a fresh
batch or a follow-up using the session-capacity rule in the skill. A fully cleaned run needs a
new preparation.

For `follow-up --manifest PATH --plan FILE|-`, use:

```json
{
  "tasks": [{
    "id": "composer-addendum-1",
    "batch": "composer",
    "task": "Exact additional user task text.",
    "handoff": "Only new context needed for this task."
  }]
}
```

IDs are unique per run, 1–80 letters, digits, dots, underscores or hyphens, starting with a
letter or digit. Reusing an ID with identical batch/text/handoff is idempotent; different content
is rejected. Follow-ups require a verified session whose initial task was delivered. The helper
records them before delivery, queues them while working or blocked, and submits at most one queued
task per ready batch per call. `follow-up --manifest PATH` flushes the queue without adding tasks.
Only idle/done sessions receive automatic delivery; inspected-ready unknown sessions need
`--ready-unknown NAME`, just as cleanup does. It never types ordinary task text into a question UI.

`cancel --manifest PATH --task ID` marks one queued follow-up as cancelled under the manifest
lock. Repeating it is a no-op. It retains the original task and ID, sends no terminal input,
and does not stop the agent. Initial, delivered, and uncertain tasks are rejected. Cancelled
tasks cannot be resent by replaying their plan and do not block cleanup. Use a fresh task or
batch ID when rerouting the work.

## Images missing from disk

Add `--rollout /absolute/retained-rollout.jsonl` when a requested clipboard path is gone.
Recovery matches that exact path's user-message image marker to embedded image data,
not screenshot numbering, neighboring images, or arbitrary files found under `/tmp`.
The bytes are copied without model reconstruction. Conflicting retained images reject
recovery rather than guessing. Ordinary existing sources still copy when another target
fails. Required missing evidence prevents dependent worktree setup and prints a concrete
unrecoverable-image diagnostic.

## Receipts and partial failure

One JSON result on stdout identifies the persistent manifest, run directory (`temporary_root`), evidence,
and each batch's branch, checkout, workspace, pane and preparation state. Progress and
target-qualified errors go to stderr; any failure returns nonzero. The manifest is stored
under `${XDG_STATE_HOME:-$HOME/.local/state}/batch-agent-sessions/runs/`, separately from
the run directory under `batch-agent-sessions/work/` in the same state root, and updated before
dependent effects. Checkouts live under that state root, not the system temporary directory. No credentials or image
contents are included in its receipts. Task and handoff text are retained privately in the manifest;
do not put credentials in them. Mutating commands use a manifest-scoped `flock` advisory lock,
released automatically when the helper exits. Concurrent mutation attempts fail without effects;
retry after the other command returns. A small lock file remains beside the retained manifest.

Keep that path in the existing work record. Do not rerun preparation blindly: it creates a
new run, not a replacement for surviving resources. Use retained receipts with the launch
owner's recovery flow. A failed/timed-out creation without a returned resource identity
remains uncertain; inspect the exact recorded branch/path through Herdr before proceeding.
The helper never resets or adopts an unrelated preexisting worktree.

After inspecting a failed startup and confirming its pane is back at the shell,
use `retry-startup --manifest PATH --batch NAME`. It checks the recorded linked
workspace and idle shell and refuses live agents, retained agent identities, or
any task receipt. Repeat `launch` for an existing live session instead.

Launch intent and prompt submission are saved before their effects. Repeating launch can verify
the already-started matching process but cannot silently launch another process after an uncertain
attempt. A `submitting` task means delivery is uncertain, not absent: further delivery and cleanup
for that batch are blocked. Inspect its pane/journal first. If that exact task visibly arrived,
`acknowledge --manifest PATH --task ID` records the coordinator's attestation after verifying the
same live session. Initial task IDs are `initial:BATCH`. This acknowledges delivery only, not task
completion. If arrival cannot be established, retain the receipt and resolve the existing pane;
do not blindly resubmit. A changed process/session identity also stops delivery.

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
unchanged pane layout, no queued/uncertain tasks, and settled agent or idle shell. It then
removes the checkout through Herdr, non-forced unless the checkout holds submodule repositories,
and verifies branch retention. Unknown names and rejected targets do not prevent independent
valid targets from completing.

Git refuses non-forced removal of a checkout with submodule repositories, and forced removal
deletes everything only they hold. Cleanup refuses stored repositories of removed or deinitialized
submodules because their contents are outside the live checkout checks; recover their work and
explicitly remove that storage before retrying. It checks every populated submodule, recursively:
each must map to a `.gitmodules` entry, sit at its recorded commit, have no uncommitted files or
stash, and have no branch or tag commit outside its recorded commit's history, its base commit, and
its remote-tracking branches (the source's branches when cloned, or upstream's after a fallback). For each submodule whose recorded commit changed from the batch
base, a commit no source ref reaches is fetched into the source submodule as the batch branch and
listed in the batch receipt's `retained_submodules`. A changed submodule the source checkout has not
initialized has nowhere to be retained. Any failed check preserves the checkout. Nested commits reachable only from a reflog, such
as those replaced by an amend, are deleted with the submodule repository.

If a removal succeeded but its response was lost, repeating cleanup reconciles the saved
`removing` receipt only when the checkout, registered Git worktree and live Herdr workspace
are all absent and the branch still retains its recorded tip. Uncertain resources remain
preserved without repeating the removal effect.

When every recorded worktree is removed, unchanged copied evidence and empty owned
run directories are removed. The manifest and branches remain, so final receipts
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
