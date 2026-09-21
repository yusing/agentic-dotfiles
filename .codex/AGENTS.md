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

Treat requests for changes as authorization to implement, update affected documentation, and
validate the usable outcome. Continue through change-caused fixes until that outcome works and
required checks pass. Prioritize a complete, correct solution over making the smallest
change. Resolve routine choices from context without another approval.
Explanation, review, diagnosis, and planning requests remain read-only unless changes are also
requested. Questions during active work do not cancel existing task and authorization.

Preserve the requested scope, interfaces, exclusions, and unrelated edits, including edits of
uncertain ownership. Report incidental tool edits separately. Ask only for an unresolved product decision, material scope conflict, or
an effect outside existing authorization; continue independent work while it is pending.

Routine workflows and automatic skill triggers are defaults: omit or combine steps that add no
value to this task.

## Completion and context

Report material findings encountered, including unnecessary artifacts, remaining limitations,
and simpler alternatives, with their impact and a concrete next step,
before starting or after finishing the task. This does not request an adjacent audit or unrelated fixes.

Start with named task documents, supplied paths, and the affected owner. Read further only to
resolve a question that could change the next action.

Do not reread previously read task documents, skills, or other files merely because a new turn
has begun.

These are task documents, not skills. Read those match your role and next operation directly:

- `$HOME/.codex/INSTRUCTION-AUTHORING.md` when authoring or auditing instructions.
  It owns instruction design and consumer checks.
- `$HOME/.codex/SKILL-AUTHORING.md` additionally when authoring or auditing skills.
  It owns skill descriptions, progressive disclosure, and workflow design.
- `$HOME/.codex/MAIN.md` for main only, when planning a task, deciding how to divide substantial
  exploration or repeatable support work before doing it locally, dispatching, coordinating, or
  arranging a review. It owns main's cost-aware delegation rationale, authorization, and timing.
- `$HOME/.codex/SUBAGENT.md` for a delegate only, when working inside an assignment or returning
  results. Delegates execute their settled assignment and do not need dispatch guidance.
- `$HOME/.codex/IMPLEMENTATION.md` when implementing code or operational changes, or inspecting
  those changes. Load the relevant implementation, validation, or inspection guidance for that
  operation, not merely to return a subagent result. Factual lookup does not trigger it.
  Mechanical-only edits and wording reviews use the affected content and applicable repository rules.
- `$HOME/.codex/GITHUB.md` for GitHub pull request descriptions, issue bodies, or comments, read.
- `HANDOFF.md` when mentioned, then delete it.

Do not repeat instructions before first user message, including this file, in:

- Other instructions files
- Artifacts
- Skills
- Agent spawn prompt

## Documentation maintenance

You are responsible to maintain these after completing and verified assigned work.

README holds what users need to understand, choose, or do.
Spec holds intent, scope, non-goals, journeys, and why.
Contract holds types, schemas, errors, SLAs, and compatibility.
Spec and contract must not overlap, repeat, or restate code in prose.

Put durable agent rules in their existing owner. Revise stale rules and references instead of appending task recaps.

## Skills and required tools

Select the most specific skills and references that materially help the current operation.
Explicitly requested and higher-priority-required skills remain mandatory. Follow selected skills'
tool and method constraints; adapt routine workflows under `## Authorization`.

Accquire missing selected skill with `skills-mgr get <skill-name> [start:end]`; read needed references with
`skills-mgr get <skill-name>/<relative-path> [start:end]`. Ranges are optional, 1-based, inclusive.
Run scripts with `skills-mgr run <skill-name>/<relative/script> [args...]`.

If a user-required or explicitly constrained tool or method is unavailable, explain the gap and
stop only dependent work. Reuse granted installation or substitution approval; otherwise ask.
An unavailable automatically selected skill alone does not block routine work.

For dependency additions, honor explicit user or project version requirements first. Otherwise,
verify the latest stable release compatible with the project and runtime using the authoritative
registry or package-manager metadata, not memory.

<!-- mekugi:omit -->
`rtk` helps reduce noise from command output. Apply it to noisy producers, including user-supplied commands,
leaving quiet filters, control operators, and redirections outside.
Use raw execution when complete unmodified output is needed or output goes to a file.
<!-- /mekugi:omit -->

For binary strings, minified files, and generated schemas, extract exact fields or bounded byte
windows; line limits are insufficient. Reuse captured scans while state is unchanged.

## Using subagents

Select roles using the native catalog descriptions within authorized delegation boundaries.
Assigned agents keep their role and scope; main owns integration and completion.
A delegate does not need dispatch guidance merely because it was spawned.

Only main edits instructions, skills, workflow guidance, task documents, and instruction-delivery
hooks. Delegates propose changes to these and own their findings and result artifacts.

### Independent inspection

For explicit code reviews, state when the requested scope extends beyond the pending diff.
Report missing runtime or browser coverage separately; source inspection does not replace those
checks.

After implementation and focused validation, spawn independent inspection with `fork_turns="none"`
for a concrete correctness, security, lifecycle, or maintainability risk that benefits from a fresh
review. Routine wording and mechanical edits need no extra agent. Reuse reviews that cover the
final state; workflow-specific required reviews still apply.

### Agents council

Use the `council` skill and roles when an important decision still has multiple evidence-supported
conclusions after checking for an authoritative decision and considering the relevant evidence reasonably
available. A council can improve your judgment, but it cannot decide intent that belongs to me.
