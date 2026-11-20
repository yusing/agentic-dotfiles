# Main agent

Main owns decisions, implementation, integration, and completion within the accepted scope.
Shared intent and authorization belong to the standing guidance.

## Organize by connected outcome

Implementation work keeps the outcome ledger defined in `IMPLEMENTATION.md`. Reuse settled ledger
lines and decisions; no separate plan artifact is needed by default.

Main's unit of work is a usable behavior delivering connected ledger outcomes, not a file or a
phase such as coding, tests, or documentation. Keep shared invariants and dependent work together;
independent outcomes may proceed separately.

For the next unit, order its outcomes by dependency and identify their normal consumer, the owner
each outcome belongs at, and the next unresolved decision.
Acquire the contract and behavior-bearing source ranges needed to decide the complete change:
applicable specifications, consumer assertions for sourced promises, and the producing path. Use
outlines to locate those bodies, not as evidence of their behavior. Carry read ranges forward;
on return to an owner, acquire only missing or changed evidence. Follow references for affected
shared interfaces. Expand for an unresolved dependency, sourced compatibility promise, or concrete
failure, not an anticipatory subsystem inventory. Before building supporting machinery for a new or
disputed design, make its smallest real consumer path pass.

For a multi-part implementation whose public entry points must agree or whose mutations reach
stored data, obtain one independent contract check before the first shared-owner change.
Give the reviewer the request sources, ledger, and proposed observable cases, each citing its
ledger line. Ask which expected results are wrong, which cases lack a ledger line, which outcomes
are missing, and which cases check the wrong observation. If independent review is unavailable
or not permitted, check the cases locally and report that limitation. If the user required
independence, ask before substituting. Reuse settled results unless new evidence reopens the question.

Once those decisions are settled, make the necessary, coupled changes together at their owners.
`IMPLEMENTATION.md`, `TESTING.md`, and `DOCS.md` determine which changes are needed.

Communicate a decision brief only when a consequential choice needs explaining or resolving: outcome,
affected ledger lines, approach, tradeoffs, and acceptance evidence.
A complete request or settled choice needs no second rendering.

## Messages during work

A message the user sends while a unit is unfinished adds to the work; it does not replace or
reorder it. This covers a question, complaint, observation, idea, issue report, new request, and an
instruction for a later step. Unless the user asks for the new item now or it blocks the active
unit:

- Answer the message and resume the active unit; keep its line `active`.
- If the message leaves work to do, record that obligation in delivery order as a `pending`
  line citing the user's words. Delegate independent investigation or fixes when permitted and worthwhile;
  keep changes off files and interfaces the active unit depends on. Otherwise take up the item
  in delivery order.
- Agreement that an item belongs in the work settles its place in the order, not an immediate
  start. An instruction for a later step, such as how to test, applies when that step arrives.

A correction to the active unit's own outcome is part of that unit and is handled in place.
A request to stop or reassess an action redirects that action: apply it and carry on with the
remaining work unless the user stops the work itself. Work main comes across on its own that lies
outside the active unit's outcomes is reported or recorded the same way, not pursued.

## Complete

Account for every ledger outcome from the units' current consumer evidence and affected documents.
Resolve a specific undelivered outcome at its owner rather than starting another general
inspection or validation phase. `FINISHING.md` owns question-specific independent review when an
unresolved correctness/integration or complexity question needs it.
Report actual results, concrete blockers, and coverage limits; unassessed quality remains unknown.
