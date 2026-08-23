---
name: final-review
description: Independently inspect the complete committed outcome of an automated new-project, feature, or behavioral-change workflow. Use only after deliver-vertical-slice completes every accepted item; do not use for a bug fix, diagnosis, question, or routine per-slice inspection.
---

# Review the complete delivered outcome

## Scope and independence

- Require every accepted item to be committed, the temporary recovery artifact to be current, and the exact base-to-head commit range to be stable and identifiable.
- Perform independent external inspection of that complete commit range under the active Git-agent hook instructions without restating them; create no review-report artifact.
- Keep the inspected snapshot unchanged until the inspection is terminal, and treat unavailable or unrecoverable required inspection as an unresolvable blocker.
- Trace the delivered surface, accepted items, contracts, non-goals, tests, and validation across the stated range.

## Classify findings

- Confirm a blocker only when current code evidence shows a violation of an accepted item, contract, safety invariant, or required check.
- Classify every proposed review change as `N/O/D/I/U/J`; only `J` findings confirmed by an accepted locally owned behavior or invariant enter remediation.
- Skip invalid, external-owner, unreachable, duplicated, overengineered, uncertain, or scope-broadening findings and report their dispositions as the active hook instructions require.
- Order confirmed blockers by their original slice and corresponding commit; never edit in the independent reviewer context.

## Correct and recheck

- Route confirmed blockers to `deliver-vertical-slice` in original slice order; validate and pre-commit-inspect each correction, then create `git commit --fixup=<corresponding-slice-commit>`.
- Inspect the corrected complete range only through hook-permitted follow-ups; continue automatically while a confirmed blocker is resolvable within accepted scope and hook limits.
- If a confirmed blocker remains after authorized correction and hook-permitted recovery are exhausted, stop and report it as unresolvable without weakening or broadening the accepted change.
- Keep the recovery artifact through every fixup and inspection; do not create a separate final-review report.

## Close the range

- After no confirmed blocker remains, autosquash every fixup into its corresponding slice commit using the preflight authorization.
- Verify that autosquash preserves the reviewed tree, rerun the smallest affected checks, and identify the final rewritten base-to-head commit range.
- Delete the temporary recovery artifact only after the autosquashed range is validated.
- Return the final commit range, validation facts, and skipped-item dispositions directly; successful completion requires no manual intervention and no remaining blocker.
