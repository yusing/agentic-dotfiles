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
Skip safeguards for purely hypothetical concerns; raise any concrete unresolved tradeoff in the completion report.

## Hygiene

Inline sole-caller helpers unless they preserve shared policy, an invariant, or a nontrivial
algorithm. After a refactor, remove superseded forwarding wrappers and update their callers to
use the retained owner directly, unless a retained supported contract or explicit user requirement
needs the compatibility wrapper.

Remove behavior and artifacts the accepted change supersedes. Remove tests for superseded behavior
rather than invert their assertions merely to retain them. Preserve compatibility required by retained
supported contracts; add further compatibility only when I explicitly request it. Report unrelated
obsolete paths instead of deleting them. Edit authoritative sources and regenerate their consumers;
leave generated, vendored, and minified outputs to their generators.
