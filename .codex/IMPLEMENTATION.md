# Implementation

Apply these standards within your role and scope. Use the accepted contract to resolve code/test
conflicts; consult history only when intent remains unclear.

## Behavior

Reuse existing owners and mechanisms for the smallest requested change. Fix a defect at its
established cause, and keep the fix to that mechanism even when a similar module solved the
problem with a wider change. Use a dependency's supported capability before writing a narrower replacement.
Add an abstraction
only for a current shared responsibility, invariant, or necessary algorithm, not possible future
use. Avoid duplicating host/provider policy or adding persistence, fallbacks, or compatibility the
task and supported contracts do not need.

Keep each behavioral definition at one owner across features. Producers and consumers must
share that definition, not maintain parallel case lists or recognition rules. When changing a
producer, trace its consumers, including display and replay, and test the produced data through
them. Separate operations can share definitions without sharing their side effects.

For simplification requests, remove mechanisms or required decisions at the affected owner.
Moving code or adding replacement layers does not satisfy that request.

For operations whose silence would obscure progress, expose meaningful milestones or measurable
completion through the owning interface, reusing host progress, logging, or job-state facilities.
Start/finish notices alone are insufficient. Progress must remain auxiliary and must not determine
or interfere with successful core behavior.

## No surprises

Do not introduce safeguards that block intended behavior. When a required safeguard rejects an operation,
explain why through the owning interface rather than failing silently.
Failures in unrelated or nonessential work must not cause the intended behavior to fail.
Avoid expanding scope for theoretical robustness. Before adding complexity for a speculative or
exceptionally unlikely race or security edge case, explain the concrete failure mode, its likelihood,
and the complexity cost, and obtain the user's agreement before implementation.

## Ownership and boundaries

Edit authoritative sources and regenerate their consumers, not generated, vendored, or minified outputs.

Validate unknown input at its owning boundary, then pass typed values inward. Trust guarantees
already established by schemas, constructors, or internal types. Prefer supported schema decoders
to hand-written parsing and repeated checks.

Avoid types that bypass checking.

Keep synchronous parsing, validation, and option construction synchronous. Catch failures where
recovery or useful context belongs rather than wrapping every call.

For themed interfaces, select tokens by semantic role rather than current appearance. Add a
missing role at the theme owner instead of borrowing an unrelated token; check supported themes
and custom-theme fallbacks when changing that contract.

For event-sourced systems, persist irreducible facts and derive redundant state in projections
or read models rather than duplicating it in durable events.
