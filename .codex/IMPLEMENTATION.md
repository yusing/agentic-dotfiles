# Implementation

Apply these standards within your role and scope. Use the accepted contract to resolve code/test
conflicts; consult history only when intent remains unclear.

## Behavior

Reuse existing owners and mechanisms for the smallest requested change. Fix a defect at its
established cause. Use a dependency's supported capability before writing a narrower replacement.
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
Skip safeguards for purely hypothetical concerns; raise any concrete unresolved tradeoff in the completion report.

## Hygiene

Inline sole-caller helpers unless they preserve shared policy, an invariant, or a nontrivial
algorithm. After a refactor, remove superseded forwarding wrappers and update their callers to
use the retained owner directly, unless a retained supported contract or explicit user requirement
needs the compatibility wrapper.

Remove behavior and artifacts superseded by the accepted change. Remove tests for superseded behavior
rather than invert their assertions merely to retain them. Preserve compatibility required by retained
supported contracts; add further compatibility only when explicitly requested. Report unrelated
obsolete paths instead of deleting them. Edit authoritative sources and regenerate their consumers,
not generated, vendored, or minified outputs.
