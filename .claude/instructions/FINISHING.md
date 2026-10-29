# Finishing

Use after focused validation of an authorized change, or for an explicit quality review.
Implementers and reviewers apply the practice and implementation sections within their assignment;
main also applies the delivery and review section. `MAIN.md` owns task-wide sequencing.

## Applicable practices

Select and load best-practice and quality-enforcement skills for the changed code or operational
behavior. Limit their guidance to the concerns the change touches.

## Implementation finish

Apply these standards to code and operational changes within your role and scope.

### Performance and reliability

Deliver a performant and reliable solution on the paths the change touches:

- Performant: minimize CPU and memory use. Do each piece of work once and reuse its result, such as
  validated state, scans, encodings, buffers, and timers, instead of repeating it. Skip work whose
  outcome is already decided or unused, return unchanged input as is, and avoid allocations that
  callers discard, including copies that grow with each chunk or call.
- Reliable: eliminate the conditions that produce an error rather than handling the error after it
  occurs. Prefer designs, types, and ordering under which the failure cannot happen over added
  checks, retries, fallbacks, or recovery paths, and keep error handling for failures the code
  cannot prevent, such as I/O, external input, and remote services.

Keep observable behavior and contracts unchanged while optimizing.

### Hygiene

Inline sole-caller helpers unless they preserve shared policy, an invariant, or a nontrivial
algorithm, or isolate complex validation so the caller reads as the happy path. Keep supporting
helpers close to their callers. After a refactor, remove superseded forwarding wrappers and update
their callers to use the retained owner directly, unless a retained supported contract or explicit
user requirement needs the compatibility wrapper.

Remove behavior and artifacts the accepted change supersedes. Remove tests for superseded behavior
rather than invert their assertions merely to retain them. Preserve compatibility required by retained
supported contracts; add further compatibility only when I explicitly request it. Report unrelated
obsolete paths instead of deleting them.

### Code style

Prefer immutable bindings, early returns, and simple conditional expressions over reassignment
and nested branches. Inline single-use values when a name adds no clarity; retain qualified access
when destructuring would obscure context. Use collection transformations when clearer than loops.

Where the language supports inference, omit redundant annotations while keeping public contracts
and unclear types explicit. Prefer named imports and original names; alias only when needed to
resolve a collision or clarify meaning. Load heavy, conditionally used modules in the narrowest
scope that needs them when startup cost matters.

Comment on non-obvious constraints and surprising behavior, not obvious operations.

## Main delivery and review

Main applies this section. A delegate applies it only when its assignment gives it review dispatch
or the review-fix loop; other delegates keep their assigned implementation or review scope.

### Delivery check

Check that the accepted contract, documents, and verified outcome agree, and close concrete gaps now
rather than deferring document work to a later stage.

### Review necessity

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

### Briefing and waiting

Unless a workflow supplies its own inputs, brief a reviewer with only my verbatim request and
corrections, the unresolved inspection question, change context, approach, and checks with results.
Re-review keeps all task changes in scope and includes prior finding dispositions and regression
evidence for corrections. Leave out repeated role rules. Impose no severity cutoff, because
reviewers apply one literally; you decide dispositions afterward. The correction owner receives the
review; if that owner cannot spawn agents, its parent arranges the review for it.

During a review, wait for the complete report before doing same-task work unless you are blocked,
asked for help, or redirected.

### Corrections and convergence

Correct established in-scope defects. For a flawed supporting mechanism, prefer narrowing or
removing it over extending it. If narrowing would change requested behavior, present the tradeoff and
simpler alternative for me to decide before changing it. Before re-review, cover
each corrected finding at the consuming interface, including sibling inputs and states the
correction changes, and run affected checks. A reviewer's reproduction is input to that check;
adopting it is the correction owner's work. Reuse coverage that is still current.

Request re-review only when a correction changes the design or reaches code the review did not
cover; otherwise the correction's checks close the finding. Review converges when findings are
corrected, accepted, or reported. If a second correction round still finds new issues, or I ask
for speed, stop requesting review and report the limits. Continue authorized fixes without
claiming clearance you have not established.
