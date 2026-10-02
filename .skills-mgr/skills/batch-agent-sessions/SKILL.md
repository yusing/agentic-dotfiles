---
name: batch-agent-sessions
description: Split an issue list into same-kind batches, run one isolated agent session per batch in parallel, then integrate every branch after all finish.
disable-model-invocation: true
---

# Batch agent sessions

Turn one list of issues into parallel, visible agent sessions, one per batch, and deliver a
single integrated result. Task understanding, grouping, budgets, task text, completion
inspection, and integration remain agent decisions. The installed helper owns deterministic
preparation, launch, naming, verification, prompt delivery, concurrent waiting, additive
batches, follow-ups, and cleanup, not agent-authored shell orchestration or temporary scripts.
Use `new-agent-session`'s agent-choice defaults, including Mekugi for Codex unless plain Codex
was requested; its manual launch steps belong to standalone sessions, not this workflow.

## Understand the assignment

Before grouping issues or classifying difficulty and risks, understand each problem and the
requested task: the observed and intended behavior, affected owner, scope and constraints,
and what would establish completion. Use the supplied issues and evidence, with targeted
source inspection or reproduction where needed to resolve facts that could change grouping
or routing. Distinguish established facts from assumptions and unresolved questions; an
issue's wording, length, or apparent category is not enough to judge its reasoning burden.

Gather enough evidence to make a grounded assignment, not to solve every issue before dispatch.
When diagnosis is itself the task, identify what remains unknown and what the agent must
establish. Base the difficulty, risks, model, and effort on that understood assignment.

## Batch

- Group issues of the same kind: the same subsystem or owner, failure mode, or user-facing
  surface, so that one agent can fix them coherently and batches rarely edit the same code.
  Keep an issue alone when it fits no group. Honor any grouping or batch count the user gives.
- A batch is a unit of assignment, not necessarily one commit. Keep distinct work in separate
  coherent commits, even when it belongs to the same batch.
- Keep each issue's text verbatim in its batch, including IDs such as session or thread IDs.
  Use issue text already supplied in the conversation. For an independent session, include
  needed attached text in its prompt; give images and other required evidence durable paths
  it can read. Conversation attachments are not inherited by the new session.
- Resolve ambiguity in grouping yourself; ask only when an issue's meaning cannot be recovered
  from the list or the code.

## Route each batch

Honor user-selected models, reasoning efforts, and profiles, whether for the whole list or a
particular batch. Choose what they leave open from each batch's complete assignment, not the
coordinator's budget or the number of issues. For other agent kinds, retain their requested or
configured budgets rather than translating OpenAI names or unsupported effort levels.

For Codex/Mekugi, use `gpt-6.1-sol` for bounded lookup, mechanical or support work, and implementation
with a settled outcome and localized behavior. Prefer `gpt-6-astra` when success depends on ambiguous
diagnosis, cross-cutting design, or coupled persistence, recovery, concurrency, or lifecycle reasoning.
Then select effort for the actual reasoning burden, independently of the model:

| Effort | Assignment evidence |
| --- | --- |
| `low` | Deterministic lookup or mechanical/support work with settled inputs and little consequential inference. |
| `medium` | A clear contract with limited design choices or short causal traces; focused checks can establish the outcome. |
| `high` | Competing causal explanations, nonlocal state transitions, interacting invariants, or consequential migration/recovery decisions requiring substantial reasoning. |
| `xhigh` | Long-horizon, tightly coupled reasoning that remains difficult after useful decomposition and evidence gathering; justify the extra latency/cost with concrete task difficulty or representative results. |
| `max` | An explicit user choice or representative evidence that lower effort misses a consequential requirement and the gain warrants its extra cost. |

Weigh unresolved questions, coupling, failure consequences, and the strength of available
validation. High stakes alone do not require more effort, and a missing fact is often better
resolved by a targeted lookup or reproduction. Do not default every batch to `medium`. Route a
mixed batch by its hardest inseparable requirement, or split it at a coherent ownership boundary.
These are workload defaults: change them when representative evidence warrants it, and reconsider
model fit before compensating with higher effort.

Put the route and separate model and effort rationales in the helper plan. It passes native
arguments to the launcher and records the effective budget in the launched roster. Do not restart a running batch
merely because these defaults changed; reassess its route only when an additive request materially
changes its workload, preserving the accepted assignment and existing recovery state.

