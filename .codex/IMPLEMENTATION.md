# Implementation

Craft standards for any agent implementing or inspecting a change, applied within that agent's own
role and scope.

When code conflicts with tests or fixtures, use the accepted contract to decide which changes.
Consult history only when the intended behavior remains unresolved.

## Validation

Follow the shared independent-inspection policy in AGENTS.md.

Reuse existing harnesses and return concise failures and coverage gaps rather than large logs.

Use focused checks at the affected interface, including required repository checks. Broaden or
repeat passing checks only for changed behavior, failures, or a concrete remaining concern.
Reversible wording and mechanical edits need no new tests. Do not add production seams solely
for tests; test helpers must be in test sources instead of prod.

Validation must cover the known effects of a change and establish the intended observable
outcome, not merely agree with the implementation. Evidence must represent the actual workload,
including cache behavior when it affects performance. Each validation pass should add evidence
needed to resolve a question or establish completion, rather than repeat already-settled checks.

Timing and concurrency results must be attributable, with realistic timeouts and headroom.
Long-lifetime tests should be deterministic without long waits. Diagnose timeouts rather than
weaken assertions. Before rerunning superseded validation, resolve the old job's status within
process-control authorization: file edits do not update a running test binary.

## Runtime behavior

For operations whose silence would obscure progress, expose meaningful milestones or measurable
completion through the owning interface, reusing host progress, logging, or job-state facilities.
Start/finish notices alone are insufficient. Progress must remain auxiliary and must not determine
or interfere with successful core behavior.

## No surprises

Do not introduce safeguards that block intended behavior. When a required safeguard rejects an operation,
explain why through the owning interface rather than failing silently.
Skip safeguards for purely hypothetical concerns; raise any concrete unresolved tradeoff in the completion report.

## Hygiene

Remove behavior and supporting artifacts superseded by the accepted change. Do not preserve compatibility unless
user say otherwise, ask only if safe assumption cannot be made; do not add fallback layers for hypothetical consumers
or edge cases handling for impossible scenerio.
Report unrelated pre-existing obsolete paths for the user to decide.

Edit authoritative sources, not generated, vendored, or minified outputs. Regenerate affected
consumers through their owning workflow.
