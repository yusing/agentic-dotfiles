---
name: deliver-vertical-slice
description: Deliver all accepted project or feature items through authorized end-to-end slices and final review; not for bug fixes or questions.
---

# Deliver the complete accepted change

Use after a new-project skeleton or after the user has confirmed an existing-project change and
granted all workflow authorizations; do not use for a bug fix, diagnosis, or question.

## Entry and recovery

Before unattended delivery, settle material decisions, the complete accepted item set, non-goals,
base revision, and required checks. Confirm that final-review roles are available and obtain any
missing authorization for edits, Conventional Commits, fixups, autosquash, and external or
destructive effects. Reuse authorizations already granted.

On entering delivery, read [the recovery schema](references/recovery-artifact.md) and create its
project-directory temporary artifact. Record every accepted item and decision, the complete slice
order, and later commit hashes. Keep it out of commits and current across slices, compaction,
review follow-ups, fixups, and autosquash. No separate planning artifact is needed.

## Each slice

Choose the smallest ordered end-to-end slices that cover all accepted items and dependencies.
Implement through the real entry point and authoritative owners, with only the enabling UI,
services, integrations, and persistence needed. Remove replaced stubs and obsolete routes without
narrowing the accepted outcome.

Check acceptance behavior, applicable defect regressions, and reachable safety/error contracts.
Run affected checks, the normal build or typecheck, and the real entry point. Then apply the
standing independent-inspection policy to the complete slice diff, keeping that snapshot stable.
Fix confirmed in-scope findings, reject unsupported scope expansion, and rerun affected checks.
Request review follow-ups only where corrections or unresolved findings need inspection.

Create one non-empty authorized Conventional Commit per slice with a concise subject and
meaningful body. Record its hash and continue in order until every accepted item has implementation
evidence, not just the first working path.

## Final review and completion

Pass the current recovery artifact and exact base-to-head range to `final-review`, which requires
a fresh reviewer. For confirmed blockers, correct slices in original order with the same checks
and inspection rules; create `git commit --fixup=<slice-commit>` for each corresponding commit.

Continue through final review and authorized autosquash. Delete the recovery artifact only after
review passes and the rewritten range is validated. Finish with every accepted item and required
checkpoint complete; stop only for a blocker that cannot be corrected within the authorized scope.