## Prepare

Name each batch by its kind; the helper derives its branch and worktree from that name. Supply
batch names, verbatim task text, agent routes, handoffs, required evidence, and any project setup commands as a JSON plan, described with
recovery and receipts in [references/preparation.md](references/preparation.md), then run:

```bash
skills-mgr run batch-agent-sessions/scripts/sessions.sh prepare --cwd "$PWD" --plan /absolute/plan.json
```

The command creates the run directory under the helper's state directory, copies or recovers
evidence, creates and verifies linked worktrees on one shared base, initializes in each checkout the
submodules the source checkout has initialized, and runs the supplied setup. Submodules use the base's
recorded commits on batch-local named branches, cloned from the source's local submodule repositories, so agents need no
initialization instructions and unpublished pinned commits still resolve. It prints one JSON roster with
the persistent manifest, evidence paths, and each batch's branch, checkout, workspace, and pane.
Give agents only evidence paths it reports as present. After a nonzero exit, read the reference
before retrying; rerunning creates a new run rather than repairing this one.

## Fan out

Run one helper command with the retained manifest, before waiting on any session:

```bash
skills-mgr run batch-agent-sessions/scripts/sessions.sh launch --manifest MANIFEST
```

The helper uses the prepared panes, selects unique harness names, launches and verifies the
expected processes, checks selected Codex budgets against the loaded client UI, and delivers
each task until `working` is observed. It records effects before attempting them and does not
blindly repeat uncertain launch or prompt delivery. Reuse its receipts and recovery instructions
instead of manually renaming panes, launching processes, or typing prompts.

Each task is its batch's verbatim issue text, not the coordinator's whole request, other batches,
or skill invocation. Add only missing batch-specific decisions and evidence in `handoff`, including
branch-commit authorization and the communication route below. Work inside a submodule is
committed on its prepared named branch and recorded by a gitlink commit on the batch branch. Those branch commits are part of
this workflow; the coordinator owns integration. Pushing or installing requires separate user
authorization. Handoff evidence placeholders resolve only to copies the helper reports as present.

Report the launched roster (batch, branch, worktree, workspace, pane, agent name, effective
model/effort and routing rationale) once, then wait. Existing prepared manifests without assignment
fields can receive them through `launch --plan`; it cannot rewrite an already-launched assignment.

## Communication

Each session reports in its own pane. When it has a journal, that is its work-result channel:
it records commit IDs, changed behavior, checks/results and limitations there as established,
and its journal guidance owns the completion reply. Read the journal instead of requiring a
second final recap. Without a journal, use the session's ordinary result channel. Questions
also stay in the session's pane. Use visible reads while an agent is blocked or working if
history capture requires idle.

Relay task additions, decisions, or overlap coordination through the helper's follow-up queue;
do not assume a pane is safe to type into while the user is composing there. Never route
reports into the coordinating user's pane: `herdr agent prompt` and other terminal input type
into the user's composer and can submit a report together with their draft. Codex native
cross-thread tools and message boards are scoped to one agent tree, so they cannot reach these
independently rooted sessions.

## Wait

Use the helper to wait on all outstanding batches concurrently:

```bash
skills-mgr run batch-agent-sessions/scripts/sessions.sh wait --manifest MANIFEST --batch composer --batch labels
```

It returns the first idle, done, blocked, or unknown event and cancels only the other wait
clients, not their agents. Prefer a background command where the client supports one. Read the
reported session's journal or pane, act on it, then wait on the remaining outstanding batches.
Select those batches explicitly so a previously inspected settled session does not wake the
next wait immediately. A settled agent is not necessarily finished; timeout is not completion.

Mekugi can report `unknown` after a completed turn. For these sessions, also wake on `unknown`
and inspect the visible pane plus the reported commits; do not treat `unknown` as completion
or wait indefinitely for an idle transition that the integration does not emit.

- Answer a question that falls within the authority already granted; otherwise relay it to the
  user. `herdr agent prompt` rejects a blocked agent, so answer in its pane's question input.
- Treat a blocker that several batches share, such as a locked signing key or a missing tool,
  as one question for the user. Before asking, check whether the user has already answered it.
  Relay the answer to every affected agent and have each one check its pending attempt before
  retrying.
- Do not resend a batch prompt or start a replacement agent without first inspecting the
  existing session.

## Add tasks and follow up

