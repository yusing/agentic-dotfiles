Hi, I am yusing. Thanks for the help.

This guidance applies across projects. Direct conversation instructions take precedence;
Authorization resolves conflicts within this file.

## Authorization

Change requests authorize implementation, affected documentation, and validation of the requested
outcome, not adjacent features or cleanup. Explanation, review, diagnosis, and planning stay read-only
unless changes are requested. Questions during active work do not cancel its scope or authorization.

Ask only for an unresolved product decision, material scope conflict, or effect outside authorization;
continue independent work. Routine workflows/automatic triggers are defaults: omit valueless steps.
Report incidental tool edits separately; the user decides whether to revert.

## Context and completion

Start at supplied paths and owners. Read/search further only for evidence that can change the next
action; reuse current reads. Report material in-scope findings, limits, and simpler alternatives with
impact and a concrete next step, without starting an adjacent audit.

Do not reread previously read task documents, skills, or other files merely because a new turn
has begun. After compaction, reread the task documents and skills that unfinished work still needs;
compaction drops their text.

Read these task documents directly when their operation applies:

- `$HOME/.codex/INSTRUCTION-AUTHORING.md`: authoring/auditing instructions and consumer checks.
- `$HOME/.codex/SKILL-AUTHORING.md`: additionally for authoring/auditing skills.
- `$HOME/.codex/MAIN.md`: main planning, delegation, and coordination.
- `$HOME/.codex/REVIEW.md`: main, after an authorized change is implemented and focused-validated,
  before completion or a slice commit; read it then even if read earlier.
- `$HOME/.codex/SUBAGENT.md`: delegate assignment, messages, and result delivery, not dispatch policy.
- `$HOME/.codex/IMPLEMENTATION.md`: code/operational implementation or its inspection, not pure
  lookup, diagnosis, settled support tests, or mechanical wording edits. Explicit audits may use it.
- `$HOME/.codex/TESTING.md`: tests/fixtures or validation selection; project owners supply runner details.
- `$HOME/.codex/DOCS.md`: writing, integrating, or reviewing reader documents, not every worker task.
- `$HOME/.codex/GITHUB.md`: preparing pull-request, issue, or comment text.
- `HANDOFF.md`: when mentioned; read then delete.
- `RECOVERY.md`: when created/mentioned; retain through staged delivery, then delete.

Do not repeat or paraphrase instructions delivered before the first user message, including this
file, in other instruction files, artifacts, skills, or spawn prompts.

## Skills and tools

Select specific skills/resources that materially help the current operation. Explicit user and
higher-priority requirements remain mandatory. Follow selected tool/method constraints; adapt routine
steps under Authorization.

Acquire missing bodies with `skills-mgr get <skill> [start:end]`, references with
`skills-mgr get <skill>/<path> [start:end]`, and scripts with `skills-mgr run <skill>/<script> [args...]`.
Ranges are optional, 1-based, inclusive. If a required tool/method is unavailable, explain and stop
only dependent work; reuse substitution/install approval or ask. Missing automatic skills alone do
not block routine work.

Honor explicit dependency versions; otherwise verify the latest compatible stable release from
registry/package-manager metadata. Apply `rtk` to noisy producers, not quiet filters/operators.
Use raw execution for exact output, file redirection, or changed argument semantics. For binary,
minified, or generated data, extract exact fields/bounded bytes and reuse unchanged scans.

## Delegates

Use native role capabilities within authorized scope. Main owns integration/completion and edits
instructions, skills, workflow/task guidance, and delivery hooks; delegates return findings/proposals.
Keep durable rules at their existing owner instead of appending recaps. Explicit reviews state scope
beyond pending changes and separate missing runtime/browser coverage from source inspection.
