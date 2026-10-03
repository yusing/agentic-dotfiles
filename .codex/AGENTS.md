Hi, I am yusing. Thanks for the help.

This standing guidance applies across projects. Direct conversation instructions take precedence;
`## Authorization` resolves conflicts within this file.

## Authorization

Treat requests for changes as authorization to implement, update affected documentation, and
validate the usable outcome.

Explanation, review, diagnosis, and planning requests remain read-only unless changes are also
requested. Questions during active work do not cancel existing task and authorization.

Report incidental tool edits separately, user decide whether to revert, not you.

Ask only for an unresolved product decision, material scope conflict, or
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

These are task documents, not skills. Read those that match your role and next operation directly:

- `$HOME/.codex/INSTRUCTION-AUTHORING.md` when authoring or auditing instructions.
  It owns instruction design and consumer checks.
- `$HOME/.codex/SKILL-AUTHORING.md` additionally when authoring or auditing skills.
  It owns skill descriptions, progressive disclosure, and workflow design.
- `$HOME/.codex/MAIN.md` for main only, when planning a task, deciding how to divide substantial
  exploration or repeatable support work before doing it locally, dispatching, coordinating, or
  arranging a review. It owns main's cost-aware delegation rationale, authorization, and timing.
- `$HOME/.codex/SUBAGENT.md` for a delegate only, when working inside an assignment, messaging
  another agent, or returning results. Delegates execute their settled assignment and do not need
  dispatch guidance.
- `$HOME/.codex/IMPLEMENTATION.md` when implementing code or operational changes, or inspecting
  their implementation. Pure factual lookup, diagnosis, and settled support test authoring do not
  trigger implementation craft. Explicit audits can read it as evidence. Mechanical-only edits and
  wording reviews use the affected content and applicable repository rules.
- `$HOME/.codex/TESTING.md` when authoring or reviewing tests and fixtures, or selecting validation.
  Project testing owners supply runner, fixture, and environment details.
- `$HOME/.codex/DOCS.md` when writing, integrating, or reviewing reader-facing documentation.
  Load it for the document operation, not merely because of the agent's role.
- `$HOME/.codex/GITHUB.md` for GitHub pull request descriptions, issue bodies, or comments.
- `HANDOFF.md` when mentioned, then delete it.
- `RECOVERY.md` when created/mentioned; retain it until staged delivery is complete, then delete it.

Do not repeat instructions before first user message, including this file, in:

- Other instructions files
- Artifacts
- Skills
- Agent spawn prompt

## Skills and required tools

Select the most specific skills and references that materially help the current operation.
Explicitly requested and higher-priority-required skills remain mandatory. Follow selected skills'
tool and method constraints; adapt routine workflows under `## Authorization`.

Acquire a missing selected skill with `skills-mgr get <skill-name> [start:end]`; read needed references with
`skills-mgr get <skill-name>/<relative-path> [start:end]`. Ranges are optional, 1-based, inclusive.
Run scripts with `skills-mgr run <skill-name>/<relative/script> [args...]`.

If a user-required or explicitly constrained tool or method is unavailable, explain the gap and
stop only dependent work. Reuse granted installation or substitution approval; otherwise ask.
An unavailable automatically selected skill alone does not block routine work.

For dependency additions, honor explicit user or project version requirements first. Otherwise,
verify the latest stable release compatible with the project and runtime using the authoritative
registry or package-manager metadata, not memory.

`rtk` helps reduce noise from command output. Apply it to noisy producers, including user-supplied commands,
leaving quiet filters, control operators, and redirections outside.
Use raw execution when complete unmodified output is needed, output goes to a file, or wrapping
changes argument semantics.

For binary strings, minified files, and generated schemas, extract exact fields or bounded byte
windows; line limits are insufficient. Reuse captured scans while state is unchanged.

## Using subagents

Select roles using the native catalog descriptions within authorized delegation boundaries.
Assigned agents keep their role and scope; main owns integration and completion.
A delegate does not need dispatch guidance merely because it was spawned.

Only main edits instructions, skills, workflow guidance, task documents, and instruction-delivery
hooks. Delegates propose changes to these and own their findings and result artifacts.
Put durable agent rules in their existing owner. Revise stale rules and references instead of
appending task recaps.

For explicit code reviews, state when the requested scope extends beyond the pending diff.
Report missing runtime or browser coverage separately; source inspection does not replace those
checks.
