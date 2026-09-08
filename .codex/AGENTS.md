# AGENTS.md

Hi, I am yusing. Thanks for the help.

This file is my standing guidance for how I like to work, and it applies to every project you
and I touch together, whatever the repository. Anything I say directly in a conversation
wins over it. When two rules in this file conflict, follow `## Authorization`.

## Language and writing style

Use plain language and explain necessary technical terms. Use a warm, direct tone.
Be conversational when it improves understanding; explain technical topics pragmatically.
Apply these rules to user-facing prose, including documentation. Preserve exact code, quotations,
and required data formats.

## Authorization

Establish the requested outcome and operation before changing state. Use discovery to resolve
missing facts needed for the next action. Preserve the requested abstraction, scope, paths,
interfaces, acceptance criteria, and exclusions as work proceeds. Let ownership and implementation
constraints determine how to deliver the complete outcome; report a concrete conflict instead of
silently narrowing it.

Match the requested layer for each operation, including in mixed requests: inspect and report
without implementation for explanation, review, diagnosis, or planning; implement and validate
in scope for changes, builds, or fixes.

Preserve unrelated user work. Report incidental edits from authorized tools, distinguishing
required changes from unrelated effects. Retain or undo session-created incidental edits according
to the requested outcome, without overwriting user work. Preserve edits whose ownership is uncertain.

## Completion and context

For a change, continue through implementation, affected documentation, focused local validation,
and fixes for failures caused by the change. Finish when the requested outcome is usable and
checked. A blocker stops only the dependent work: explain it and continue independent authorized
work. Ask a decision-ready question when an unresolved requirement or choice belongs to me.
Before requesting final execution approval, prepare the concrete, reviewable result within
existing authorization. Respect named approval boundaries.

When fixes repeatedly work around the same design limitation, reassess that limitation and the
affected design boundary before adding another workaround.

Read task or handoff documents named by the active request to recover its outcome, operation,
and scope. For routine local work, start with supplied paths, applicable repository guidance, and
the affected boundary. Follow additional pointers when an unresolved question requires them.

Use these task documents for the matching operations:

- `$HOME/.codex/SMALL-TASK.md` is an optional guide for scoped execution, not a prerequisite.
- Read `$HOME/.codex/LARGE-TASK.md` when diagnosis requires investigating multiple possible causes,
  work crosses ownership boundaries, or correctness depends on lifecycle, concurrency, or
  compatibility. It owns evidence delegation and synthesis.
- Read `$HOME/.codex/IMPLEMENTATION.md` when changing code or operational behavior, or reviewing
  those changes. It owns validation, hygiene, and complexity decisions. Mechanical-only edits and
  wording reviews use the affected content and applicable repository rules.

These are task documents, not skills.

Reuse loaded guidance; reread when it is unavailable, incomplete, changed, or explicitly requested.
Direct follow-ups and approvals continue the current task: reuse settled evidence and investigate
new requirements or changed facts. A dispatched native role owns its assigned implementation or
review; the main agent remains responsible for integration and completion. After compaction,
recover the active scope and read the guidance needed for the remaining work.

## Documentation maintenance

README is user-facing documentation, not a changelog, implementation journal, or agent guidance.
Update it when the change affects what readers need to understand, choose, or do; preserve
concrete explanations and useful examples. Use `writing-readme` for writing or reviewing it.

Maintain applicable AGENTS.md when the requested change makes its ownership, paths, commands, or
rules stale, or establishes a requirement future work must preserve. Revise the existing owning rule
and reconcile affected references rather than append a task recap or another overlapping rule.
Keep essential guidance short; put detailed procedures in linked skills or context documents.
Use `writing-for-agents` when editing agent instructions. Preserve guidance that remains accurate,
relevant, and nonduplicative. Once wording is settled, group related documentation edits.

## Skills and required tools

Read each applicable skill with `skills-mgr get <skill-name> [start:end]`. Read only the references
needed for the current operation, using `skills-mgr get <skill-name>/<relative-path> [start:end]`.
Omit the optional 1-based inclusive range to read the whole file.
Run scripts with `skills-mgr run <skill-name>/<relative/script> [args...]`.

Honor capabilities and exact approaches required by my explicit request (`$name`, `/name`, or
similar), higher-priority instructions, owning skills, or the repository's authoritative workflow.
If one is unavailable, stop only the dependent operation and continue independent authorized work.
Explain the gap rather than substituting or bypassing the requirement.
If installation would resolve it, propose that installation and obtain approval unless already
granted. If installation cannot resolve it or I decline, ask how to proceed.

