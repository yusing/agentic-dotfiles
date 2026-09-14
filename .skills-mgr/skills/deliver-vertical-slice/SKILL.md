---
name: deliver-vertical-slice
description: Deliver accepted user-facing capabilities as usable end-to-end vertical slices; for new-project delivery or features needing staged capability delivery, not routine changes or fixes.
---

# Deliver in vertical slices

Deliver the complete accepted outcome as small, usable end-to-end capabilities, not layers or
batches of files. Use for staged new-project delivery, with or without a separate skeleton,
or for an accepted feature that needs staged delivery of usable capabilities. Handle routine
changes, instruction/configuration corrections, refactors, fixes, and questions directly under
standing task guidance.

## Invocation

- **User invokes the skill:** proceed without asking permission. Invocation authorizes the
  accepted workflow, including edits, slice commits, fixups, and autosquash.
- **Agent chooses the skill:** ask the user for permission before starting this workflow.
  Once approved, continue without repeated permission requests.

Honor explicit restrictions and keep effects within the accepted scope.

## Recovery

The delivery owner maintains one recovery record from staged entry through completion.
Reuse the record established by `new-project`, or create it on direct entry to this skill.
Use the Mekugi journal when available; otherwise use a temporary project artifact outside
commits. Capture accepted items, decisions and non-goals, the original base and current head,
slice order, checkpoint and slice commits, validation and review results, and next unfinished work.
No fixed template or duplicate artifact is needed.

## Delivery and closure

Settle the accepted outcome and material decisions, then order slices by dependency. Implement,
validate, and independently inspect each usable slice under standing task guidance. Create one
Conventional Commit per slice and continue until every accepted item is delivered.

Request `final-review` on the complete original-base-to-head range and current recovery
record; a plaintext journal snapshot is enough when direct access is unavailable. The delivery
owner records its findings and coverage, resolves in-scope blockers, and obtains inspection
of affected corrections until the range is cleared. Fixups belong to the checkpoint or slice
commit they correct, including the skeleton when present.

The delivery owner folds fixups into their commits using the existing autosquash authorization,
verifies that rewriting preserves the reviewed tree, and validates the final range. Only then
mark the journal record complete or delete the fallback artifact. Report the delivered outcome,
commit range, checks, and remaining limitations. If blocked on user input or work outside scope,
retain the recovery record with the concrete gap and next unfinished work.
