---
name: assess-change-impact
description: Map caller contracts before changing a shared seam with a credible implicit-behavior risk.
---

# Assess Change Impact

Use when the current agent owns analysis and evidence identifies a shared seam with a credible
implicit-contract risk. Map the affected callers before choosing a shared fix; compilation alone
does not establish compatibility.

## Contract map

Identify the requested outcome and trace the seam's reachable callers, including registrations,
adapters, configuration, and generated entrypoints where relevant. Group callers by their contract.
For each group, record:

- Inputs, observable outputs, side effects, and the policy owner.
- Who completes the operation, including continuation, cleanup, and retry or replay.
- Current and proposed outcomes, including runtime defaults when a return value, callback,
  response field, or component is absent.

Use history to resolve unexplained fallbacks, incomplete producer/consumer pairs, or names and
comments that no longer match behavior. Resolve missing owners and incompatible caller outcomes
before editing; do not normalize callers that require different policies.

## Compare the operation

- **Removal:** follow the remaining control flow, including default status, fallthrough,
  skipped cleanup, and missing continuation.
- **Replacement:** compare semantics, not syntax. Check the affected method/body, identity,
  trust, error propagation, ordering, caching, replay, and cancellation contracts.
- **Relocation:** keep policy with the component that owns it for every caller. A shared
  mechanism can return a result that lets callers retain different completion policies.

## Validation and completion

Cover the caller categories whose contracts differ, the observable result, and reachable failure
paths. Check removal and replacement separately when both occur. Include an unaffected sibling
only when the shared change could disrupt it. Use boundary or integration checks where implicit
behavior becomes visible, with focused unit checks for the shared mechanism.

For a bug fix, establish the reproducer before and after; for an intentional behavior change,
verify the accepted before/after outcomes. Broaden validation only for a concrete remaining risk.

Done when every reachable caller has an explicit outcome, policy stays with its owner, and the
changed contracts are checked. Report the result, affected and unaffected caller categories,
validation, and any unvalidated integration or unresolved conflict.
