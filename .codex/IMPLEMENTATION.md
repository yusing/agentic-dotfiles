# Implementation

Choose the simplest implementation that fully meets the current requirements.
The "simplest implementation" scope does not expand merely because a review found anything.
Start with the smallest working end-to-end version, then add capabilities without regressing
behavior that the current requirements still accept. A behavior superseded by the current request
is not a compatibility obligation.

Validate through the interface that owns the changed behavior. Cover affected contracts, meaningful
failure paths, and required checks in proportion to risk. Prefer existing focused checks; add tests
when they protect behavior rather than mirror the implementation. Once sufficient checks pass,
broaden or repeat validation only for new changes, failures, or a concrete unresolved concern.

Keep the demonstrated failure and violated invariant together as the unit of implementation and
of any authorized commit. Helper code, callers, tests, documentation, and cleanup that restore the
same invariant should travel together. When the same invariant requires corresponding commits in
separate Git histories, including a parent repository and submodule, keep the complete fix together
within each history.

After implementation and before validation, reread the likely documents that own or directly
describe each changed user-facing behavior, interface, configuration, workflow, or agent
instruction. Update or remove every claim those documents retain about behavior the change
supersedes. For configuration, include nearby documentation that states the setting or its
operator workflow. Do not inspect unrelated documentation merely to prove its absence.

## Runtime behavior

When a user-facing or operator-facing operation can remain active long enough that silence
obscures whether it is progressing, expose proportional progress through the interface that owns
the operation. Reuse progress, logging, or job-state facilities already owned by the host runtime
or project instead of duplicating them. Report meaningful milestones or measurable completion,
not merely start and finish. Progress reporting must remain auxiliary and must not determine or
interfere with successful core behavior.

For a new operation, use bounded concurrency when work items are genuinely independent and
concurrency actually helps meet a requirement such as latency or throughput. Keep an existing
sequential path sequential when it already meets the current requirements; do not retrofit
concurrency merely because its work items could run independently.

## Hygiene

Keep durable artifacts focused on the final state. Code, comments, documentation, tests, commit
messages, change descriptions, and final responses should explain the resulting behavior and only
the rationale that still applies. Do not mention any rejected proposal, abandoned approach, or
anything that no longer applies.

Unless the user explicitly asks for compatibility, treat anything they correct, replace, or
remove, and anything whose validity depends on it, as superseded. Remove superseded material
rather than keeping it or describing it as something else. Removal covers every code path,
reference, test, fixture, configuration entry, documentation statement, and whole file that no
longer serves the final behavior, including obsolete portions of shared files. Do not keep a
superseded approach as a compatibility layer, wrapper, fallback, migration, a leftover kept only
to prove the old approach wrong, documentation example, or dead test.
When you stumble across an unrelated pre-existing obsolete path, tell the user and let them decide.
When you are unsure whether compatibility should be preserved, stop and ask.

An abandoned attempt, implementation, or previous state does not become a test case merely because
it existed. Do not invent an unhappy path or add a production seam solely to create a test case.
Keep test setup in test sources.

## Edit readiness

Separate responsibilities; reuse suitable project dependencies before replacing or adding them.
Prefer maintained libraries when they simplify the implementation or improve reliability.
Edit authoritative sources, not generated, vendored, or minified outputs; follow local naming,
error handling, idiom, and comment style. Comment non-obvious invariants, caller contracts,
workarounds, and tradeoffs even where nearby code has few comments; describe the final behavior.

## Complexity and ownership gate

Apply the relevant gates to design choices and review findings in proportion to their complexity
and impact. Resolve concrete concerns before keeping a mechanism; unjustified findings may be rejected.

- `N` — Ownership: leave policy with its caller, provider, runtime, or protocol owner;
  forwarding helpers must not redefine external contracts, fields, limits, or retry rules.
- `O` — Simplicity: remove duplicate representations and unnecessary abstractions. Inline a
  sole-caller helper when doing so loses no shared policy, invariant, or nontrivial algorithm.
- `D` — Duplication: rely on authoritative validation. Add checks only for a distinct boundary,
  deriving their rules from its owner rather than imposing stricter downstream policy.
- `I` — Reachability: handle accepted inputs, not impossible branches. Validate corruption or
  external mutation at the boundary where it can occur.
- `U` — Evidence: establish the owner, reproducer, failure, invariant, and consumer before adding
  convenience, limits, or compatibility behavior.
- `J` — Justified: retain a necessary responsibility, resource, invariant, shared policy, or
  nontrivial algorithm with the smallest sufficient implementation. A local resource guard is
  not an external protocol restriction.

The request establishes the need for that capability; these gates constrain its implementation,
not its scope. Explain concrete conflicts before implementing rather than silently dropping,
deferring, or narrowing requested behavior. Keep gate analysis internal unless asked about it;
report the result, evidence, and actionable caveats rather than gate labels or identifier lists.
