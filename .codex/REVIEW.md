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

Simplification: identify a concrete necessity or complexity question that fresh inspection can
resolve, independently of correctness. Test-heavy changes under TESTING.md or net additions above
300 production lines or 500 total lines (excluding generated or vendored output) are signals to
assess, not automatic review or completion gates. Arrange a simplification-role inspection when
current evidence cannot settle that question; reuse evidence that already does. A correctness
review does not replace a warranted simplification review.

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
rather than extending it. If narrowing would change requested behavior, present the tradeoff and
simpler alternative for the user to decide before changing it. Before re-review, cover each
corrected finding at the consuming interface, including sibling inputs and states the correction
changes, and run affected checks. A reviewer's reproduction is input to that check; adopting it is
the correction owner's work. Reuse still-current coverage.

Review converges when findings are corrected, accepted, or reported. If a second correction round
still finds new issues, or the user asks for speed, stop requesting review and report the limits.
Continue authorized fixes without claiming unestablished clearance.
