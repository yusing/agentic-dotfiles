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

Keep observable behavior and contracts unchanged while optimizing. Apply these to the code the
change adds or modifies: fix repeated or wasted work you can identify there, and leave a working
path alone when the gain is negligible at its expected scale.

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

Check each accepted outcome against the documents and consumer evidence. Close known gaps before
review; identify missing coverage rather than treating a passing suite as complete acceptance.
Cover the inputs and states the accepted outcomes name, including rejection of invalid and unsafe
ones; supporting further forms is new scope, not a gap.

### Review necessity

Decide correctness review and simplification review separately; neither decision settles the other.
Arrange each warranted review after implementation, focused validation, and any pending decision of
mine that could change the design.

Correctness: use current exploration, diagnosis, checks, and reviews to identify an unresolved
consumer-contract or integration question for independent inspection. Skip review when that evidence
already answers it; risk categories, completed changes, and routine wording/mechanical work do not
justify another pass. UI acceptance needs rendered/runtime evidence, typically from `ui-reviewer`,
not source inspection alone.

Simplification: assess the coherent change in this phase, reusing the implementation-time necessity
assessment and TESTING.md's test-heavy signal. Additions above 300 production or 500 total lines
(excluding generated/vendor) also prompt assessment, not automatic review. Retain distinct required
coverage regardless of ratios. Use a separate simplification review only for a complexity question
current evidence cannot settle. Correctness review does not settle this decision.

### Briefing and waiting

Unless a workflow supplies its own inputs, brief a reviewer with only my verbatim request and
corrections, the unresolved inspection question, change context, approach, and checks with results.
Re-review keeps all task changes in scope, reuses unchanged evidence, and inspects corrections and
affected consumers with prior finding dispositions and regression results. Leave out repeated role
rules. Impose no severity cutoff, because
reviewers apply one literally; you decide dispositions afterward. The correction owner receives the
review; if that owner cannot spawn agents, its parent arranges the review for it.

Keep reviewed source and interfaces stable; overlap required non-mutating checks and independent
work. Wait when no independent work remains. Coordinate necessary changes so findings identify the
version inspected.

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
