---
name: batch-agent-sessions
description: Split an issue list into same-kind batches, run one isolated agent session per batch in parallel, then integrate every branch after all finish.
disable-model-invocation: true
---

# Batch agent sessions

Turn one list of issues into parallel, visible agent sessions, one per batch, and deliver a
single integrated result. Before launching any batch, run one shared preflight:

```bash
skills-mgr run new-agent-session/scripts/preflight.py --cwd "$PWD"
```

This loads `new-agent-session` and `herdr` guidance and gathers caller, source checkout,
base commit, worktree/name inventory, launcher, and installed CLI evidence in one call.
Reuse it for all batches; do not repeat unchanged skill reads or discovery commands.
If both skills are already loaded, pass `--context-only`. `new-agent-session` owns agent
choice (including the Mekugi default for Codex), worktree, launch, prompt, and verification
for every batch. This skill owns
batching, per-batch model routing, fan-out, the collective wait, and integration.

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
particular batch. Assess any choices left open by those selections separately from the complete
assignment, not the coordinator's budget or the number of issues.

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

Assess the unresolved questions, coupling, failure consequences, and strength of available validation.
High stakes alone do not require maximum effort, and a missing fact is often better resolved by a
targeted lookup or reproduction than more thinking. Do not make `medium` universal or reserve
`high` only for a failed attempt. For snapshot codecs/storage plus dependency-safe background pruning
and replay/restart/fork correctness, Astra is the stronger model candidate and `high` is a reasonable
starting effort when those interacting invariants need to be designed; `medium` can fit a settled,
narrow change with decisive regression coverage. Route a mixed batch by its hardest inseparable
requirement, or split at a coherent ownership boundary. For other agent kinds, retain their requested
or configured budgets rather than translating OpenAI names or unsupported effort levels.

Select the route before launch and pass it to `new-agent-session` as explicit native model and
reasoning arguments. Record the route and separate model/effort rationales in the launched roster, and
verify the effective model and effort before delivering the assignment. These are workload defaults,
not a claim that Astra is always faster or better; change them when representative evidence warrants
it. Reconsider model fit rather than automatically compensating with higher effort; do not restart a
running batch merely because these defaults changed. Reassess its route if an additive request
materially changes the workload, preserving the accepted assignment and existing recovery state.

## Fan out

- Resolve one base commit and use it for every batch, so integration compares like with like.
  Verify each worktree's actual Git `HEAD` matches it before delivering the assignment;
  a creation receipt alone does not establish the checkout's base.
- Launch every session before waiting on any of them. Use a distinct branch and worktree label per
  batch, derived from the batch's kind.
- Each prompt carries its batch's verbatim issue text. Use `new-agent-session`'s handoff
  rules to add missing branch-commit authorization and the communication route below.

  Those branch commits are part of the requested workflow; the coordinator owns integration.
  Pushing or installing requires separate user authorization.
- Report the launched roster (batch, branch, worktree, workspace, pane, agent name, model/effort
  and routing rationale) once, then
  wait.

## Communication

Keep agent reports out of the user's composer. `herdr agent prompt` injects terminal input;
it is not an agent mailbox and can combine a report with the user's draft and submit both.
Do not use it, or other terminal input, to report into the coordinating user's pane.

For Codex, prefer native `send_message` or `followup_task` when the recipient is addressable
in the same agent tree. Separate Codex sessions launched in Herdr worktrees have independent
roots and processes: native cross-thread tools do not thereby become cross-session tools.
The native message board is also tree-scoped; configuring a remote board alone does not
establish delivery between unrelated roots. Neither route directly addresses Claude sessions.

For independent sessions, agents leave questions and completion evidence in their own panes.
When a session has a journal, that is its work-result channel: record commit IDs, changed
behavior, checks/results and limitations there as established, and let its journal guidance
own the completion reply. Main reads the journal instead of requiring a second final recap.
Without a journal, use the session's ordinary result channel. Main waits for state changes,
reads the batch's pane, and relays decisions or overlap coordination into it. Use visible
reads while an agent is blocked or working if history capture requires idle. Initial prompts
and follow-ups still use the `new-agent-session` delivery rules; do not assume any pane
containing an agent is safe to type into when the user is also composing there.

Use a non-terminal cross-session transport only after verifying its supported addressing and
delivery semantics. Codex app-server `turn/start` and `turn/steer` bypass the composer, but
require access to the owning running server; a thread ID alone is not that connection. Do not
resume the same live thread in another process as a substitute for messaging its owner.

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
   A dirty source checkout must not absorb unrelated edits; commit around them
   without staging them, and stop to ask only when they overlap a batch's files.
3. Resolve conflicts by preserving both batches' intended behavior, not by picking a side.
   Where two batches solved an overlapping problem differently, keep one coherent design and
   say which one.
4. Run the project's relevant validation on the integrated result, and fix integration
   breakage directly. Send a fix back to its batch's agent only when it needs that agent's
   context.

## Clean up

Once the integrated result validates, close each batch's agent and remove its worktree
through Herdr (`herdr worktree remove --workspace <batch-workspace-id>`), which also closes its
subspace. Keep the batch branches, which still hold the original history. Leave a batch's
session in place instead when its work is unfinished or failed to integrate, and say so.

## Delivery evidence

Per batch: its issues, branch, and outcome (fixed, partial, or remaining, with reasons). Then
the integration: conflicts and how each was resolved, validation run and results, and the
integrated commit range. State plainly anything that did not complete. These are required
facts for the existing work-result channel, not a request for an additional final summary.
