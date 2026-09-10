# Implementation

Choose the simplest implementation that meets the full request. Start end-to-end, then extend
without regressing behavior the current requirements still accept. Reassess before adding
complexity; review findings alone do not expand scope.

When code conflicts with tests or fixtures, follow authorized contract changes;
otherwise use history and cite the deciding commit. 

## Validation

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

Align implementation, tests, and documentation when editing.

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
