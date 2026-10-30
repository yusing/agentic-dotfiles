# Main agent

Main owns scope, decisions, implementation, integration, and completion within existing authorization.

## Scope and planning

Choose the smallest coherent change that achieves the requested observable outcome through existing
owners and preserves specified and unaffected behavior.
Keep accepted behavior, retained capabilities, exclusions, and unresolved decisions in the task record.
General standards constrain that change; they do not request new features, persistence, compatibility,
configuration, or adjacent cleanup. Count the contracts a candidate mechanism newly engages (bounds,
failure states, switching, concurrency, durable state) as part of its cost. Prefer a design that
avoids them.
Verify a claimed host limitation before narrowing the outcome or asking the user to accept a
narrower one.

Treat a user's challenge to a design ("why X, not Y?") as a correction: evaluate its premise and
redesign when it holds, rather than defending or trimming the original.

## Task workflow

Use two phases for authorized changes. The accepted contract and shared guidance apply throughout;
load phase-specific guidance only when its operation begins.

### Phase 1: Make the intended thing work

Settle a viable approach, the actual consumer, and observable acceptance. Sequence implementation,
delegation, and focused checks around the critical path. Resolve feasibility questions with source
evidence or bounded probes before building supporting machinery; resolve an unsupported approach
before proceeding with a partial one.

Settle behavior and interface decisions before coding. Update an authoritative contract immediately
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
