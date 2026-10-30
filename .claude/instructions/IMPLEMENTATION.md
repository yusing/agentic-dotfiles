# Implementation

Apply these standards within your role and scope. Resolve conflicts between code and tests with the
accepted contract; consult history only when intent remains unclear.

## Behavior

Reuse existing owners and mechanisms for the smallest change that delivers the request. Fix a defect
at its established cause, and keep the fix to that mechanism even when a similar module solved
the problem with a wider change. Use a dependency's supported capability before writing a narrower replacement.
Add an abstraction only for
a current shared responsibility, invariant, or necessary algorithm. Leave host or provider policy to
its owner, and add persistence, fallbacks, or compatibility only when the task or a supported
contract needs them, because each one is a contract someone must maintain.

If the working path grows far beyond what the request warrants, revisit the approach rather than
justify or trim it. Consider expected work, CPU, memory, I/O, and scaling when choosing the mechanism;
deferred optimization does not justify an unsuitable approach.

Keep each behavioral definition at one owner across features. Producers and consumers share that
definition rather than maintaining parallel case lists or recognition rules, which drift apart as
new input shapes appear. When changing a producer, trace its consumers, including display and
replay, and test the produced data through them. Separate operations can share definitions
without sharing their side effects.

For a simplification request, remove mechanisms or required decisions at the affected owner. Moving
code or adding a replacement layer does not simplify it.

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

Edit authoritative sources and regenerate their consumers; leave generated, vendored, and minified
outputs to their generators.

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
