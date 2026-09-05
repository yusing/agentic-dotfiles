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

Keep components modular and responsibilities separate.
Reuse suitable project dependencies before writing a replacement or adding a package.
Prefer maintained libraries when they reduce complexity or improve reliability.

Edit authoritative sources rather than generated, vendored, or minified outputs.
Match the local naming, error handling, idiom, and comment density. Let local style set a
comment's form, but let the final state set its content; the cases below matter even when the
local code has few comments.

Write a comment wherever the reason for the code cannot be recovered from the code itself: the
invariant a check protects, the caller contract a signature cannot state, the external behavior
that forced a workaround, or the reason a non-obvious choice beat the obvious one.

## Complexity and ownership gate

Apply the relevant gates to design choices and review findings in proportion to their complexity
and impact. A finding may be rejected when the gates do not justify it.

- `N` — Does another component own this responsibility?
  Is the policy owned by the caller, the upstream provider, the host runtime, an external
  protocol, or another boundary? Would the proposal invent or redefine an external request,
  response, identifier, metadata field, argument, limit, or retry policy? Would it take a policy
  choice away from its authoritative caller and put it in a helper or wrapper that merely selects
  or forwards existing operations?

- `O` — Is the proposal more complex than the demonstrated problem requires?
  Does it add an unnecessary abstraction, duplicate representation, or maintenance cost? Could
  streaming, hashing, direct comparison, or a simpler implementation solve the same problem with
  fewer resources? For a proposed abstraction, try deleting it. If that only moves its body
  unchanged into its sole production caller without losing a shared policy, owned invariant, or
  nontrivial algorithm, inline it.

- `D` — Is an authoritative owner already enforcing this policy?
  Would the proposal repeat validation, copy a limit across components, or impose a stricter
  downstream rule on data already bounded at the accepted-input boundary? Add another check only
  when it protects a distinct boundary and derives its rule from the authoritative owner.

- `I` — Can accepted inputs actually reach this case?
  If the branch is impossible under established contracts and invariants, do not handle it as a
  normal condition. If corruption or external mutation is the real threat, validate that invariant
  at the relevant boundary.

- `U` — Is the need still speculative?
  Are the owner, reproducer, immediate failure, violated invariant, or actual consumer unknown? Do
  not add convenience, count limits, size limits, or compatibility behavior until those are
  established.

- `J` — Justified: Does this project own a necessary responsibility, resource, invariant, shared
  policy, or nontrivial algorithm?
  Name what it owns, describe the local failure or need, and choose the smallest sufficient
  implementation. Keep an abstraction only if its responsibility still matters after the deletion
  test, and do not present a local resource guard as an external protocol restriction.

Resolve concrete ownership, duplication, reachability, and complexity concerns before keeping a
proposed mechanism.

This gate never rejects a capability the user explicitly asked for. The request establishes the
need for that capability, but its implementation structure must still pass the ownership,
duplication, reachability, and complexity checks. Keep the gate analysis internal. In responses,
focus on the requested result, evidence, and actionable caveats. Include gate labels, identifier
inventories, or smallest sufficient alternatives only when directly answering a question about
them. Never silently drop, defer, or narrow a requested capability because of the gate. If the gate
shows the request cannot work as stated, explain the concrete conflict before implementation.
