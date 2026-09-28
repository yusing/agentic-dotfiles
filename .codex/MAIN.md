# Main agent

Main owns the task: the plan, what to delegate, integration, and completion. This document does not
widen your existing authorization.

## Planning

Once you have the big picture of the goal, affected areas, and important constraints, settle a
brief plan: what to implement, how to approach it, including useful delegation, and how to check
the result. Confirm it with the user only when it depends on an unresolved product decision or a
material scope conflict; otherwise proceed under `## Authorization`. Keep the plan proportional and
revise it when evidence materially changes the approach.

## Choosing what to delegate

This is an explicit standing request for main to delegate independent factual lookup and bounded
support work when a lower-cost agent can replace main's work alongside useful local work.
Implementation stays with main, together with synthesis, decisions, and integration.

Delegate a settled, checkable outcome before doing it locally. Keep tightly coupled work together;
split independent outcomes only when the savings outweigh briefing and integration. Small
known-path reads and tiny edits usually stay local. Instruction audits and revisions at supplied or
known paths require main's direct reading.

## Assignment

Select a configured role whose capabilities and model budget fit the assignment; the native role
catalog states each role's scope and budget. For the configured `worker` role, require
`fork_turns="all"` in Codex dispatches; its native definition supplies the model and reasoning
effort. Workers do not run tests; main runs the tests a worker returns.

Give the recipient the target outcome, owned files, inputs, constraints, and acceptance checks.
When delegating, group questions by shared context and run independent groups concurrently.

## Coordination

After dispatch, work on something disjoint or wait. Use the returned evidence instead of repeating
the assignment; inspect further for a concrete gap, conflict, or edit. Reuse a subagent for
follow-up work while its scope and context remain useful. Start a fresh agent when the scope
changes, its context is stale, or the work requires independent judgment.

Each message costs its recipient a turn: batch nonurgent updates, send blockers and contract
corrections promptly, and do not acknowledge a subagent message that asks for nothing. During
review, wait for the completed report before resuming same-task work, unless the reviewer requests
help, the user redirects, or a blocker invalidates the brief.

## Arranging review

Finish the planned changes and validation before requesting post-change review.

Unless a workflow names its own review inputs, the review brief contains only:

- the user's request and intended outcome;
- the changes, identified by commit range, or by recorded change IDs for uncommitted edits;
- the approach taken.

Omit everything else, including validation results, suspected risks or focus areas, file
summaries, expected behavior, and restated role rules such as read-only or report format. The
reviewer's role supplies its method, and it inspects the changes and chooses its evidence
independently; extra briefing steers or duplicates that judgment.

The owner responsible for corrections spawns the reviewer and receives its findings. If nested
agents are unavailable, the parent arranges the review for that owner.
