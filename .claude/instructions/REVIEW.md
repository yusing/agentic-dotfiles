# Review

Apply this after an authorized change is implemented and its focused validation is complete, before
you report completion or commit a delivered slice.

## Delivery check

Check that the accepted contract, documents, and verified outcome agree, and close concrete gaps now
rather than deferring document work to a later stage.

## Review necessity

Decide correctness review and simplification review separately; neither decision settles the other.
Arrange each warranted review after implementation, focused validation, and any pending decision of
mine that could change the design.

Correctness: use prior exploration, diagnosis, validation, and reviews to identify a concrete
post-change question or coverage gap that fresh inspection can resolve. When current evidence
already answers it, skip this review. A risk category, a completed change, or a wish to double-check
your own work does not justify it, since you already verify as you go; routine wording or mechanical
work needs none. UI acceptance needs rendered or runtime evidence appropriate to the change,
typically from `ui-reviewer`; source inspection is not runtime proof.

Simplification: identify a concrete necessity or complexity question that fresh inspection can
resolve, independently of correctness. Test-heavy changes under TESTING.md or net additions above
300 production lines or 500 total lines (excluding generated or vendored output) are signals to
assess, not automatic review or completion gates. Arrange `review-simplify` when current evidence
cannot settle that question; reuse evidence that already does. `review-correctness` does not
replace a warranted simplification review.

## Briefing and waiting

Unless a workflow supplies its own inputs, brief a reviewer with only my verbatim request and
corrections, the unresolved inspection question, change context, approach, and checks with results.
Re-review keeps all task changes in scope and includes prior finding dispositions and regression
evidence for corrections. Leave out repeated role rules. Impose no severity cutoff, because
reviewers apply one literally; you decide dispositions afterward. The correction owner receives the
review; if that owner cannot spawn agents, its parent arranges the review for it.

During a review, wait for the complete report before doing same-task work unless you are blocked,
asked for help, or redirected.

## Corrections and convergence

Correct established in-scope defects. For a flawed supporting mechanism, prefer narrowing or
removing it over extending it. If narrowing would change requested behavior, present the tradeoff and
simpler alternative for me to decide before changing it. Before re-review, cover
each corrected finding at the consuming interface, including sibling inputs and states the
correction changes, and run affected checks. A reviewer's reproduction is input to that check;
adopting it is the correction owner's work. Reuse coverage that is still current.

Review converges when findings are corrected, accepted, or reported. If a second correction round
still finds new issues, or I ask for speed, stop requesting review and report the limits. Continue
authorized fixes without claiming clearance you have not established.
