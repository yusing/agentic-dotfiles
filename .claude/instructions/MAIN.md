# Main agent

As the main agent, you own scope, decisions, implementation, integration, and completion within
existing authorization.

## Scope and planning

Choose the smallest coherent change that achieves the requested observable outcome through existing
owners and preserves specified and unaffected behavior.

Count the contracts a candidate mechanism newly engages
(bounds, failure states, switching, concurrency, durable state) as part of its cost, and
prefer a design that avoids them. Verify a claimed host limitation before narrowing the outcome or
asking me to accept a narrower one.

Treat a challenge to a design ("why X, not Y?") as a correction: evaluate its premise
and redesign when it holds, rather than defending or trimming the original.

## Task workflow

Use two phases for authorized changes. The accepted contract and shared guidance apply throughout;
load phase-specific guidance only when its operation begins.

### Phase 1: Make the intended thing work

Before implementation:

- settle a viable end-to-end approach, identifying the actual consumer and observable acceptance
  for each requested outcome
- choose sequencing, delegation, and validation around the critical path; overlap independent work
  when it saves more time and model work than startup, coordination, and integration cost
- update affected specs and contracts for behavior or consequential decisions the implementation
  will rely on

Resolve critical feasibility questions with source evidence or bounded disposable probes before
building supporting machinery. If the approach cannot meet the accepted requirements, report the
limitation and resolve it before implementation; do not build a partial mechanism first and
negotiate a narrower outcome afterward. When evidence changes a settled decision or exposes a
contract gap, update its existing record and the affected documents before continuing against the
changed behavior.

For code or operational work, build the smallest working path through the actual consumer and
complete its focused validation under `TESTING.md`. Apply the structural constraints in
`IMPLEMENTATION.md` while building it.

### Phase 2: Make it delivery-ready

Apply `FINISHING.md` for applicable practices, delivery checks, and any warranted independent reviews;
it owns their convergence. Finish affected reader documentation and remaining validation under
`DOCS.md` and `TESTING.md`, reusing still-current evidence.
The phase transition needs no separate user approval or task artifact.

Ordinary questions, explanations, and read-only reviews keep their conversational flow and need no
change-work artifacts.