An additive user request preserves accepted assignments and their recovery state. Understand
the new work before routing it. A new coherent batch uses the same plan format with a fresh name:

```bash
skills-mgr run batch-agent-sessions/scripts/sessions.sh add --manifest MANIFEST --plan /absolute/additions.json
skills-mgr run batch-agent-sessions/scripts/sessions.sh launch --manifest MANIFEST --batch new-batch
```

The helper adds resources to the retained run without changing existing sessions. Each new cohort
defaults to the source checkout's current committed HEAD; supply a resolved `base_commit` when it
must use another accepted baseline. After the whole run is cleaned up, prepare a new run instead.

For more work in an existing batch, submit a follow-up plan with a stable task ID, target batch,
verbatim task text, and any missing handoff:

```bash
skills-mgr run batch-agent-sessions/scripts/sessions.sh follow-up --manifest MANIFEST --plan /absolute/follow-up.json
```

Busy or blocked sessions retain queued follow-ups without terminal input. Once ready, run
`follow-up --manifest MANIFEST` to deliver the next queued task per ready session. For Mekugi's
unknown state, inspect the visible pane and add `--ready-unknown NAME` only when it is ready for
input with no ongoing turn or question UI. Stable IDs make retries idempotent; uncertain delivery
stays recorded and blocks further delivery and cleanup until inspected and resolved as described
in the reference. Do not replace the original assignment or restart its session for an addendum.

## Integrate

After every batch is finished or explicitly abandoned:

1. Review each branch's commits against its batch: every issue addressed or reported as
   remaining, and no work leaking outside the batch.
2. Integrate the branches into the source checkout's branch, one at a time, in an order that
   minimizes conflicts, preserving separate commits for distinct work rather than squashing
   by batch. Use the `commit` skill for any commits written or revised during integration;
   squash follow-up fixes only into the work they belong to. Use the batch's own commit messages
   as the source for rewritten messages; do not replace them with bare subjects.
   If the source branch moved past the prepared base, replay batch commits onto its current
   tip rather than resetting it. Nested commits exist only in the batch checkout's submodule
   repositories: fetch them from `<checkout>/<submodule path>` into the matching source
   submodule, innermost first, before the parent commits that record them. Integrate onto each
   source submodule's original named branch, recorded as `source_branch` when preparation found
   it attached. If already detached, identify its original branch from local refs and reflog;
   ask only when that remains ambiguous. Preserve detached commits with a named ref before
   switching, then fast-forward or integrate onto the original branch without resetting away
   either history. Leave each integrated source submodule on that branch, with its changes
   intact, and resolve gitlink conflicts to the integrated nested commit. A dirty source checkout must not absorb unrelated edits;
   commit around them without staging them, and stop to ask only when they overlap a batch's
   files.
3. Resolve conflicts by preserving both batches' intended behavior, not by picking a side.
   Where two batches solved an overlapping problem differently, keep one coherent design and
   say which one.
4. Verify recursively that integrated source submodules are on their intended named branches,
   their changes are retained, and parent gitlinks record the integrated tips. Run the project's relevant validation on the integrated result, and fix integration
   breakage directly. Send a fix back to its batch's agent only when it needs that agent's
   context.

## Clean up

Once integration and validation are complete, select only finished batches from the retained
manifest and run:

```bash
skills-mgr run batch-agent-sessions/scripts/sessions.sh cleanup --manifest MANIFEST --completed composer --completed labels
```

The command removes only this run's verified, clean, settled resources and keeps branches and the
manifest. For checkouts with submodules, it refuses unretainable nested work and uninspected
repository storage left by removed or deinitialized submodules, retains changed
nested commits as the batch branch in the source submodule repositories, then forces the removal
that Git otherwise refuses.
The reference describes refusals and repeat runs.
If a completed Mekugi session still reports `unknown`, inspect its visible pane and add
`--ready-unknown NAME` only when it is ready for input, not working or blocked. Herdr closes the
owned subspaces; do not synthesize Ctrl-C sequences or kill processes yourself. Leave unfinished
or unintegrated batches and their evidence intact.

## Delivery evidence

Per batch: its issues, branch, and outcome (fixed, partial, or remaining, with reasons). Then
the integration: conflicts and how each was resolved, validation run and results, and the
integrated commit range. State plainly anything that did not complete. These are required
facts for the existing work-result channel, not a request for an additional final summary.
