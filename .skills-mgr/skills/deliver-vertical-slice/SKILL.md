---
name: deliver-vertical-slice
description: Deliver every accepted item for a new project, feature, or behavioral change through ordered end-to-end slices. Use after a new-project skeleton or after the user has confirmed an existing-project change and granted all workflow authorizations; do not use for a bug fix, diagnosis, or question.
---

# Deliver the complete accepted change

## Entry and recovery

- Before automation starts for an existing-project feature or behavioral change, settle material decisions and confirm authorization for edits, Conventional Commits, fixup commits, autosquash, and any external or destructive effect. Reuse authorization already granted; ask only for missing decisions or permissions. Confirm the native review roles required for final review are available.
- End to end means deliver `ALL` accepted items, not only the first working path. Fix the complete item set, non-goals, base revision, and required checks before the first slice.
- Create the project-directory temporary recovery artifact from `references/recovery-artifact.md`; record every accepted item and decision in full, keep it out of every commit, refresh it through all slices and final-review fixups, and preserve it until final review passes and autosquash completes.
- After automation starts, continue without manual intervention and report only an unresolvable conflict, failed required mechanism, unsafe unauthorized effect, or blocker that cannot be corrected within the accepted change.

## Plan and implement

- Derive the smallest ordered vertical slices directly from accepted items and dependencies; record their complete order in the recovery artifact and create no separate planning artifact.
- Apply the active ownership and complexity gate to implementation choices. Deliver every accepted capability through its authoritative owner; remove unnecessary mechanisms rather than narrowing the accepted outcome.
- Implement each slice through the real entry point with only the enabling UI, service, integration, or persistence it needs; remove replaced stubs and obsolete routes.
- Add focused acceptance checks, applicable defect regressions, and only current safety or error-contract negatives, then run relevant checks, the normal build or typecheck, and the real entry point.

## Inspect, commit, and continue

- After focused validation and before each commit, apply the standing independent-inspection policy to the complete slice diff. When inspection is needed, use its selected native review roles and required frontend coverage; keep the inspected snapshot stable until they finish.
- Validate returned items, fix confirmed in-scope findings, skip invalid, stylistic, or overengineered findings that broaden accepted behavior or contracts, and rerun affected checks. Request native review follow-ups only for corrections or unresolved findings that need inspection.
- Create one non-empty authorized Conventional Commit per slice with a concise subject and meaningful body, record its hash against the slice, and continue in order until every accepted item has implementation evidence.
- When `ALL` items are complete, preserve the recovery artifact and exact base-to-head range, then continue automatically to `final-review`.

## Final-review fixes and completion

- Final review requires a fresh agent.
- For confirmed final-review blockers, follow original slice order, use the same implementation, validation, and pre-commit inspection rules, and create `git commit --fixup=<slice-commit>` against each corresponding commit.
- Keep the recovery artifact current across compaction, final-review follow-ups, fixup commits, and autosquash; delete it only after `final-review` passes and the rewritten range is validated.
- Completion requires every accepted item, slice checkpoint, inspection, check, commit, and final-review fix to be complete with no blocker hidden or deferred.
- Stop and report only an unresolvable blocker; otherwise continue automatically through the next slice or final-review handoff.
