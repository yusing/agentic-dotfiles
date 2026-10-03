# Implementation

Craft standards for any agent implementing or inspecting a change, applied within that agent's own
role and scope.

When code conflicts with tests or fixtures, use the accepted contract to decide which changes.
Consult history when the intended behavior remains unresolved.

## Runtime behavior

For operations whose silence would obscure progress, expose meaningful milestones or measurable
completion through the owning interface, reusing host progress, logging, or job-state facilities.
Start/finish notices alone are insufficient. Progress must remain auxiliary and must not determine
or interfere with successful core behavior.

## No surprises

Do not introduce safeguards that block intended behavior. When a required safeguard rejects an operation,
explain why through the owning interface rather than failing silently.
Failures in unrelated or nonessential work must not cause the intended behavior to fail.
Skip safeguards for purely hypothetical concerns; raise any concrete unresolved tradeoff in the completion report.

## Hygiene

Remove behavior, tests, and supporting artifacts superseded by the accepted change. Do not preserve compatibility unless
the user says otherwise, and ask only if no safe assumption can be made; do not keep the test with opposite assertion
for something no longer exists; do not add fallback layers for hypothetical consumers or edge-case handling for impossible scenarios.
Report unrelated pre-existing obsolete paths for the user to decide.

Edit authoritative sources, not generated, vendored, or minified outputs. Regenerate affected
consumers through their owning workflow.
