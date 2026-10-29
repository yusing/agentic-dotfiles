Hi, I am yusing. Thanks for the help.

This is my standing guidance for every project. Instructions I give in the conversation take
precedence over this guidance. Compatible instructions remain additive; a correction replaces only
the affected requirements unless I explicitly reset the task.

Routine workflows and automatic triggers are defaults: skip a step when it adds nothing to the current task.

## Working with me

- Use conventional punctuation instead of em dashes.
- Revert edits a tool made incidentally (formatters, generators, checksums) in a worktree created
  for the task, and report them. Elsewhere, report them separately; I decide whether to revert them.

## Intent and assumptions

Keep my stated requirements and approvals distinct from agent interpretations, assumptions,
proposals, and implementation choices. Identify governing contracts and observed facts by their
sources. Preserve the origin and certainty of material claims when carrying them forward; repetition,
silence, implementation, or inclusion in a document does not make an agent assumption user-approved.
If the basis for a claimed requirement is missing, mark it unconfirmed rather than attributing it
to me. Choose routine implementation details within authorization; ask when unresolved intent
would materially change scope or behavior.

## Product scope

For public-facing software, derive scope from user requirements and accepted product contracts.
Do not infer product limits from my setup, the current environment or operating system, or the
current project's kind, language, or framework. Keep local implementation and validation conditions
separate from supported product scope. When intended scope or breadth is unclear, ask before
choosing it. Preserve explicit limits; general applicability does not request extra features.

## Context and completion

Do not treat a truncated read as complete evidence. Continue ranged reads until the instruction,
skill, or diff content you need is covered. Use `rtk` or exact-field filters to cut noise; reserve
line windows for bounded exploration where omitted rows cannot change the next action.

Report problems you find during requested work or while reading relevant code and documentation,
including ones outside the requested scope; reporting does not widen what you search, read, or fix.

A new turn alone is no reason to reread a document, skill, or file you already have. After compaction,
reload only the task documents and skills unfinished work still needs whose text is absent.

Write code, tests, documents, and other deliverables for readers who never saw this conversation.
Do not quote, paraphrase, or refer to my prompts or other conversation content in them unless I
supply text for that deliverable.

Load applicable sections of these task documents once per context when their operation applies.
Complete text already supplied in context satisfies the read; a path or summary does not.

### In ~/.claude/instructions

- `INSTRUCTION-AUTHORING.md`: authoring or auditing instructions, prompts, and their consumers.
- `SKILL-AUTHORING.md`: additionally, when authoring or auditing skills.
- `MAIN.md`: scope, planning, and completion as the main agent.
- `DELEGATION.md`: any agent, including subagents, before delegating or coordinating other agents.
  - In Mekugi, read `~/.codex/MODEL-ROUTING.md` before delegation. Claude and Codex use the same
    routing, including Codex delegates.
  - For Claude Code's native Agent tool, read `MODEL-ROUTING.md` before delegation.
- `IMPLEMENTATION.md`: implementing code or operational changes, or inspecting them. Pure lookup,
  diagnosis, settled support tests, and mechanical wording edits do not need it; explicit audits
  may use it.
- `FINISHING.md`: main after an authorized change and focused validation, before completion or a
  slice commit; implementing subagents before handback of focused-validated code or operational work;
  also explicit implementation-quality reviews. Apply only the sections within the assigned role.
- `TESTING.md`: writing tests or fixtures, or selecting validation. Projects supply runner details.
- `DOCS.md`: writing, integrating, or reviewing reader documents.
- `GITHUB.md`: preparing pull-request, issue, or comment text.
- `FRONTEND.md`: building, restyling, or reviewing a web UI.

- `SUBAGENT.md`: only when you are a subagent, never as the main agent: assignment, messages, and
  result delivery, not dispatch policy.

### In workdir

- `HANDOFF.md`: when mentioned, read it. Only the main agent resuming its task deletes it after
  consumption; subagents read assigned handoffs without deleting them.
- `AGENTS.md`: when the working directory is the home directory, read it before maintaining that
  configuration repository. Settings exclude it from automatic loading so that projects below
  home neither receive it nor lose their own `AGENTS.md`.

The harness supplies this file to the main agent and custom subagents. Built-in Explore and Plan
omit it; provide any required guidance explicitly when assigning work to those built-ins.

## Skills and tools

During construction, defer automatic loading of best-practice and quality-enforcement skill bodies
until `FINISHING.md`. Language/framework matches and descriptions such as "when implementing" identify
relevant finishing skills, not Phase 1 reads; `i-want` interprets the request and is not deferred.
Load task-execution, API/tooling, and domain guidance needed for the working path. Explicit user skill invocations and explicit review/audit requests
follow their requested operation.

Select skills and resources that materially help the current operation. Explicit user and
higher-priority requirements stay mandatory; follow the constraints of a selected tool or method.

The `--- skills-mgr injected ---` inventory lists skills served by skills-mgr. Acquire them through
`skills-mgr`, not through `Skill` tool or read the exposed placeholder files:
bodies with `skills-mgr get <skill> [start:end]`,
references with `skills-mgr get <skill>/<path> [start:end]`, and scripts with
`skills-mgr run <skill>/<script> [args...]` (ranges are optional, 1-based, inclusive). A name I
invoke may be absent from the catalog; acquire its body and required references anyway, and load
optional references only for the current operation. To change a skill, edit its maintained owner
under `SKILL-AUTHORING.md`. After compaction, reload the skills that unfinished work still needs;
subagents load only the skills their assignment needs.

If a required tool or method is unavailable, explain and stop only the work that depends on it;
reuse an approval I already gave for a substitute or install, or ask. A missing automatic skill
alone does not block routine work.

Honor explicit dependency versions. Otherwise, verify the latest compatible stable release from
registry or package-manager metadata, since remembered versions go stale. A hook already routes
supported Bash commands through `rtk`, which can summarize or hide lines. When you need exact output,
run `rtk bypass <command>` or fetch elided lines with the printed `rtk recall` id. For binary,
minified, or generated data, extract exact fields or bounded bytes, and reuse unchanged scans.

Shell text is code: quote it for the shell that runs it, and keep secrets out of command
substitution and output. The Bash tool can run zsh rather than bash; there an unquoted variable
does not word-split, an unmatched glob aborts the command, and a word starting with `=` (such as an
`echo =====` separator) expands as a command path and aborts it. Pass lists through arrays or
`xargs`, and quote globs meant for the called program (`--include='*.ts'`) and `=`-leading words.

## Destructive actions

Never target HOME, `~`, `/`, or a workspace root with a recursive operation. My home directory is
also a Git repository, so a mistaken recursive path there destroys unrecoverable configuration.
Resolve exact deletion targets first, prefer recoverable operations, and report material removals
with their recovery status. Artifacts superseded by an accepted change are covered by that change.
Keep task state in task-specific variables and paths, never in HOME, for the same reason. When a
skill or plugin authorized messaging other people, name and link it in the final response.

## Delegates

Keep each durable rule at its existing owner instead of appending recaps elsewhere. An explicit
review states its scope beyond pending changes and separates missing runtime or browser coverage
from source inspection.

## Worktrees

Create task worktrees in `./.worktrees`, never under `$TMPDIR`. Before removing a worktree or
branch, check with `git cherry` whether its patches are already upstream rather than relying on
merge ancestry, which misses cherry-picked and rebased work.
