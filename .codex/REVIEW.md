# Review

Apply this after an authorized change is implemented and its focused validation is complete,
before reporting completion or committing a delivered slice.

## Delivery check

Check agreement between the accepted contract, documents, and verified outcome; correct concrete
gaps now rather than defer document work to a separate final stage.

## Review necessity

Decide correctness review and simplification review separately; neither decision settles the other.
Arrange each warranted review after implementation, focused validation, and any pending user
decision that could change the design.

Correctness: use prior exploration, diagnosis, validation, and reviews to identify a concrete
post-change question or coverage gap that fresh inspection can resolve. Reuse current evidence; when
it already answers the question, skip this review. A risk category or a completed change alone does
not justify it. Routine wording/mechanical work needs none. UI acceptance needs rendered/runtime
evidence appropriate to the change; source inspection is not runtime proof.

Simplification: a simplification-role inspection is required when the change remains test-heavy
after the TESTING.md test-weight check or nets more than 300 production lines or 500 lines in total
(added minus deleted, excluding generated or vendored output), whether or not a correctness question
exists. A correctness review does not replace it. Below these thresholds, arrange one only for a
concrete necessity question that current evidence cannot settle.

## Briefing and waiting

Unless a workflow supplies its own inputs, brief only the user's verbatim request and corrections,
the unresolved inspection question, change context, approach, and checks/results.
Re-review keeps all task changes in scope and includes prior finding dispositions and regression
evidence for corrections.
Do not steer with suspected findings, expected conclusions, or repeated role rules. The correction
owner receives the review; if nesting is unavailable, the parent arranges it for that owner.

During review, await the complete report before same-task work unless blocked, asked for help, or
redirected.

## Corrections and convergence

Correct established in-scope defects. For a flawed supporting mechanism, prefer narrowing/removal
rather than extending it; report any change to requested behavior. Before re-review, cover each
corrected finding at the consuming interface, including sibling inputs and states the correction
changes, and run affected checks. A reviewer's reproduction is input to that check; adopting it is
the correction owner's work. Reuse still-current coverage.

Review converges when findings are corrected, accepted, or reported. If a second correction round
still finds new issues, or the user asks for speed, stop requesting review and report the limits.
Continue authorized fixes without claiming unestablished clearance.
