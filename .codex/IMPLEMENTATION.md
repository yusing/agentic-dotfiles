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

## Hygiene

Inline sole-caller helpers unless they preserve shared policy, an invariant, or a nontrivial
algorithm, or isolate complex validation so the caller reads as the happy path. Keep supporting
helpers close to their callers. After a refactor, remove superseded forwarding wrappers and update
their callers to use the retained owner directly, unless a retained supported contract or explicit user requirement
needs the compatibility wrapper.

Remove behavior and artifacts superseded by the accepted change. Remove tests for superseded behavior
rather than invert their assertions merely to retain them. Preserve compatibility required by retained
supported contracts; add further compatibility only when explicitly requested. Report unrelated
obsolete paths instead of deleting them. Edit authoritative sources and regenerate their consumers,
not generated, vendored, or minified outputs.

## Boundaries and code style

Validate unknown input at its owning boundary, then pass typed values inward. Trust guarantees
already established by schemas, constructors, or internal types. Prefer supported schema decoders
to hand-written parsing and repeated checks.

Prefer immutable bindings, early returns, and simple conditional expressions over reassignment
and nested branches. Inline single-use values when a name adds no clarity; retain qualified access
when destructuring would obscure context. Use collection transformations when clearer than loops.

Where the language supports inference, omit redundant annotations while keeping public contracts
and unclear types explicit. Avoid types that bypass checking. Prefer named imports and original
names; alias only when needed to resolve a collision or clarify meaning. Load heavy, conditionally
used modules in the narrowest scope that needs them when startup cost matters.

Keep synchronous parsing, validation, and option construction synchronous. Catch failures where
recovery or useful context belongs rather than wrapping every call. Comment on non-obvious
constraints and surprising behavior, not obvious operations.

For themed interfaces, select tokens by semantic role rather than current appearance. Add a
missing role at the theme owner instead of borrowing an unrelated token; check supported themes
and custom-theme fallbacks when changing that contract.

For event-sourced systems, persist irreducible facts and derive redundant state in projections
or read models rather than duplicating it in durable events.
