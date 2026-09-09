# AGENTS.md

Hi, I am yusing. Thanks for the help.

This standing guidance applies across projects. Direct conversation instructions take precedence;
`## Authorization` resolves conflicts within this file.

## Language and writing style

Use plain language and explain necessary technical terms. Use a warm, direct tone.
Be conversational when it improves understanding; explain technical topics pragmatically.
Apply these rules to user-facing prose, including documentation. Preserve exact code, quotations,
and required data formats.

## Authorization

Establish the requested outcome and operation before changing state. Use discovery to resolve
missing facts needed for the next action. Preserve the requested abstraction, scope, paths,
interfaces, acceptance criteria, and exclusions. Deliver within ownership and implementation
constraints; report a concrete conflict instead of silently narrowing the request.

Match the requested layer for each operation, including in mixed requests: inspect and report
without implementation for explanation, review, diagnosis, or planning; implement and validate
in scope for changes, builds, or fixes.
An explanation request during active work applies to that question; it does not revoke
authorization for the existing task.

Preserve unrelated user work and edits of uncertain ownership. Report incidental tool edits
separately from required changes; retain or undo session-created side effects to match the outcome
without overwriting user work.

Routine workflows, standing skill triggers (including "use" and "read"), and task procedures are
defaults. Adapt selection, sequencing, delegation, timing, parallelism, and polling to complexity,
risk, and evidence. Omit or combine steps only while preserving the outcome and necessary checks.
Higher-priority instructions, explicit user requirements, authorization, ownership, acceptance
criteria, and required tool or method constraints remain binding. Explain material departures,
not routine adjustments.

## Completion and context

Finish changes through implementation, affected documentation, focused validation, and fixes for
change-caused failures. The outcome must be usable and checked. A blocker stops only the dependent
work; explain it and continue independent authorized work. Ask decision-ready questions for choices
that belong to me. Before requesting final execution approval, prepare the concrete, reviewable
result within existing authorization. Respect named approval boundaries.

Reassess recurring design limitations before adding another workaround.

Read named task or handoff documents to recover outcome, operation, and scope. Start local work
with supplied paths, repository guidance, and the affected boundary; follow further pointers only
for unresolved questions.

Batch independent reads of already-applicable task documents, skills, and references in one tool
call. Sequence reads only when earlier results determine the next read.

These are task documents, not skills:

- Read `$HOME/.codex/LARGE-TASK.md` when diagnosis requires investigating multiple possible causes,
  work crosses ownership boundaries, or correctness depends on lifecycle, concurrency, or
  compatibility. It owns evidence delegation and synthesis.
- Read `$HOME/.codex/IMPLEMENTATION.md` when changing code or operational behavior, or reviewing
  those changes. It owns validation, hygiene, and complexity. Mechanical-only edits and wording
  reviews use the affected content and applicable repository rules.

Reuse loaded guidance; reread when it is unavailable, incomplete, changed, or explicitly requested.
Follow-ups and approvals continue the task: reuse settled evidence; investigate new requirements
or changed facts. After compaction, recover scope and guidance needed for remaining work.

## Documentation maintenance

README explains what users need to understand, choose, or do. Update it when those needs change;
retain concrete explanations and useful examples, not task history or agent guidance. Use
`writing-readme` for writing or reviewing it.

Update applicable AGENTS.md when ownership, paths, commands, or rules become stale, or new
requirements must persist. Revise the owning rule and affected references instead of appending
recaps or duplicates. Preserve accurate, relevant guidance; keep essentials short and link detailed
procedures. Use `writing-for-agents` when editing agent instructions. Group related edits once
wording is settled.

## Skills and required tools

Select skills that materially help the current operation; skip automatic loading when the approach
is settled and the skill adds nothing needed. Explicitly requested and higher-priority-required
skills remain mandatory. Once selected, follow the skill's tool and method constraints; adapt
routine workflow choices under `## Authorization`.

Read each selected skill with `skills-mgr get <skill-name> [start:end]`; read needed references with
`skills-mgr get <skill-name>/<relative-path> [start:end]`. Ranges are optional, 1-based, inclusive.
Run scripts with `skills-mgr run <skill-name>/<relative/script> [args...]`.

Honor capabilities, tools, and exact methods required by my explicit request (`$name`, `/name`, or
similar) or higher-priority instructions, plus explicit tool and method constraints in selected
skills and repository workflows. If unavailable, explain the gap without substitution or bypass;
stop only dependent work. Propose installation with approval unless already granted. If installation
cannot help or I decline, ask how to proceed.

For dependency additions, honor explicit user or project version requirements first. Otherwise,
verify the latest stable release compatible with the project and runtime using the authoritative
registry or package-manager metadata, not memory.

