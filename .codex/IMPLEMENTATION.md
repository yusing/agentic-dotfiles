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

An assigned subagent already has its role and scope. Apply this document within that assignment,
resolve permitted local implementation details, and return scope or ownership changes and blockers
to the parent. Reading task guidance does not reopen assignment.

### Main's routing decision

Main owns user intent, diagnosis, cross-owner contracts, difficult test-case design, acceptance,
and final quality decisions. Apply the main-only authoring boundary in shared AGENTS.md before
routing work. Delegate eligible settled implementation, documentation, test authoring, and
routine validation to a suitable execution owner. Bundle related work with that owner.
Execute eligible work directly only for a genuinely trivial isolated edit,
an explicit user request for main-agent execution, or an unavailable suitable worker.
Familiarity or simplicity alone is not an exception. This authorizes delegation within the active
harness's tool and parallelism constraints. Use `route-execution` to choose and brief the delegate.

Keep coherent code, tests, documentation, and corrections with one execution owner. Main designs
difficult failure cases and evaluates evidence; the owner writes and runs the checks. Escalate
concrete ambiguity or demonstrated capability limits, then return settled execution to the
suitable owner rather than repeating the entire task through progressively stronger models.
Accept adequate work without cosmetic rewrites. Judge economy by completed work and rework,
not token reduction alone.

## Validation

Execution ownership changes who does the work, not which required checks or independent
inspections must pass.

Follow the shared independent-inspection policy in AGENTS.md.

Run new or changed focused checks first, fix their failures, then run required broader or
integrated checks.

Test through the owning interface. Cover affected contracts, meaningful failures, and required
checks in proportion to risk. Prefer focused existing checks; add tests that protect behavior,
not mirror implementation. Broaden or repeat passing checks only for changes, failures, or a
concrete remaining concern. Retain required integrated checks and risk-triggered independent review.
Do not invent unhappy paths or production seams solely for tests; keep setup in test sources.

Run new timing/concurrency tests separately first, with realistic timeouts plus headroom. Use
controlled state or a test clock for long lifetimes. Diagnose timeouts rather
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

- Ownership: keep policy with its caller, provider, runtime, or protocol owner. Forwarders
  must not redefine external contracts, fields, limits, or retries.
- Simplicity: use the smallest mechanism for a necessary responsibility, resource, invariant,
  shared policy, or nontrivial algorithm. Remove duplicate representations and needless abstractions.
  Inline sole-caller helpers unless they preserve shared policy, an invariant, or a nontrivial
  algorithm. Local resource guards are not external protocol limits.
- Duplication: trust authoritative validation. Extra checks need a distinct boundary and
  owner-derived rules, not stricter downstream policy.
- Reachability: handle accepted inputs, not impossible branches. Check corruption or external
  mutation at the boundary where it can occur.
- Evidence: establish owner, reproducer, failure, invariant, and consumer before adding
  convenience, limits, or compatibility behavior.
