---
name: deliver-vertical-slice
description: Deliver accepted user-facing capabilities as usable end-to-end vertical slices; for new-project delivery or features needing staged capability delivery, not routine changes or fixes.
---

# Deliver in vertical slices

Deliver the complete accepted outcome as small, usable end-to-end capabilities, not layers or
batches of files. Use after a new-project skeleton or for an accepted feature that needs staged
delivery of usable capabilities. Handle routine changes, instruction/configuration corrections,
refactors, fixes, and questions directly under standing task guidance.

## Invocation

- **User invokes the skill:** proceed without asking permission. Invocation authorizes the
  accepted workflow, including edits, slice commits, fixups, and autosquash.
- **Agent chooses the skill:** ask the user for permission before starting this workflow.
  Once approved, continue without repeated permission requests.

Honor explicit restrictions and keep effects within the accepted scope.

## Delivery

Settle the accepted outcome and material decisions, then order slices by dependency. Implement,
validate, and independently inspect each usable slice under standing task guidance. Create one
Conventional Commit per slice and continue until every accepted item is delivered.

Keep one current recovery record in the Mekugi journal when available; otherwise use a temporary
project artifact outside commits. Capture the accepted items, decisions and non-goals, base and
head revisions, slice order and commits, validation and review results, and next unfinished work.
No fixed template or duplicate artifact is needed.

Pass the recovery record and exact base-to-head range to `final-review`; a plaintext journal
snapshot is enough when direct access is unavailable. Resolve in-scope blockers, fold fixups into
their slice commits, and validate the final range. Stop only for a blocker that needs user input
or cannot be resolved within scope.

After review and validation pass, mark the journal record complete or delete the fallback
artifact. Report the delivered outcome, commit range, checks, and remaining limitations.
