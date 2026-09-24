# Implementation

Craft standards for any agent implementing or inspecting a change, applied within that agent's own
role and scope.

When code conflicts with tests or fixtures, use the accepted contract to decide which changes.
Consult history only when the intended behavior remains unresolved.

## Validation

Validation covers the known effects of a change and establish the intended observable
outcome, not merely agree with the implementation. Evidence represents the actual workload.

- No tautological tests.
- No change-detector/string-contain-substrings tests.
- Do not add production seams solely for tests.
- Test helpers must be in test sources instead of prod.
- Run tests when fully implemented, not in between edits.
- Optimize and cleanup tests when they become a bottleneck to get the work done.

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

Remove behavior and supporting artifacts superseded by the accepted change. Do not preserve compatibility unless
user say otherwise, ask only if safe assumption cannot be made; do not add fallback layers for hypothetical consumers
or edge cases handling for impossible scenerio.
Report unrelated pre-existing obsolete paths for the user to decide.

Edit authoritative sources, not generated, vendored, or minified outputs. Regenerate affected
consumers through their owning workflow.
