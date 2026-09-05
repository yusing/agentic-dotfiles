---
name: assess-change-impact
description: Once available evidence identifies a shared seam and a credible implicit-contract risk, build the pre-edit caller-by-caller impact map for that seam. Use when the current agent owns analysis of shared handlers, interfaces, middleware, callbacks, lifecycle hooks, defaults, fallbacks, protocol responses, serialization shapes, configuration meaning, or removal and replacement behavior whose callers need explicit before-and-after outcomes.
---

# Assess Change Impact

Expose a change's contract fan-out before implementation. Treat compile success and local tests as
necessary evidence, not proof that implicit callers remain correct.

## Build the impact map

1. State the requested observable outcome and the exact seam likely to change.
2. Trace every way the seam is reached:
   - direct calls and interface implementations;
   - registrations, callbacks, middleware, adapters, and lifecycle dispatch;
   - configuration, reflection, generated entrypoints, and protocol routes;
   - success, failure, stale-state, concurrent, and cleanup paths.
3. Group callers by the contract they own. Record inputs, outputs, side effects, continuation,
   retry/replay behavior, and who completes the operation.
4. Read history when a helper has an unexplained fallback, only half of a producer/consumer pair
   remains, or current names/comments no longer match usage. Establish why it was introduced and
   which invariant it originally protected.
5. Model the current and proposed outcomes for every caller. Include runtime defaults that occur
   when code merely returns, omits a value, drops a callback, or changes a response shape.

The impact map is complete when every reachable caller has one explicit before/after outcome or a
named unresolved owner. Hold implementation until this criterion is met.

## Compare operations, not just diffs

Evaluate removal and replacement separately:

- For removal, follow the control flow after the symbol disappears. Account for implicit status,
  default return values, skipped cleanup, missing continuation, and caller fallthrough.
- For replacement, compare semantics rather than syntax. Check method and body preservation,
  retry or replay, identity and authorization freshness, error propagation, ordering, caching,
  cancellation, and destination trust.
- For relocation, verify that the new component owns the policy for every caller. Prefer an
  explicit result or disposition when shared code can report mechanism while callers own
  different completion policies.

Reject a universal fix when callers require incompatible outcomes. Narrow it to the authoritative
boundary or make the shared seam return enough information for each caller to decide.

## Test reachability and invariants

Before editing, establish which callers and branches accepted inputs can reach. After editing,
validate the affected contracts with checks proportional to the change:

1. For a bug fix, the concrete reproducer fails before the fix and passes after it; for an
   intentional behavior change, the accepted before/after outcomes are verified.
2. The happy path and immediate failure path.
3. Every caller category whose contract differs.
4. An unaffected sibling path when one exists and shares behavior the change could disrupt.
5. Removal behavior and replacement behavior independently when both are part of the change.
6. Reachable boundary-specific risks, such as unsafe-method replay, redirect locality, protocol upgrade,
   serialization compatibility, authentication freshness, cancellation, and cleanup.
7. The final externally observable result, not only an intermediate status or helper return.

Prefer boundary or integration tests where the implicit contract becomes visible. Keep focused
unit tests for the shared mechanism, but do not let them stand in for caller-owned behavior.

## Change gate

Proceed with the smallest authoritative change only when:

- every reachable caller is accounted for;
- policy remains with its owner;
- implicit runtime behavior is asserted explicitly;
- incompatible callers are separated rather than normalized;
- the validation matrix covers both the reported path and the meaningful blast radius.

When the gate fails, report the concrete caller conflict and revise the design before editing. If
the required fix crosses owners, state that scope change instead of hiding it in a shared helper.

## Report

Lead with the observable result. Then report:

- the changed contract and its owner;
- caller categories affected and deliberately unaffected;
- why removal or replacement is safe;
- validation run at each boundary;
- remaining uncertainty or unvalidated integrations.
