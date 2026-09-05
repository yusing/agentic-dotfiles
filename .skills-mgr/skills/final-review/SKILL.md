---
name: final-review
description: Independently inspect the complete committed outcome of an automated new-project, feature, or behavioral-change workflow. Use only after deliver-vertical-slice completes every accepted item; do not use for a bug fix, diagnosis, question, or routine per-slice inspection.
---

# Review the complete delivered outcome

## Scope and independence

- Require every accepted item to be committed, the temporary recovery artifact to be current, and the exact base-to-head commit range to be stable and identifiable.
- Final review is required for the complete delivered outcome even when an individual slice did not need inspection. Spawn a fresh native `reviewer` for the complete commit range; add `simplify-checker` when complexity warrants it and `web-reviewer` when the range includes web or frontend changes. Dispatch the selected roles concurrently in fresh context with the exact range, accepted requirements, and necessary evidence.
- Apply the standing independent-inspection policy for handoffs and result delivery. When the main agent is the sole consumer, receive complete results directly rather than creating a review-report artifact.
- Keep the inspected snapshot unchanged until the inspection is terminal, and treat unavailable or unrecoverable required inspection as an unresolvable blocker.
- Trace the delivered surface, accepted items, contracts, non-goals, tests, and validation across the stated range.

## Classify findings

- Confirm a blocker only when current code evidence shows a violation of an accepted item, contract, safety invariant, or required check.
- Apply the active ownership and complexity gate to proposed corrections, preserving every accepted capability. Remediate confirmed violations through their authoritative owners.
- Skip invalid, external-owner, unreachable, duplicated, overengineered, uncertain, or scope-broadening findings and record their dispositions in the recovery artifact.
- Order confirmed blockers by their original slice and corresponding commit; never edit in the independent reviewer context.

## Correct and recheck

- Route confirmed blockers to `deliver-vertical-slice` in original slice order; validate and pre-commit-inspect each correction, then create `git commit --fixup=<corresponding-slice-commit>`.
- Send the corrected range and focused validation evidence back to the native reviewers. Reuse them while their scope and context remain useful; use a fresh reviewer when either changes materially. Continue automatically while a confirmed blocker is resolvable within accepted scope.
- If a confirmed blocker cannot be resolved within the authorized change, stop and report it without weakening or broadening the accepted outcome. Missing required review coverage is a blocker, not a passing review.
- Keep the recovery artifact through every fixup and inspection; do not create a separate final-review report.

## Close the range

- After no confirmed blocker remains, autosquash every fixup into its corresponding slice commit using the preflight authorization.
- Verify that autosquash preserves the reviewed tree, rerun the smallest affected checks, and identify the final rewritten base-to-head commit range.
- Delete the temporary recovery artifact only after the autosquashed range is validated.
- Return the final commit range, validation facts, and skipped-item dispositions directly; successful completion requires no manual intervention and no remaining blocker.
