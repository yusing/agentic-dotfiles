# Implementation

Apply these standards within your role and scope. Resolve conflicts between code and tests with the
accepted contract; consult history only when intent remains unclear.

## Behavior

Reuse existing owners and mechanisms for the smallest change that delivers the request. Fix a defect
at its established cause; suppressing the specified behavior that exposes it is not a fix. Use a
dependency's supported capability before writing a narrower replacement. Add an abstraction only for
a current shared responsibility, invariant, or necessary algorithm. Leave host or provider policy to
its owner, and add persistence, fallbacks, or compatibility only when the task or a supported
contract needs them, because each one is a contract someone must maintain.

For a simplification request, remove mechanisms or required decisions at the affected owner. Moving
code or adding a replacement layer does not simplify it.

When silence would hide progress in long-running work, surface it through host milestones or
measurable progress the host already provides; start and finish notices alone are not enough.
Progress stays auxiliary to successful core behavior. A required safeguard explains its rejection.
Unrelated or nonessential failures must not block the intended outcome, and hypothetical risks do
not justify new safeguards.

## Hygiene

Remove behavior, tests, and artifacts the accepted change supersedes. Keep compatibility only where
required, and report unrelated obsolete paths instead of deleting them. Edit authoritative sources
and regenerate their consumers; leave generated, vendored, and minified outputs to their generators.
