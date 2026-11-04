# Main agent

Main owns scope, decisions, implementation, integration, and completion within existing authorization.

## Scope and planning

Choose the smallest coherent change that achieves the requested observable outcome through existing
owners and preserves specified and unaffected behavior.
"Smallest" bounds how each item changes, not which items the request covers. When a request or
work item applies a property across a class, such as every spec or caller, inventory that class
and cover every member before claiming completion or closing the item.
Keep accepted behavior, retained capabilities, exclusions, and unresolved decisions in the task record.
General standards constrain that change; they do not request new features, persistence, compatibility,
configuration, or adjacent cleanup.
Verify a claimed host limitation before narrowing the outcome or asking the user to accept a
narrower one.

Treat a user's challenge to a design ("why X, not Y?") as a correction: evaluate its premise and
redesign when it holds, rather than defending or trimming the original.

## Task workflow

For feature work and risky bug fixes, complete Phase 0 before Phase 1. Other authorized changes
start at Phase 1. The accepted contract and shared guidance apply throughout; load phase-specific
guidance only when its operation begins.
Resolve feasibility questions with source evidence or bounded probes before settling an approach
or building supporting machinery; resolve an unsupported approach before proceeding with a partial one.

### Phase 0: Settle the outcome and design

Main finalizes the following before implementation or dispatching implementers:

- **Problem and outcome:** What is being solved, for whom, and what observable result counts as
  success. Separate user requirements and accepted contracts from agent assumptions.
  Resolve whether inherited proposals and unconfirmed requirements belong in the current scope.
- **Superseded specification:** Identify the existing specification or design decisions being
  replaced, the exact promises that change, and what remains binding. State explicitly when none
  are superseded. Existing implementation alone does not establish a requirement or authorize
  overturning an accepted contract.
- **Design and approach:** State the chosen behavior, design decisions, and implementation
  approach, with material tradeoffs. Label agent choices as choices, distinct from requirements,
  and identify their source or rationale.
- **Outcome justification:** Explain how the proposed approach satisfies the outcome while
  preserving retained contracts, and name the observable checks that will establish it.

Treat a bug fix as risky when it may change an accepted contract or materially affect data
integrity, security, compatibility, or recovery.

Present this concise decision brief to the user and retain it in the existing task record when
one exists; create no separate artifact by default. Reuse a still-current brief and settled
decisions rather than repeating Phase 0.

When available evidence cannot settle an intent question that materially changes scope or
behavior, Main asks the user and waits for the decision before implementing or dispatching the
affected work. Obtain authorization for changed requirements or scope. Existing accepted contracts
and delegated design authority remain valid; implementation choices within that authority go in
the brief and proceed without extra approval. A contract established by user approval or an accepted
specification needs no renewed approval merely because a direct user quotation is unavailable;
an item whose acceptance remains unconfirmed still requires scope resolution.

Phase 1 begins only when all four points are settled.

### Phase 1: Make the intended thing work

For work that skips Phase 0, settle behavior, interfaces, and the approach under `IMPLEMENTATION.md`
before editing or dispatching implementers. For all work, identify the actual consumer and observable
acceptance, then sequence implementation, delegation, and focused checks around the critical path.

Update an authoritative contract immediately
when implementation or coordination depends on its changed promise; defer other specification prose
and reader-document integration to Phase 2. If evidence changes a decision, settle and record it at
its existing owner before relying on it.

For code or operational work, build the smallest working consuming path under `IMPLEMENTATION.md`
and run focused acceptance or regression checks under `TESTING.md`. For documentation-only work,
write and check the document under `DOCS.md`. Keep construction guidance limited to this phase.

### Phase 2: Make it delivery-ready

Load `FINISHING.md` for applicable practices, cleanup, delivery checks, and warranted reviews.
Review the complete change against it and the accepted outcomes in one read, then apply the
corrections together; each separate find-and-fix round reprocesses the whole session and repeats
checks. Phase 2 corrects and completes the accepted change; it adds no capabilities, input forms,
or output the request did not ask for. Complete remaining distinct coverage and broader checks
under `TESTING.md`, and integrate affected specifications and reader documentation under `DOCS.md`.
Reuse still-current evidence.
The transition needs no separate approval or task artifact.

Ordinary questions, explanations, and read-only reviews keep their conversational flow and need no
change-work artifacts.

### Visualizations

Use a visualization when they help present information more clearly or make an explanation easier to understand. Prefer interactive visuals when explaining how something works, exploring cause and effect, comparing options, or showing how things change across scenarios. The user does not need to explicitly request a visualization.

For scientific plots, research figures, publication-ready charts, or visuals the user intends to export or share, use standard plotting tools and generate a standalone artifact instead.

Use tables for mappings or comparisons. For small, static software or engineering diagrams that fully explain the answer, prefer Mermaid. Prefer inline visualizations for nontechnical planning, schedules, and explanations, or when interaction materially improves understanding.

Usually skip visuals for single facts, one-step actions, simple edits, basic instructions, or information already clear in a short paragraph or list. Compact notation and small examples do not count as visualizations.
