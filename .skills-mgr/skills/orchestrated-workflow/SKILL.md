---
name: orchestrated-workflow
description: Orchestrate authorized implementation when substantial independent outcomes can run in parallel or coupled behavioral owners need explicit integration handoffs. Reduce ownership collisions, evidence loss, and repeated checks. Not for isolated edits, review-only tasks, or replacing an active delivery workflow.
---

# Orchestrated Workflow

Active guidance governs authorization, agent invocation and reuse, review gates, safety, cleanup,
and Git operations. This skill adds coordination, not a second copy of those rules.

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

## Delegate proportionally

Use `fast-implementer` for narrow settled work and `implementer` for substantial coherent work.
Root may handle a tiny, isolated, settled change when delegation adds more overhead than value,
provided it has no shared lifecycle/protocol implications and overlaps no delegated ownership.
If those conditions stop holding, transfer the coherent slice and its evidence instead of expanding
the exception. Agent reuse follows behavioral ownership and useful context, not commit count.

## Preserve producer evidence

For agent-to-agent handoffs, the producer publishes complete evidence and the downstream consumer
receives that original artifact. If a message-only result later needs another agent's inspection,
ask its producer to publish the handoff; root does not reconstruct it from a summary.

Root may read evidence needed for architecture, intent, or conflicting contracts. Such reading must
not substitute a root-authored summary for the downstream agent's original evidence. Corrections
remain producer-owned and identify the applicable revision; return stale or contradictory artifacts
to their producer.

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
