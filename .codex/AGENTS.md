Hi, I am yusing. Thanks for the help.

This guidance applies across projects. Direct conversation instructions take precedence.
Routine workflows/automatic triggers are defaults: omit valueless steps.

Revert incidental tool edits (formatters, generators, checksums) in a task-created worktree and
report them. Elsewhere, report them separately; the user decides whether to revert.

## Intent and assumptions

Keep user-stated requirements and approvals distinct from agent interpretations, assumptions,
proposals, and implementation choices. Identify governing contracts and observed facts by their
sources. Preserve the origin and certainty of material claims when carrying them forward; repetition,
silence, implementation, or inclusion in a document does not make an agent assumption user-approved.
If the basis for a claimed requirement is missing, mark it unconfirmed rather than attributing it
to the user. Choose routine implementation details within authorization; ask when unresolved intent
would materially change scope or behavior.

## Product scope

For public-facing software, derive scope from user requirements and accepted product contracts.
Do not infer product limits from my setup, the current environment or operating system, or the
current project's kind, language, or framework. Keep local implementation and validation conditions
separate from supported product scope. When intended scope or breadth is unclear, ask before
choosing it. Preserve explicit limits; general applicability does not request extra features.

## Context and completion

- Report problems found during requested work or while reading relevant code and documentation,
  including those outside the requested scope. This reporting duty does not expand search, reading, or fix scope.
- Reuse current reads. Do not reread previously read task documents, skills, or other files merely because a new turn
  has begun. After compaction, reread the task documents and skills that unfinished work still needs
  unless the recovered context already shows their text; compaction otherwise drops it.
- Write code, tests, documents, and other deliverables for readers without session history. Do not
  quote, paraphrase, or refer to my prompts or other conversation content in them unless I supply
  text for that deliverable.

Read these task documents directly, once per context, the moment when their operation applies:

### In $HOME/.codex

- `INSTRUCTION-AUTHORING.md`: authoring/auditing instructions and consumer checks.
- `SKILL-AUTHORING.md`: additionally for authoring/auditing skills.
- `MAIN.md`: main: scope, planning, and completion.
- `DELEGATION.md`: any agent, including subagents, before delegating or coordinating other agents.
  - `MODEL-ROUTING.md`: any agent, including subagents, before delegating `default` and `worker` roles.
- `REVIEW.md`: main: after an authorized change is implemented and focused-validated,
  before completion or a slice commit.
- `IMPLEMENTATION.md`: code/operational implementation or its inspection, not pure
  lookup, diagnosis, settled support tests, or mechanical wording edits. Explicit audits may use it.
- `TESTING.md`: tests/fixtures or validation selection; project owners supply runner details.
- `DOCS.md`: writing, integrating, or reviewing reader documents.
- `GITHUB.md`: preparing pull-request, issue, or comment text.
- `FRONTEND.md`: building, restyling, or reviewing a web UI.

- `SUBAGENT.md`: FOR SUBAGENTS ONLY: delegate assignment, messages, and result delivery, not dispatch policy.

### In workdir

- `HANDOFF.md`: when mentioned, read it. Only main resuming its task deletes it after consumption;
  delegates read assigned handoffs without deleting them.

## Skills and tools

Select specific skills/resources that materially help the current operation. Explicit user and
higher-priority requirements remain mandatory. Follow selected tool/method constraints.

Acquire missing bodies with `skills-mgr get <skill> [start:end]`, references with
`skills-mgr get <skill>/<path> [start:end]`, and scripts with `skills-mgr run <skill>/<script> [args...]`.
Ranges are optional, 1-based, inclusive. If a required tool/method is unavailable, explain and stop
only dependent work; reuse substitution/install approval or ask. Missing automatic skills alone do
not block routine work.

Honor explicit dependency versions; otherwise verify the latest compatible stable release from
registry/package-manager metadata. Apply `rtk` to noisy producers.
Use raw execution for exact output, file redirection, or changed argument semantics. For binary,
minified, or generated data, extract exact fields/bounded bytes and reuse unchanged scans.

## Delegates

Use native role capabilities within authorized scope.
Keep durable rules at their existing owner instead of appending recaps. Explicit reviews state scope
beyond pending changes and separate missing runtime/browser coverage from source inspection.

## Worktrees

Worktrees lives in `./.worktrees`, never under `$TMPDIR`.
