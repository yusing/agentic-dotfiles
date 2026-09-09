---
name: route-execution
description: Select and brief execution agents once delegation is chosen for implementation, drafting, or mechanical work; coordinate multiple owners when their outcomes need integration. Not for deciding task scope, review-only work, or replacing an active delivery workflow.
---

# Route execution

Use after delegation is selected under the active task guidance. `IMPLEMENTATION.md` owns the
local-versus-delegated execution decision and validation; shared instructions own authorization,
agent reuse, and review gates. This skill owns delegate selection, handoffs, and multi-owner
coordination. A single-owner assignment uses only selection and briefing below; task completion
still follows the active task guidance. Later sections apply only to multi-owner coordination.

## Select and brief the delegate

Choose a role by the assignment's remaining uncertainty, required capability, and available
harness tools. Give the outcome, owned paths, settled contracts, exclusions, checks, and escalation
conditions. Supply needed decisions, not an implementation tutorial. Bundle related small work
and use only history that helps the delegate avoid rediscovery.

### Codex model selection

These settings apply only to Codex; other harnesses retain their native role and model settings.
Keep Astra on orchestration, difficult reasoning, and quality judgment. For `implementer`, main
explicitly chooses `gpt-6-astra` with `low` reasoning for unresolved local complexity, or
`gpt-5.6-sol` with `high` reasoning for settled contracts needing sustained implementation work.
Use `fast-implementer` for small settled changes, with its configured budget. For narrow,
repeatable edits or drafting, use an available write-capable worker with `gpt-5.6-luna`;
`explorer` stays read-only. Task size alone does not justify Astra execution.

Send both model and reasoning effort on each `implementer` spawn. Where full-history forks
prevent overrides, use `fork_turns="none"` or a supported recent-turn count and supply missing
task context. If the required role or override is unavailable, report the gap rather than
silently inheriting a different budget.

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
