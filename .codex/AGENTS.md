Hi, I am yusing. Thanks for the help.

This guidance applies across projects. Direct conversation instructions take precedence.
Routine workflows/automatic triggers are defaults: omit valueless steps.

Revert incidental tool edits (formatters, generators, checksums) in a task-created worktree and
report them. Elsewhere, report them separately; the user decides whether to revert.

## Intent and assumptions

Read a request for the outcome I want at the breadth I state: cover everything it names and add
nothing it does not. Take my words and analogies at their plain meaning; "like X" defines the
behavior. Tools, commands, files, and layers I name are part of the requirement and stay in force
for the session.

When recording or handing off work, keep my requirements and approvals distinct from agent
assumptions, proposals, and implementation choices, and name the source of each governing
contract. An agent choice does not become my requirement by being repeated, implemented, or
documented, and approving a proposal or asking to preserve features does not make each of their
details my requirement; mark a claimed requirement without a source unconfirmed. Label provenance
in briefs, handoffs, and task records, not in every message.

Choose routine implementation details within authorization. Ask only when unresolved intent would
materially change scope or behavior and available evidence cannot settle it. Make each question
stand alone: the concrete situation, the options in my terms with their consequences, and your
recommendation.

Carry authorized work through validation and any authorized commit step without asking whether
to continue. Reuse settled choices and approvals, which cover repeats of the same action on the
same target; do not re-ask an authority already refused.
When the means are delegated, choose and execute them within the retained constraints. Resolve
tooling problems within existing access and authorization before asking the user to do the work.

Keep deliverables within the accepted outcome, including required supporting files and documents
made stale by the change. Add UI controls, documents, branches, worktrees, persistent state, or
committed notes only when requested or necessary for that outcome, subject to explicit exclusions.

## Product scope

For public-facing software, derive scope from user requirements and accepted product contracts.
Do not infer product limits from my setup, the current environment or operating system, or the
current project's kind, language, or framework. Keep local implementation and validation conditions
separate from supported product scope. When intended scope or breadth is unclear, ask before
choosing it. Preserve explicit limits; general applicability does not request extra features.

## Context and completion

- Lead with the outcome and answer the literal question; report each requested item's result.
- Report problems found during requested work or while reading relevant code and documentation,
  including those outside the requested scope. This reporting duty does not expand search, reading, or fix scope.
- Reuse current reads. Do not reread previously read task documents, skills, or other files merely because a new turn
  has begun. After compaction, reread the task documents and skills that unfinished work still needs
  unless the recovered context already shows their text; compaction otherwise drops it.
- Write code, tests, documents, and other deliverables for readers without session history. Do not
  quote, paraphrase, or refer to my prompts or other conversation content in them unless I supply
  text for that deliverable. Keep private material out of repository documents and code, including
  links to private resources such as my self-hosted tracker, session or transcript identifiers,
  and credentials. Keep provenance evidence, such as who approved what and where, in the task
  record or tracker; deliverables state the resulting contract.

Load applicable sections of these task documents once per context when their operation applies.
Complete text already supplied in context satisfies the read; a path or summary does not.

### In $HOME/.codex

- `INSTRUCTION-AUTHORING.md`: authoring/auditing instructions and consumer checks.
- `SKILL-AUTHORING.md`: additionally for authoring/auditing skills.
- `MAIN.md`: main: scope, planning, and completion.
- `DELEGATION.md`: any agent, including subagents, before delegating or coordinating other agents.
  - `MODEL-ROUTING.md`: any agent, including subagents, before delegating.
- `IMPLEMENTATION.md`: choosing an approach for code/operational changes, implementing them, or
  inspecting them, not pure lookup, diagnosis, settled support tests, or mechanical wording edits.
  Explicit audits may use it.
- `FINISHING.md`: keep it out of implementer startup reads and preloads. Implementers load it
  after focused validation of their assigned working path, before handback, completion, or a slice
  commit. Code or operational quality reviewers load only the applicable practices and implementation
  finish sections when review starts. Documentation-only reviews use their document guidance.
  Apply only sections within the role; review orchestration belongs to agents assigned that work.
- `TESTING.md`: tests/fixtures or validation selection; project owners supply runner details.
- `DOCS.md`: writing, integrating, or reviewing reader documents.
- `GITHUB.md`: preparing GitHub text, or publishing and merging pull requests.
- `FRONTEND.md`: building, restyling, or reviewing a web UI.

- `SUBAGENT.md`: FOR SUBAGENTS ONLY: delegate assignment, messages, and result delivery, not dispatch policy.

### In workdir

- `HANDOFF.md`: when mentioned, read it. Only main resuming its task deletes it after consumption;
  delegates read assigned handoffs without deleting them.

## Skills and tools

During construction, defer automatic loading of best-practice and quality-enforcement skill bodies
until `FINISHING.md`. Language/framework matches and descriptions such as "when implementing" identify
relevant finishing skills, not Phase 1 reads. Load `i-want` for brief or shorthand requests,
follow-ups, and corrections; a complete delegate assignment does not need it automatically.
Load task-execution, API/tooling, and domain guidance needed for the working path. Explicit user skill invocations and explicit review/audit requests
follow their requested operation.

Select specific skills/resources that materially help the current operation. Explicit user and
higher-priority requirements remain mandatory. Follow selected tool/method constraints.

Acquire missing bodies with `skills-mgr get <skill> [start:end]`, references with
`skills-mgr get <skill>/<path> [start:end]`, and scripts with `skills-mgr run <skill>/<script> [args...]`.
Ranges are optional, 1-based, inclusive. If a required tool/method is unavailable, explain and stop
only dependent work; reuse substitution/install approval or ask. Missing automatic skills alone do
not block routine work.

Honor explicit dependency versions; otherwise verify the latest compatible stable release from
registry/package-manager metadata. `rtk` is installed; apply it to noisy producers.
Use raw execution for exact output, file redirection, or changed argument semantics. For binary,
minified, or generated data, extract exact fields/bounded bytes and reuse unchanged scans.

## Reviews

Explicit reviews state scope beyond pending changes and separate missing runtime/browser coverage
from source inspection.

## Worktrees

Create every worktree in `./.worktrees`, including test, review, and experimental worktrees.
Never create a worktree under `$TMPDIR` or other temporary directories such as `/tmp`.
Dependencies such as `node_modules` and build intermediates can grow large and exhaust RAM when
temporary storage is memory-backed.

Before removing a worktree or branch, check with `git cherry` whether its patches are already
upstream rather than relying on merge ancestry, which misses cherry-picked and rebased work.
