# Implementation

Apply these standards within your role and scope. Use the accepted contract to resolve code/test
conflicts; consult history only when intent remains unclear.

## Behavior

Reuse existing owners and mechanisms for the smallest requested change. Fix a defect at its
established cause; suppressing specified behavior that exposes it is not a fix. Add an abstraction
only for a current shared responsibility, invariant, or necessary algorithm, not possible future
use. Avoid duplicating host/provider policy or adding persistence, fallbacks, or compatibility the
task and supported contracts do not need.

For work whose silence hides progress, reuse host milestones or measurable progress. Start/finish
notices alone are insufficient; progress must remain auxiliary to successful core behavior.
Required safeguards explain rejection. Unrelated or nonessential failures must not block the
intended outcome; do not add safeguards for hypothetical risks.

## Hygiene

Remove behavior, tests, and artifacts superseded by the accepted change. Keep compatibility only
when required; report unrelated obsolete paths instead of deleting them. Edit authoritative sources
and regenerate their consumers, not generated, vendored, or minified outputs.
