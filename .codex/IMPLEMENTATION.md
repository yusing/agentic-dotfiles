# Implementation

When code conflicts with tests or fixtures, use the accepted contract to decide which changes.
Consult history only when the intended behavior remains unresolved.

## Validation

Follow the shared independent-inspection policy in AGENTS.md.

Use focused checks at the affected interface, including required repository checks. Broaden or
repeat passing checks only for changed behavior, failures, or a concrete remaining concern.
Reversible wording and mechanical edits need no new tests. Do not add production seams solely
for tests; keep test setup in test sources.

Run new timing/concurrency tests separately first, with realistic timeouts plus headroom. Use
controlled state or a test clock for long lifetimes. Diagnose timeouts rather
than weaken assertions. Before rerunning superseded validation, resolve the old job's status
within process-control authorization: file edits do not update a running test binary.

## Runtime behavior

For operations whose silence would obscure progress, expose meaningful milestones or measurable
completion through the owning interface, reusing host progress, logging, or job-state facilities.
Start/finish notices alone are insufficient. Progress must remain auxiliary and must not determine
or interfere with successful core behavior.

## Hygiene

Remove behavior and supporting artifacts superseded by the accepted change. Preserve compatibility
required by existing contracts or the user; do not add fallback layers for hypothetical consumers.
Report unrelated pre-existing obsolete paths for the user to decide.

Edit authoritative sources, not generated, vendored, or minified outputs. Regenerate affected
consumers through their owning workflow.