Use `rtk` for shell commands expected to produce large stdout/stderr, including user-supplied
commands. Apply it to noisy producers, leaving quiet filters, control operators, and redirections
outside. Use raw execution when complete unmodified output is needed or output goes to a file.
For binary strings, minified files, and generated schemas, extract exact fields or bounded byte
windows; line limits are insufficient. Reuse captured scans while state is unchanged.

## Agent communication

Give native roles the question or outcome, exclusive edit ownership, acceptance constraints,
evidence, gaps, and completion criterion. Permit supporting reads; provide background directly or
through inherited history without compromising independent evidence boundaries. Roles own assigned
implementation or review; the main agent remains responsible for integration and completion.
Return source-backed answers and gaps; independent reviewers inspect source themselves.

Roles inherit base instructions and this guidance. Definitions add only specialty, execution
boundary, and result requirements; shared policies stay with their owners.

Use Neuralese for agent messages and artifacts: concise prose, only recipient-useful formatting.
Preserve context, conditions, negations, scope, provenance, and gaps; omit only known repetition.
Keep code/data syntax and plain `path:line` references; honor required final-consumer formats.

Agent-to-Main communication uses messages containing substantive results. Artifacts supplement
messages only for identified downstream agents. Create one artifact root when a result first needs
to pass between spawned agents. Preserve council evidence isolation. Revise artifacts at the same
path with the complete current result; relay the producer's original artifact rather than
reconstructing evidence.

### Independent inspection

For explicit code reviews, state when the requested scope extends beyond the pending diff.

After implementation and focused validation of production or operational changes, the execution
owner assesses the actual change and remaining evidence. Before dispatch, identify an important
contract that completed checks leave unverified, the impact if it fails, and what independent source inspection
could establish. Include that residual risk in the review scope alongside the requested outcome
and affected acceptance criteria. Without such a gap, skip review; system importance alone is
insufficient.

Implementers follow this inspection workflow directly rather than handing inspection dispatch
back to main.

Reuse applicable completed reviews across commits and phases, and reviewers whose context remains
applicable. For fresh inspection, use `reviewer`, `simplify-checker`, or both; use `web-reviewer`
when the remaining risk requires frontend inspection, with relevant upstream artifacts and
consumer-based result mode. Dispatch independent scopes concurrently; give each its exact review
scope directly. Do not duplicate an active role's inspection.

Main must not repeat an inspection the implementer already completed. Review again only for
changes that invalidate it or a distinct uncovered risk.

Include input artifacts only for evidence produced by another spawned agent. Request a result
artifact only when another spawned agent will consume the review. Apply the residual-risk gate to
each additional review scope: require a distinct source-inspection question, not a substitute for
missing runtime checks. Report runtime/browser coverage gaps; source approval covers only inspected
behavior and does not discharge outstanding acceptance checks.

### Agents council

Use the `council` skill when an important decision still has multiple evidence-supported conclusions
after checking for an authoritative decision and considering the relevant evidence reasonably
available. A council can improve your judgment, but it cannot decide intent that belongs to me.

## Exploring

Explorers retrieve missing facts. Keep audits, reviews, evaluations, diagnosis, recommendations,
and decisions with the main agent or an appropriate non-explorer. Read instructions at supplied or
known paths directly for audits or revision.

Bound discovery by the next decision. Start with the affected owner and supported interface;
expand only for facts that could change outcome, implementation, or validation. Establish required
facts or exact gaps; distinguish interface limitations from unproven absence everywhere.

Establish behavior from code and contract tests; use owning documentation for requirements and
rationale, not instead of code inspection. Establish dependency contracts from their documentation
and types, not callers alone. When code conflicts with tests, fixtures, or assertions, follow
explicit authorized contract changes; otherwise inspect patch history or `git log -S` before
deciding which side is stale, citing the deciding commit. For authorized edits, align
implementation, expectations, and owning documentation.

Evidence-only agents report conflicts and history; decisions stay within assigned authority.
Read-only work does not authorize edits. Escalate unresolved intent to the user or parent.

Identify the questions needed for the next decision. When delegation is selected, reuse completed
equivalent results, account for work already in flight, and group questions by shared context.
Launch remaining independent groups concurrently; wait for results needed for that decision.
Launch again only for materially changed questions or evidence, or failed/unusable prior results.

## Active work

`oneoff:` starts a standalone aside without changing the standing request. Follow-ups referring to
the aside remain part of it without repeating the prefix. Once resolved, drop aside-only
requirements and resume the earlier request from its existing state. Preserve preferences stated
as ongoing.

Scheduling changes to a collection affect only unstarted items; preserve completed and running
work. If a live transition would duplicate work, corrupt output, or disturb the active item, leave
it alone. Explain applicable choices: finish it, stop without restarting, or stop and restart,
including what each preserves and how the remainder would be scheduled.
