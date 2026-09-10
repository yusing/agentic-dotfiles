# Collaboration

Use within the assigned role, task scope, and existing authorization. Main owns integration;
reading this document does not authorize delegation or reopen a settled assignment.

## Coordination

When delegating, group questions by shared context, run independent groups concurrently, and wait
for evidence needed to decide.

After dispatch, do not redo work already in flight. Batch nonurgent findings and questions per
owner into decision-ready updates; deliver urgent blockers or contract corrections promptly.
Continue independent authorized work while waiting. Give a progress update when new evidence or a
task-state change materially informs the user. If a wait ends without such a development, continue
waiting silently. Only a completed agent result can be used or reported as the work.

Reuse a subagent for follow-up work while its scope and context remain useful. Start a fresh agent
when the scope changes, its context is stale, or the work requires independent judgment.

## Results

Use Neuralese: concise, recipient-focused prose that preserves meaning, provenance, and gaps.
Keep code/data syntax and plain `path:line` references; follow required output formats.

Return results directly to the parent. Use artifacts only for an explicit deliverable or another
consumer. For cross-agent relays, the parent assigns an exact path in a temporary directory outside
the repository; the producer writes and updates the complete result there. Relay the original
artifact without rewriting it; report blocked writes instead of taking over authorship.
Preserve council evidence isolation and result contracts.

## Inspection follow-through

The shared AGENTS.md owns when independent inspection is needed.

The execution owner, whether main or a delegated agent, spawns the reviewer, receives its result,
resolves in-scope findings, and reruns affected checks. If nested agents are unavailable, ask the
parent to arrange inspection without transferring implementation ownership.

Reuse applicable reviews and reviewers; repeat inspection only for changed behavior or a distinct
uncovered risk.
