---
name: route-execution
description: Route main with unsettled execution ownership to IMPLEMENTATION.md, then select and brief delegates for implementation, drafting, or mechanical work when delegation is chosen. Coordinate multiple owners as needed. Not for already-assigned subagents, review-only work, or replacing an active delivery workflow.
---

# Route execution

Use when main has unsettled execution ownership or is assigning delegated work. If ownership is
unsettled, consult the execution-ownership section of `$HOME/.codex/IMPLEMENTATION.md`. When direct
execution is selected, return to the task guidance without dispatching. Already-assigned subagents
do not need this skill.

`IMPLEMENTATION.md` owns the execution decision and validation; shared instructions own
authorization, agent reuse, and review gates. This skill owns delegate selection, handoffs, and
multi-owner coordination. A single-owner assignment uses only selection and briefing below;
task completion still follows the active task guidance. Later sections apply only to multi-owner
coordination.

## Select and brief the delegate

Apply the shared role-selection policy. Give the outcome, owned paths, settled contracts,
exclusions, checks, and escalation conditions. Supply needed decisions, not an implementation tutorial. Bundle related small work
and use only history that helps the delegate avoid rediscovery.

## Select when coordination pays

Use native orchestration when operation-ready evidence identifies either:

- Multiple substantial, independently owned outcomes that can progress concurrently.
- A coupled change whose behavioral owners need explicit implementation and integration handoffs
  to preserve a concrete contract or lifecycle invariant.

Delegation must be available and permitted. File count, repository size, or available agent slots
alone do not justify orchestration. The intended benefits are fewer ownership collisions, intact
handoff evidence, earlier discovery of incompatible constraints, and fewer repeated checks.

## Declare behavioral owners

Root defines each slice by its observable outcome and invariant, not merely its directory or commit.
Assign one accountable implementation owner, exact production/test paths, exclusions, a falsifying
check, and interactions. When an invariant crosses file owners, name cooperating owners and order
handoffs rather than dividing away the required behavior.

For a risky lifecycle, establish before implementation what proves ownership or completion, when
that proof expires, and what survives cancellation or replacement. Assign cross-boundary validation
to an explicit integration owner; an existing implementer can fill that responsibility.

## Preserve producer evidence

Apply the shared artifact and producer-ownership policy in AGENTS.md. Return stale or
contradictory artifacts to their producer with the applicable revision.

Keep one compact coordination record in the existing handoff or task record, not a parallel report:

- Slice owner, paths, invariant, dependencies, and integration owner where needed.
- Implementation revision or source snapshot and current status.
- Validation: covered behavior, result, evidenced baseline failures, and invalidating changes.
- Review: scope, applicable revision, findings, dispositions, and remaining gaps.

This makes existing validation and review reusable without treating older evidence as proof of a
changed contract. Keep implementation, required inspection, integration, and commit status distinct.

## Route findings and reconcile completion

Apply the standing review gates. Ask reviewers to classify each finding independently by:

- Attribution: introduced regression, incomplete requested fix, or pre-existing issue.
- Evidence: reproduced, source-established, or uncertain, including the confirmation gap.

Severity alone does not establish attribution or certainty. Route complete findings to the
accountable implementer; root resolves scope and ownership, while conflicting technical evidence
returns to the responsible implementer or reviewer for resolution.

Before reporting completion, reconcile current owner records with the actual changed paths and
cross-slice interactions. Resolve unowned changes or missing claimed work; report implementation,
review, and integration status separately rather than equating a checked item with a reviewed whole.