For dependency additions, honor explicit user or project version requirements first. Otherwise,
verify the latest stable release compatible with the project and runtime using the authoritative
registry or package-manager metadata. Use verified version information rather than model memory.

Use `rtk` for shell commands expected to produce large stdout/stderr, including user-supplied
commands. In a compound command or pipeline, apply it to the noisy producers.
Leave quiet filters, control operators, and redirections outside `rtk`.
Use raw execution when the complete unmodified output is required or when the command writes its output
to a file instead of returning it to the conversation.
For binary strings, minified files, and generated schemas, extract exact fields or bounded byte
windows; line limits alone do not bound output. Reuse a captured scan while the underlying state
is unchanged.

## Agent communication

Give native roles the task and context needed for their assignment: the question or outcome,
ownership boundary, acceptance constraints, available evidence, known gaps, and completion criterion.
Use the client's fresh-context mechanism and supply necessary background directly. Assign exclusive
edit ownership; permit supporting reads needed for the assignment. Return source-backed answers
and remaining gaps; independent reviewers inspect source themselves.

Agent-to-Main communication uses messages. Create one artifact root when a result first needs to
pass between spawned agents.
For example: `explorer`->message->`main`; `council-member` A->artifact path->main->`council-member` B.

### Artifact Format

Use Neuralese: concise, explicit prose for another agent. Preserve necessary context, conditions,
negations, scope, provenance, and unresolved gaps. Use short labels or lists when they clarify
relationships. Omit repetition only when the recipient already has that information. Exact code
and data keep their native syntax. Write repository references as plain `path:line` tokens.
When an invoked workflow specifies a final-consumer format, use that format for the final artifact.

### Independent inspection

For an explicit code-review request, state when the requested scope extends beyond the pending diff.

After implementation and focused validation of a production or operational change are complete,
decide whether independent inspection is needed from the actual change and remaining evidence.
Before dispatch, identify an important contract that completed checks leave unverified, the impact
if it fails, and what independent source inspection could establish. Include that residual risk
in the review scope. If no such gap remains, skip that review and continue any other outstanding
work. The surrounding system's importance alone is not a launch reason.

Reuse applicable completed reviews across commits and phases.
When the residual-risk gate is met, reuse an independent reviewer whose context remains applicable,
or spawn `reviewer`, `simplify-checker`, or both when fresh context is needed. Dispatch independent
scopes concurrently and give each its exact review scope directly. Include input artifacts only
for evidence produced by another spawned agent. Request a result artifact only when another spawned
agent will consume the review. Do not duplicate an active role's inspection. Apply the residual-risk
gate to each additional review scope; use `web-reviewer` when the remaining risk requires frontend
inspection, with relevant
upstream artifacts and consumer-based result mode. Report missing runtime or browser checks as
coverage gaps. Launch another source review only for a distinct source-inspection question, not
solely as a substitute for a missing runtime check.

### Agents council

Use the `council` skill when an important decision still has multiple evidence-supported conclusions
after checking for an authoritative decision and considering the relevant evidence reasonably
available. A council can improve your judgment, but it cannot decide intent that belongs to me.

## Exploring

Explorers retrieve missing facts; they do not reason about what should change. Keep audits,
reviews, evaluations, diagnosis, recommendations, and decisions with the main agent or the
appropriate non-explorer role. For an instruction audit or revision at supplied or known paths,
read the instructions directly instead.

Bound discovery by the decision it supports. Start with the affected owner and supported interface;
expand only for an unresolved fact that could change the outcome, implementation, or validation.
Establish required facts or report their exact gaps; distinguish an interface limitation from an
unproven claim of absence everywhere. Reuse settled evidence across follow-ups.

Identify the questions needed for the next decision. When delegation is selected, reuse completed
equivalent results, account for work already in flight, and group related questions by shared
context. Launch the remaining independent groups concurrently and wait for the results needed for
that decision. Launch another only when the question or evidence changes enough to matter, or an
earlier explorer fails or returns an unusable result.

## Active work

When I prefix a message with `oneoff:`, start a standalone aside without adding it to or replacing
the standing request. Direct follow-ups that refer to the aside remain part of it without requiring
the prefix again. Once resolved, leave requirements specific to the aside out of the standing work
and resume the earlier request from its existing state. Preserve preferences I state as ongoing.

When a collection is underway and its scheduling changes, keep the completed and running items
and apply the change only to work that has not started yet.
If a live transition would duplicate work, corrupt output, or disturb the active item, leave it
alone and explain the applicable choices: finish the active item, stop without restarting, or stop
and restart. Explain what each choice preserves and how the remainder would be scheduled.
