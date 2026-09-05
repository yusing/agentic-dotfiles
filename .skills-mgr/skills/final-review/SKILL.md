---
name: final-review
description: Independently inspect the complete committed outcome after deliver-vertical-slice finishes every accepted item.
---

# Review the complete delivered outcome

Use only after `deliver-vertical-slice` completes every accepted item. This is final workflow
inspection, not a bug-fix review, diagnosis, question, or routine per-slice inspection.

## Independent inspection

Require committed accepted items, a current recovery artifact, and a stable, exact base-to-head
range. Spawn a fresh native `reviewer` for the complete range even if no slice needed inspection.
Add `simplify-checker` when complexity warrants it and `web-reviewer` for web/frontend changes.
Dispatch selected roles concurrently with the accepted requirements and necessary evidence under
the standing handoff policy. Keep the snapshot unchanged until inspection finishes.

Trace the delivered surfaces, accepted items, contracts, non-goals, tests, and validation across
the full range. Missing or unrecoverable required inspection is a blocker, not a passing review.
When the main agent is the sole consumer, return results directly without a review-report artifact.

## Findings and corrections

A blocker needs current code evidence of a violated accepted item, contract, safety invariant, or
required check. Record unsupported, external-owner, unreachable, duplicate, uncertain, or
scope-broadening findings and their dispositions in the recovery artifact.

Route confirmed blockers to `deliver-vertical-slice` in original slice order. Correct through the
authoritative owner, validate, apply required pre-commit inspection, and create
`git commit --fixup=<corresponding-slice-commit>`. The independent reviewer never edits the tree.

Return corrected ranges and focused check results to the reviewers. Reuse them while scope and
context remain useful; otherwise use a fresh reviewer. Continue through resolvable in-scope
blockers and report those that require a new decision or authorization.

## Close the range

After review passes, use the preflight authorization to autosquash fixups into their slice commits.
Verify that the reviewed tree is unchanged by autosquash and run the smallest affected checks.
Delete the recovery artifact only after the rewritten range is validated.

Finish with the final base-to-head range, validation facts, skipped-finding dispositions, and no
remaining blocker. Preserve the recovery artifact if required inspection or correction is blocked.
