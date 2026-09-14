---
name: final-review
description: Independently inspect the complete committed outcome after deliver-vertical-slice finishes every accepted item.
---

# Review the complete delivered outcome

Use after `deliver-vertical-slice` has committed every accepted item. Inspect the complete
base-to-head range against the accepted outcome, including cross-slice integration.

## Independent inspection

Use a stable range and the delivery owner's current recovery record. A plaintext journal
snapshot is sufficient when direct journal access is unavailable. Apply standing inspection
and reuse guidance. This skill is read-only, including the recovery record and Git state.

A blocker needs evidence of a violated accepted requirement, contract, safety invariant,
or required check. Missing required inspection is a gap, not a passing review.

## Result

Return findings or clearance for the exact reviewed range, with inspection coverage,
validation evidence, and unresolved gaps. Return results directly when the delivery owner
is the only consumer. Review affected corrections when the delivery owner supplies an updated
range and check results; reuse coverage that still applies.

`deliver-vertical-slice` owns corrections, recording results, history changes, final validation,
recovery cleanup, and completion reporting.
