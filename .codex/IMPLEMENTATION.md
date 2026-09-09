# Implementation

Choose the simplest implementation that meets the full request. Start end-to-end, then extend
without regressing behavior the current requirements still accept. Reassess before adding
complexity; review findings alone do not expand scope.

Validate assumptions before choosing storage or delivery. For identity or lifetime changes,
establish stable identity, state retention across completion, expiry, and sessions, capacity
behavior, and the consumer's final-result contract. Write focused acceptance tests for these
invariants before implementing. Auxiliary state must not displace recovery state or substantive
results.

Keep each demonstrated failure and violated invariant together with its fix: helpers, callers,
tests, documentation, and cleanup. Any authorized commits should preserve that unit within each
Git history, including parent repositories and submodules.

## Execution ownership

Main owns intent, contracts, difficult reasoning, acceptance, and final quality decisions. For
simple tasks, direct execution can be the fastest and cheapest complete path. Delegate settled
implementation, documentation, test authoring, or routine validation when a suitable worker saves
enough execution effort to outweigh handoff and likely rework. This authorizes delegation within
the active harness's tool and parallelism constraints. Once selected, use `route-execution` to
choose and brief the delegate.
Preserve direct requests for main-agent execution and each harness's available roles and tools.

Keep coherent code, tests, documentation, and corrections with one execution owner. Main designs
difficult failure cases and evaluates evidence; the owner writes and runs the checks. Escalate
concrete ambiguity or demonstrated capability limits, then return settled execution to the
suitable owner rather than repeating the entire task through progressively stronger models.
Accept adequate work without cosmetic rewrites. Judge economy by completed work and rework,
not token reduction alone.

## Validation

Execution ownership changes who does the work, not which required checks or independent
inspections must pass.

Test through the owning interface. Cover affected contracts, meaningful failures, and required
checks in proportion to risk. Prefer focused existing checks; add tests that protect behavior,
not mirror implementation. Broaden or repeat passing checks only for changes, failures, or a
concrete remaining concern. Retain required integrated checks and risk-triggered independent review.

Run new timing/concurrency tests separately first, with realistic timeouts plus headroom. Use
controlled state or a test clock for long lifetimes; keep setup in tests. Diagnose timeouts rather
than weaken assertions. Before rerunning superseded validation, resolve the old job's status
within process-control authorization: file edits do not update a running test binary.

Before validation, reconcile documentation for changed behavior, interfaces, configuration,
workflows, and instructions, including nearby operator guidance. Reuse loaded material, read
missing or stale owners, and remove superseded claims. Stay within affected documentation.

## Runtime behavior

For operations whose silence would obscure progress, expose meaningful milestones or measurable
completion through the owning interface, reusing host progress, logging, or job-state facilities.
Start/finish notices alone are insufficient. Progress must remain auxiliary and must not determine
or interfere with successful core behavior.

Use bounded concurrency for new operations only when independent work benefits a requirement
such as latency or throughput. Preserve sequential paths that already meet requirements.

## Hygiene

Keep code, comments, tests, documentation, commit messages, and reports focused on final behavior
and still-applicable rationale, not abandoned approaches.

Unless compatibility is explicitly requested, remove corrected, replaced, or removed behavior and
all material dependent on it, including obsolete portions of shared files. Keep no superseded
wrappers, fallbacks, migrations, examples, or tests. Ask if compatibility is uncertain; report
unrelated pre-existing obsolete paths for the user to decide.

Test real contracts and failure paths, not an approach merely because it once existed. Do not
invent unhappy paths or production seams solely for tests; keep setup in test sources.

## Edit readiness

Separate responsibilities. Reuse suitable project dependencies; judge additions by provenance,
maintenance, and fit. Edit authoritative sources, not generated, vendored, or minified outputs.
Follow local conventions. Comment non-obvious invariants, caller contracts, workarounds, and
tradeoffs even where nearby code has few comments.

## Complexity and ownership gate

Apply these gates proportionally to design choices and review findings. Resolve concrete concerns;
reject unsupported findings. The request establishes capability scope; gates constrain its
implementation. Explain conflicts rather than silently narrowing the request. Keep gate analysis
internal; report results, evidence, and actionable caveats.

- `N` Ownership: keep policy with its caller, provider, runtime, or protocol owner. Forwarders
  must not redefine external contracts, fields, limits, or retries.
- `O` Simplicity: remove duplicate representations and needless abstractions. Inline sole-caller
  helpers unless they preserve shared policy, an invariant, or a nontrivial algorithm.
- `D` Duplication: trust authoritative validation. Extra checks need a distinct boundary and
  owner-derived rules, not stricter downstream policy.
- `I` Reachability: handle accepted inputs, not impossible branches. Check corruption or external
  mutation at the boundary where it can occur.
- `U` Evidence: establish owner, reproducer, failure, invariant, and consumer before adding
  convenience, limits, or compatibility behavior.
- `J` Justified: use the smallest mechanism for a necessary responsibility, resource, invariant,
  shared policy, or nontrivial algorithm. Local resource guards are not external protocol limits.
