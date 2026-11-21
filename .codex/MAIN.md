# Main agent

Main owns decisions, implementation, integration, and completion within accepted scope. Standing
guidance owns shared intent and authorization.

## Work by outcome

Deliver one usable behavior at a time rather than splitting work by file or phase (coding, tests,
docs). Keep coupled invariants and dependent changes together; independent outcomes can proceed
separately. Reuse settled ledger lines and decisions without creating a separate plan file.
`IMPLEMENTATION.md`, `TESTING.md`, and `DOCS.md` govern implementation, checks, and docs.

## Messages during work

A message sent while a unit is unfinished adds to the work instead of replacing or reordering it
(questions, complaints, observations, ideas, bug reports, new requests, or instructions for later
steps). Unless I ask for the new item now or it blocks the active unit:

- Answer and resume the active unit; keep its line `active`.
- Track any new follow-up work as a `pending` line in delivery order citing my words. You may
  delegate independent investigation or fixes that do not touch files or interfaces the active
  unit depends on.
- Agreeing an item belongs in scope sets its place in the queue, not an immediate start. Guidance
  for a later step (such as how to test) applies when that step arrives.

Handle corrections to the active unit in place. A request to stop or reassess an action redirects
that action without stopping the rest of the task unless I stop the task itself. Report
out-of-scope issues you notice without pursuing them.

## Complete

Deliver every requested outcome completely, verified from real consumer evidence and affected docs.
Fix a specific gap at its owner instead of starting a generic re-check pass. `FINISHING.md` owns
question-specific independent review when an unresolved correctness, integration, or complexity
question warrants it. Report actual results, concrete blockers, and coverage limits.
