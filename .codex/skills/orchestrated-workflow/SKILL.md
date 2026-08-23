---
name: orchestrated-workflow
description: Coordinate a verified repository change through Codex native agents.
disable-model-invocation: true
---

# Orchestrated Workflow

A user invocation selects this skill as the task's sole implementation workflow. Keep other delivery
workflows inactive for the task; the native-agent pipeline below owns implementation, review, and
completion.

The root agent owns intent, authorization, architecture, boundary declarations, scheduling, final
reporting, and relay-artifact cleanup. Implementers own edits and focused validation. Review roles
own correctness, simplification, integration, and UI inspection.

Follow active `AGENTS.md` and session-injected native-agent instructions. They own intent
verification, inspection approval, and active-process safety. Role descriptions own their
`fork_turns` guidance and role files own communication and execution contracts.

## Route communication by consumer

Keep a direct main-agent exchange in messages. Give a spawned role its self-contained task directly,
and have it return the complete result directly when the root is the sole consumer. Do not encode
root-authored context in an input artifact or require a result artifact for that exchange.

When one spawned agent's output will become another spawned agent's input, create one task-scoped
directory with `mktemp -d` and allocate an exact result path under a category such as
`exploration/`, `implementation/`, or `review/`. The producer writes the complete result there and
returns a compact routing manifest. Give the downstream consumer the exact path as an input
artifact. The root is an intermediary for that exchange: schedule from the manifest and relay the
path without opening, summarizing, or reproducing the artifact.

If a manifest cannot settle scope or authorization, return to its producer or ask the user. If a
consumer reports that an artifact is missing, stale, or contradictory, return that report to the
producer. The root does not inspect the artifact to resolve either case.

Create no artifact root until the first relayed agent-to-agent result needs one. Keep it until every
downstream consumer has finished. Remove the complete root, including every category, before the
final response. Never remove it while an agent or process may still use it.

## Establish operation-ready slices

Establish each slice from the operation-ready evidence gathered under active `AGENTS.md`. Put exact
source and test paths in the implementer's direct handoff. When an exploration result is relayed
agent-to-agent, give the implementing consumer its artifact path without summarizing it.

Use the resulting boundary evidence to declare slices. A slice needs one observable outcome, one
coherent owner, required behavior and edge cases, invariants and exclusions, a falsifying check,
and interactions. The implementer consumes any relayed exploration artifact in full.

## Implement

Use `fast-implementer` for a narrow settled change and `implementer` for a substantial coherent
change. Spawn one fresh agent per ownership slice with:

```text
Outcome:
Ownership:
Input artifacts:
Required behavior:
Invariants:
Exclusions:
Validation:
Coordination:
Result artifact:
```

Omit `Input artifacts` when no upstream agent produced evidence. Omit `Result artifact` when the
root is the sole consumer. When review roles will consume the implementation result, allocate the
result path and tell the implementer that the artifact is a relayed agent-to-agent result.

Give each agent exclusive production and test ownership. State that the worktree is shared and
unrelated edits belong to others. Run non-overlapping slices concurrently when useful.

The root does not edit repository files or run validation a spawned role can run itself.
Implementers own the complete change, directly owned tests, and focused checks. A follow-up is only
for clarification or correction inside the original boundary; a new boundary gets a fresh agent. A
correcting agent revises its own implementation artifact in place when another agent still consumes
that result; otherwise it answers the root directly.

## Validate what the roles cannot

Container and orchestration commands are denied to every spawned role, so the root owns that layer.
Once implementation manifests report complete and before spawning any review role, decide whether
the delivered behavior carries a container, service, or other external dependency that in-process
checks cannot falsify. A returned blocker naming such a command is the explicit signal.

When it does, run that validation from the root and include the commands and results directly in
each review role's handoff alongside the implementation artifacts. When the environment is
unavailable, include that stated gap instead of presenting the change as verified.

Running that validation is not inspection. The root still does not read changed source to judge
correctness, and a failure returns to the owning implementer as a correction inside its original
boundary.

## Review and correction

After implementation, the root does not inspect the worktree or diff, read source to verify the
change, rerun a role's focused checks, or judge correctness. Route implementation artifacts and the
root's direct validation results to the review roles under the session-injected approval and rerun
rules.

The three review roles are the exclusive inspection owners:

- `reviewer` owns correctness and cross-slice integration.
- `simplify-checker` owns behavior-preserving simplification.
- `web-reviewer` owns UI blast-radius review when the change includes web or frontend work.

Spawn all applicable approved roles before waiting. Give each the exact scope directly, every
relevant implementation artifact, and its own result path because a correction implementer may
consume the review. Their full reports go to review artifacts and their terminal responses remain
compact routing manifests.

Route actionable review artifacts to the original implementer for in-boundary correction. The root
does not adjudicate findings. The implementer consumes the full reports, applies fixes, validates
them, and revises its existing implementation artifact in place. A scope or authorization conflict
returns to the root as a manifest-level blocker; a new owner gets a fresh implementation slice.

An approved rerun revises the review role's own artifact in place: an updated disposition per prior
finding plus anything genuinely new. Neither a rerun nor an approval reproduces content the artifact
already holds.

## Complete

Reconcile the changed-path set before reporting. Compare `git status --short` or
`git diff --name-only` against the ownership declared in the implementation manifests. This is
path-level bookkeeping rather than inspection: it reads the set of changed paths, not their
contents. A path no manifest claims is an undeclared change and no review role has it in scope, so
route it to its owning slice or declare a new one before completing. A claimed path missing from the
worktree contradicts its manifest and returns to that implementer.

Completion is established by implementation and review manifests plus that reconciliation, not by
root inspection of the change. Report the delivered behavior, changed paths, validation summaries,
review dispositions, and remaining risks from direct results and manifests. Clean the complete
artifact root before the final response.
