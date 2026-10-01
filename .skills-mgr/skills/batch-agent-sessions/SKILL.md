---
name: batch-agent-sessions
description: Split an issue list into same-kind batches, run one isolated agent session per batch in parallel, then integrate every branch after all finish.
disable-model-invocation: true
---

# Batch agent sessions

Turn one list of issues into parallel, visible agent sessions, one per batch, and deliver a
single integrated result. Task grouping, budgets, prompts, and integration remain agent
decisions; preparation and cleanup use the installed commands below, not agent-authored
shell orchestration or temporary scripts. `new-agent-session` owns agent choice (including the
Mekugi default for Codex), launch, prompt, and verification; load it before launching.

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

Pass the route to `new-agent-session` as explicit native model and reasoning arguments, and record
it with separate model and effort rationales in the launched roster. Do not restart a running batch
merely because these defaults changed; reassess its route only when an additive request materially
changes its workload, preserving the accepted assignment and existing recovery state.

## Prepare

Name each batch by its kind; the helper derives its branch and worktree from that name. Supply
batch names, required evidence, and any project setup commands as a JSON plan, described with
recovery and receipts in [references/preparation.md](references/preparation.md), then run:

```bash
skills-mgr run batch-agent-sessions/scripts/sessions.sh prepare --cwd "$PWD" --plan "$PWD/plan.json"
```

The command creates the temporary directory, copies or recovers evidence, creates and verifies
linked worktrees on one shared base, and runs the supplied setup. It prints one JSON roster with
the persistent manifest, evidence paths, and each batch's branch, checkout, workspace, and pane.
Give agents only evidence paths it reports as present. After a nonzero exit, read the reference
before retrying; rerunning creates a new run rather than repairing this one.

## Fan out

- Preparation has already run `new-agent-session`'s preflight and steps 2–4. For each prepared
  pane, apply its agent choice and steps 1 and 5–7, using the roster's base and exact returned
  identifiers. Do not rerun discovery, recreate worktrees, predict IDs, or repeat setup commands
  that already succeeded.
- Launch every session before waiting on any of them.
- Each prompt's task text is its batch's verbatim issue text, supplied to `new-agent-session`
  in place of the user's prompt. The user's request to the coordinator, with its routing,
  other batches, and skill invocation, is not forwarded; carry only decisions from it that
  apply to the batch, such as its baseline or excluded issues, as handoff. Use
  `new-agent-session`'s handoff rules to add those, missing branch-commit authorization, and
  the communication route below.

  Those branch commits are part of the requested workflow; the coordinator owns integration.
  Pushing or installing requires separate user authorization.
- Report the launched roster (batch, branch, worktree, workspace, pane, agent name, model/effort
  and routing rationale) once, then wait.

## Communication

Each session reports in its own pane. When it has a journal, that is its work-result channel:
it records commit IDs, changed behavior, checks/results and limitations there as established,
and its journal guidance owns the completion reply. Read the journal instead of requiring a
second final recap. Without a journal, use the session's ordinary result channel. Questions
also stay in the session's pane. Use visible reads while an agent is blocked or working if
history capture requires idle.

Relay decisions or overlap coordination into a batch's pane by `new-agent-session`'s delivery
rules; do not assume a pane is safe to type into while the user is composing there. Never route
reports into the coordinating user's pane: `herdr agent prompt` and other terminal input type
into the user's composer and can submit a report together with their draft. Codex native
cross-thread tools and message boards are scoped to one agent tree, so they cannot reach these
independently rooted sessions.

## Wait

Wait on every agent at once and wake for the first one that needs attention: finished, idle, or
blocked, which `herdr agent wait` matches by default. Waiting only for idle misses an agent
blocked on a question, since it never becomes idle. Prefer a background wait where the client
supports one. Read that agent's latest output, act on it, then resume waiting on the rest. A
settled agent is not necessarily finished.

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
   tip rather than resetting it. A dirty source checkout must not absorb unrelated edits;
   commit around them without staging them, and stop to ask only when they overlap a batch's
   files.
3. Resolve conflicts by preserving both batches' intended behavior, not by picking a side.
   Where two batches solved an overlapping problem differently, keep one coherent design and
   say which one.
4. Run the project's relevant validation on the integrated result, and fix integration
   breakage directly. Send a fix back to its batch's agent only when it needs that agent's
   context.

## Clean up

Once integration and validation are complete, select only finished batches from the retained
manifest and run:

```bash
skills-mgr run batch-agent-sessions/scripts/sessions.sh cleanup --manifest MANIFEST --completed composer --completed labels
```

The command removes only this run's verified, clean, settled resources through non-forced Herdr
removal and keeps branches and the manifest; the reference describes refusals and repeat runs.
If a completed Mekugi session still reports `unknown`, inspect its visible pane and add
`--ready-unknown NAME` only when it is ready for input, not working or blocked. Herdr closes the
owned subspaces; do not synthesize Ctrl-C sequences or kill processes yourself. Leave unfinished
or unintegrated batches and their evidence intact.

## Delivery evidence

Per batch: its issues, branch, and outcome (fixed, partial, or remaining, with reasons). Then
the integration: conflicts and how each was resolved, validation run and results, and the
integrated commit range. State plainly anything that did not complete. These are required
facts for the existing work-result channel, not a request for an additional final summary.
