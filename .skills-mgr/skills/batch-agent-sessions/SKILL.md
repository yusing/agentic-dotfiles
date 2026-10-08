---
name: batch-agent-sessions
description: Split an issue list into same-kind batches, run isolated agent sessions in parallel, and integrate their accepted results.
disable-model-invocation: true
---

# Batch agent sessions

Deliver one integrated outcome through visible, isolated sessions. The coordinator owns
assignments, budgets, acceptance, and integration. Use the installed helper for preparation,
launch, verification, delivery, waits, follow-ups, and cleanup. Agent-kind defaults come from
`new-agent-session`, including Mekugi for Codex; its manual launch steps are for standalone use.
Each batch is an independent main. Applicable main/project guidance owns delegation, review,
testing, and documentation; this workflow adds no automatic subagents.

## Assign and route

Group issues by subsystem, owner, failure mode, or user-facing surface to minimize overlapping
edits. Honor user grouping and batch counts; keep an unmatched issue alone. Inspect only what
can change grouping or routing, leaving unresolved diagnosis to the assigned session.

Each plan entry has:

- `task`: the assigned issues verbatim, including session/thread IDs, without the coordinator's
  workflow request or skill invocation.
- `handoff`: only task-specific context the session lacks: evidence, settled user decisions,
  material scope or edit-overlap boundaries, and required authorization. Keep agent/model/effort
  choices in the route fields; omit standing guidance, default result-channel instructions,
  and generic coordination reminders. Omit the handoff when no additional context is needed.
  Label causal/design guesses as hypotheses; owner pointers are starting points, not
  implementation requirements.
- Required attached text or durable evidence paths. Independent sessions do not inherit
  attachments. Ask only when the issue's meaning cannot be recovered from supplied evidence or code.

Honor explicit agent, model, effort, and profile choices. Otherwise use `gpt-6.1-sol` for
Codex/Mekugi and select effort by the hardest inseparable requirement:

| Effort | Assignment evidence |
| --- | --- |
| `medium` | Clear contract, short causal trace, and focused checks. |
| `high` | Competing causes, nonlocal state, or interacting invariants. |
| `xhigh` | Difficult coupled reasoning remains after useful decomposition; justify the extra cost. |
| `max` | User choice or representative evidence that lower effort misses a consequential requirement. |

Keep other agent kinds' requested/configured budgets in their native form. Retain `model_reason`
and `effort_reason` in the plan; a shared default-model rationale need only be reported once.
Keep running assignments and recovery state when defaults change.

## Prepare and launch

Read [Resource plan](references/preparation.md#resource-plan) for the JSON schema. Name each
batch by its kind, relative to the source project: `journal-ui` under `mekugi`, not
`mekugi-journal-ui`. The batch name is also the linked space's label; the parent already names
the project. The helper derives its branch and checkout. Preparation pins committed HEAD,
so uncommitted changes do not follow. For populated submodules, also read
[Submodule preparation](references/preparation.md#submodule-preparation).

Before preparation, main checks the assignment's named files and required local inputs against
the selected committed base. Supply required Git-ignored documents, fixtures, and configuration
through `evidence`, or scoped `setup` when they must occupy their original checkout paths.
Copy only task-required inputs; keep their ignore status. After preparation, verify each required
input is present in the returned evidence or its batch checkout before launching that batch.
Handoffs point to verified copies, not assumed source paths. Apply this check to new inputs for
added batches and follow-ups too.

```bash
skills-mgr run batch-agent-sessions/scripts/sessions.sh prepare --cwd "$PWD" --plan /absolute/plan.json
skills-mgr run batch-agent-sessions/scripts/sessions.sh launch --manifest MANIFEST
```

Retain the returned manifest before launching. Launch the ready cohort before waiting on its sessions.
[Launch and wait](references/preparation.md#launch-and-wait) owns inherited wrapper flags,
verification, and wait options. For a missing clipboard image, use
[Images missing from disk](references/preparation.md#images-missing-from-disk).
For partial failure or uncertain delivery, inspect the existing session and use
[Receipts and partial failure](references/preparation.md#receipts-and-partial-failure).

## Coordinate

Use each session's journal when available, otherwise its ordinary result channel. Read results
there rather than request a second recap. Read the visible pane while working/blocked if history
capture requires idle. Independent roots cannot receive Codex native cross-thread messages.
Relay decisions and overlap coordination through the helper's follow-up queue. Never type
reports into the coordinating user's pane: terminal input can submit their unfinished draft.

```bash
skills-mgr run batch-agent-sessions/scripts/sessions.sh wait --manifest MANIFEST --batch composer --batch labels
```

Wait concurrently on outstanding batches, in the background where supported. Inspect the first
attention event, act on it, and select the remaining outstanding batches for the next wait.
Lifecycle state and timeout are not completion evidence. Mekugi may remain `unknown` after a
turn; inspect its pane and commits instead of waiting indefinitely for `idle`.

The coordinator may answer non-decision questions in the session's question input. Each batch
session asks decision questions directly; the user answers in that session. The coordinator leaves
decision questions to the user and does not forward questions to the user or other sessions.

## Add work

Keep accepted assignments active. Before adding work to an existing session, inspect elapsed
work, remaining scope, and context use. Use a fresh batch if it is long-running, nearly full,
or its capacity is unknown, even for the same owner. Reuse a session only for bounded additions
with context headroom. Short corrections needed to finish its current task can still use follow-ups.

Read [Add batches and follow-ups](references/preparation.md#add-batches-and-follow-ups):
use `add` then selected `launch` for fresh batches, or `follow-up` with a stable task ID for an
existing session. Withdraw a wrongly queued task with `cancel` before rerouting it. Delivered
or uncertain tasks require inspection; cancellation cannot retract them.

## Integrate and clean up

Review finished branches against their assigned issues and settled decisions. Integrate accepted,
independent results while other sessions run; defer dependent results until their prerequisites
are accepted. Integrate one branch at a time onto the source's current tip, preserving unrelated
dirty edits. Ask only when those edits overlap the batch's files.

A batch is an assignment, not a commit boundary. Preserve distinct work in coherent commits;
fold follow-up fixes only into their owning work. Use `commit` for commits written or revised,
retaining the batch commit messages as the basis for rewritten messages. Branch commits and
integration are authorized by this workflow; pushing or installing needs separate authorization.
For submodule changes, read [Submodule integration](references/preparation.md#submodule-integration).

Resolve conflicts to preserve both batches' intended behavior and explain any design choice.
Validate each integrated result as needed, then run final combined validation when all accepted
work has settled. Fix integration breakage directly unless it needs the batch session's context.
Revisit settled documents only for a concrete integration mismatch.

For assigned Git-ignored outputs, copy accepted edits back to their source paths, preserving
ignore status and unrelated source edits. Verify the integrated copies before cleanup; branch
commits do not carry these files.

After integration and validation, use [Cleanup selection](references/preparation.md#cleanup-selection)
and select only finished batches:

```bash
skills-mgr run batch-agent-sessions/scripts/sessions.sh cleanup --manifest MANIFEST --completed composer --completed labels
```

Preserve unfinished/unintegrated sessions and evidence. Let the helper close owned resources;
resolve refusals through its recovery flow rather than bypassing ownership checks.

## Result record

Record the launch roster once: batch, branch, checkout, workspace/pane, agent name, effective
budget, and rationale. As results become known, record each batch's issues, outcome and remaining
work, commit IDs, checks and limitations. Record integration conflicts/resolutions, validation,
and the integrated commit range in the coordinator's existing result channel. Its guidance owns
completion; these facts do not require an additional final recap.
