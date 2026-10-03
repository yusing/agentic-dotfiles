---
name: batch-agent-sessions
description: Split an issue list into same-kind batches, run one isolated agent session per batch in parallel, then integrate every branch after all finish.
disable-model-invocation: true
---

# Batch agent sessions

Deliver one integrated outcome through visible, isolated batch sessions. The coordinator owns
assignments, budgets, acceptance, and integration; the installed helper owns preparation, launch,
verification, prompt delivery, waits, follow-ups, and cleanup. Use it rather than temporary shell
orchestration. Agent-kind defaults come from `new-agent-session`, including Mekugi for Codex;
that skill's manual launch steps are for standalone sessions.

## Understand the assignment

Identify each issue's observed failure, intended behavior, constraints, likely owner, and
completion evidence. Inspect or reproduce only facts that can change grouping or routing;
leave unresolved diagnosis to the assigned session rather than solving it before dispatch.
Label source facts, hypotheses, and unsettled user decisions separately. Choose budgets from
that assignment's reasoning burden, not its wording, length, or apparent category.

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

For Codex/Mekugi, use `gpt-6.1-sol`.
Then select effort for the actual reasoning burden, independently of the model:

| Effort | Assignment evidence |
| --- | --- |
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

Preparation returns the persistent manifest, copied evidence, and linked worktree/pane roster.
It pins the committed base; uncommitted source changes do not follow. It initializes the source's
populated submodules at recorded commits on batch-local branches, including unpublished local
commits, then runs supplied setup. Give agents only reported-present evidence. For partial failure,
use the reference's recovery flow: repeating prepare creates another run, not a repair.

## Fan out

Run one helper command with the retained manifest, before waiting on any session:

```bash
skills-mgr run batch-agent-sessions/scripts/sessions.sh launch --manifest MANIFEST
```

The helper verifies the panes/processes and effective loaded Codex budget, then confirms task
delivery by observed `working` activity. Reuse its recorded effects/receipts; do not manually
rename, launch, or resend after uncertain delivery.

Each task is its batch's verbatim issue text, not the coordinator's whole request, other batches,
or skill invocation. `handoff` supplies missing evidence, owner pointers, settled user decisions,
branch-commit authorization, and the communication route below. Mark causal/design guesses as
hypotheses, not requirements. Owner pointers do not require changes on every named surface;
continuity concerns do not request new persistence or switching/resume features. Derive additional
acceptance cases from the reported failure or a demonstrated affected contract, not an idealized
feature/test matrix. Leave implementation choices to the batch session within that boundary.

Each batch session is an independent main, not a native worker. Applicable main/project guidance
owns test delegation, review, and final document timing; this workflow adds no automatic subagents.
Submodule work is committed on its prepared named branch and recorded by a gitlink commit on the
batch branch. Those commits are part of this workflow; the coordinator owns integration. Pushing or installing requires separate user
authorization. Handoff evidence placeholders resolve only to copies the helper reports as present.

Report the roster once: batch, branch, checkout, workspace/pane, agent name, effective budget,
and rationale. `launch --plan` supplies missing prepared assignments, not launched replacements.

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

On the first idle/done/blocked/unknown event, the helper cancels other wait clients, not agents.
Read that session's journal/pane and act, then explicitly select remaining outstanding batches.
Use a background wait where supported. Lifecycle state and timeout do not prove completion.
Mekugi may remain `unknown` after a turn: inspect its pane/commits rather than infer completion
or wait indefinitely for `idle`.

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

Busy/blocked sessions queue tasks without terminal input. `follow-up --manifest MANIFEST` sends
one queued task per ready session. For unknown Mekugi state, use `--ready-unknown NAME` only after
visibly confirming no ongoing turn/question UI. Stable IDs are idempotent; uncertain delivery
blocks further sends/cleanup until resolved under the reference. Addenda preserve the assignment
and session, not replace or restart them.

## Integrate

After every batch is finished or explicitly abandoned:

1. Review each branch against the original issues and settled decisions, not coordinator-invented
   requirements: every issue addressed or reported as remaining, with affected retained behavior
   preserved. Remove unjustified implementation/test scaffolding instead of demanding more machinery
   to support it. Keep unrelated findings as reported follow-up work.
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
   context. Check affected documents against the validated integrated behavior; request another
   document pass only for a concrete integration mismatch, not a blanket repeat of settled work.

## Clean up

Once integration and validation are complete, select only finished batches from the retained
manifest and run:

```bash
skills-mgr run batch-agent-sessions/scripts/sessions.sh cleanup --manifest MANIFEST --completed composer --completed labels
```

Cleanup verifies owned, clean, settled resources and retains branches/manifest and nested commits.
Use the reference's cleanup checks for submodule storage, refusals, and retries; do not bypass them.
For completed-but-unknown Mekugi, attest `--ready-unknown NAME` only after inspecting input readiness,
never while working/blocked. Let Herdr close owned spaces, not synthesized Ctrl-C or process kills.
Preserve unfinished/unintegrated batches and evidence.

## Delivery evidence

Per batch: its issues, branch, and outcome (fixed, partial, or remaining, with reasons). Then
the integration: conflicts and how each was resolved, validation run and results, and the
integrated commit range. State plainly anything that did not complete. These are required
facts for the existing work-result channel, not a request for an additional final summary.
