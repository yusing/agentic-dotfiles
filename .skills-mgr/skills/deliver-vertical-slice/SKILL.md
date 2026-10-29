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
- **Agent chooses the skill:** reuse existing workflow and history-write authorization. Ask only
  for a missing grant, such as slice commits or autosquash; do not ask again merely for choosing
  a delivery method.

Honor explicit restrictions and keep effects within the accepted scope.

## Prepare and recover

Before the first slice, settle the complete accepted item set, non-goals, material decisions,
original base revision, and required checks. Order the smallest independently usable slices by
dependency. Do not divide work by technical layer or stop after the first working path.

The delivery owner maintains one recovery record from staged entry through completion. Reuse the
record established by `new-project`, or create it on direct entry to this skill. Store it as a
valid JSON object in project-root `RECOVERY.json` outside commits. Capture the accepted items
and decisions, original base and current head, slice order, checkpoint and slice commits,
validation and review results, and next unfinished work. Keep it current after every
completed slice, review, correction, and history rewrite. No fixed template or duplicate artifact
is needed.

## Deliver each slice

Implement the slice's accepted behavior through the real entry point and authoritative owners,
including only the UI, service, integration, and persistence work it needs. Remove superseded
stubs and routes without narrowing the accepted outcome.

Validate the slice through its real entry point, affected contracts, and applicable build/typecheck.
Then apply FINISHING.md's practices, delivery check, inspection, and convergence rules to the stable
slice; reuse coverage that still applies. Correct in-scope defects and revalidate their consuming
behavior.

Once validation and applicable inspection are complete, create one non-empty Conventional Commit with a concise
subject and meaningful body, record its hash, and continue without another approval prompt.
Continue until every accepted item has implementation and validation evidence.

## Final review and closure

Give a fresh independent reviewer the `final-review` skill, the exact original-base-to-current-head
range, and the current `RECOVERY.json` contents. Record its findings and coverage.
Correct confirmed blockers in original slice
order, validate and inspect the affected corrections, and create
`git commit --fixup=<slice-commit>` against the checkpoint or slice each correction belongs to.
Apply FINISHING.md's convergence limits when inspecting these corrections; record
unresolved findings and missing coverage instead of repeating inspection indefinitely or claiming
clearance.

Check affected document claims against the completed outcome. Include any corrections in their
owning slice/checkpoint fixups or a coherent cross-slice correction commit before recording
the final range.
Fold fixups using the existing autosquash authorization. Verify that rewriting preserves the
validated pre-rewrite tree; rerun checks only where their inputs changed. Only then delete
`RECOVERY.json`. Report the delivered outcome, commit range, checks, and
remaining limitations. If blocked on user input or work outside scope, retain the recovery record
with the concrete gap and next unfinished work.
