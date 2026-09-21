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

## Prepare and recover

Before the first slice, settle the complete accepted item set, non-goals, material decisions,
original base revision, and required checks. Order the smallest independently usable slices by
dependency. Do not divide work by technical layer or stop after the first working path.

The delivery owner maintains one recovery record from staged entry through completion. Reuse the
record established by `new-project`, or create it on direct entry to this skill. Use the Mekugi
journal when available; otherwise use a temporary project artifact outside commits. Capture the
accepted items and decisions, original base and current head, slice order, checkpoint and slice
commits, validation and review results, and next unfinished work. Keep it current after every
completed slice, review, correction, and history rewrite. No fixed template or duplicate artifact
is needed.

## Deliver each slice

Implement the slice's accepted behavior through the real entry point and authoritative owners,
including only the UI, service, integration, and persistence work it needs. Remove superseded
stubs and routes without narrowing the accepted outcome.

Prove observable acceptance behavior, applicable defect regressions, and reachable safety or
error contracts with focused checks. Exercise the real entry point and applicable build or
typecheck. After focused validation, obtain independent inspection of the complete, stable slice
diff under standing guidance. Resolve confirmed in-scope findings, revalidate affected behavior,
and obtain follow-up inspection only for affected corrections or unresolved findings.

Once the slice is validated and cleared, create one non-empty Conventional Commit with a concise
subject and meaningful body, record its hash, and continue without another approval prompt.
Continue until every accepted item has implementation and validation evidence.

## Final review and closure

Give a fresh independent reviewer the `final-review` skill, the exact original-base-to-current-head
range, and the current recovery record; a plaintext journal snapshot is enough when direct access
is unavailable. Record its findings and coverage. Correct confirmed blockers in original slice
order, validate and inspect the affected corrections, and create
`git commit --fixup=<slice-commit>` against the checkpoint or slice each correction belongs to.
Repeat review as needed until the complete range is cleared.

Fold fixups into their commits using the existing autosquash authorization. Verify that rewriting
preserves the reviewed tree, then validate the final range. Only then mark the journal record
complete or delete the fallback artifact. Report the delivered outcome, commit range, checks, and
remaining limitations. If blocked on user input or work outside scope, retain the recovery record
with the concrete gap and next unfinished work.
