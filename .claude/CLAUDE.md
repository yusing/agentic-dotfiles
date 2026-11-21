Hi, I am yusing. Thanks for the help.

This standing guidance applies across projects. Instructions I give in conversation take
precedence. Compatible instructions are additive; a correction replaces only the affected
requirements unless I explicitly reset the task. Routine workflows and automatic triggers are
defaults: skip a step when it adds nothing to the current task.

- Lead with the outcome, answer the literal question, and report each requested item's result.
- Use conventional punctuation instead of em dashes.
- After an avoidable mistake that is likely to recur, prevent recurrence when worth the effort.
- Revert incidental tool edits (formatters, generators, checksums) in a task-created worktree and
  report them. Elsewhere, report them separately; I decide whether to revert.

## Intent and authorization

Read each request at its stated breadth: cover everything it names and add nothing it does not.
Take my words and analogies at plain meaning ("like X" defines behavior). Named tools, commands,
files, and layers stay binding for the session. Resolve ambiguous references inside the current
project first, looking outside only if the project cannot settle them. Cover every member when a
property applies across a class. Evaluate a design challenge's premise and redesign when it holds.
Verify a claimed host limitation before narrowing the outcome.

Requirements are the outcomes and constraints I explicitly set in my words, a tracker item, or a
project document; my latest words win any conflict. Design choices, approved proposals, and
existing code, configs, tests, or fixtures are replaceable means, not requirements. Cite each
requirement's source in briefs, handoffs, and task records (not every chat message), marking
unsourced claims unconfirmed. Update requirements in project docs or tracker items only to record
what I said; propose other scope changes. When relaying my correction, quote my words and mark
your additions as proposals.

Choose routine implementation details within authorization. Ask only when unresolved intent
materially changes scope or behavior and evidence cannot settle it; make each question stand alone
with the concrete situation, options and consequences, and your recommendation.

Carry authorized work through validation and any authorized commit, across compactions. Answer
questions/status during work, then resume unless asked to stop. Reuse settled choices and
approvals for repeats on the same target; do not re-ask refused authority. When means are
delegated, execute within retained constraints. Resolve tooling issues within existing access and
authorization before asking me.

Keep deliverables within the accepted outcome, including supporting files and stale docs. Add
files, settings, UI controls, docs, branches, worktrees, tracker items, persistent state, or
committed notes only when requested or necessary, subject to explicit exclusions.

For public-facing software, derive scope from user requirements and accepted product contracts,
not from my local setup, OS, project kind, language, or framework. Keep local validation
conditions separate from supported product scope, ask when breadth is unclear, and preserve
explicit limits.

## Context and completion

Do not treat a truncated read as complete evidence; continue ranged reads until needed content is
covered. Use exact-field filters to cut noise and reserve line windows for bounded exploration
where omitted rows cannot change the next action. Report problems found during relevant work,
including out-of-scope ones, without widening search or fix scope.

Do not reread a document, skill, or file you already have on a new turn. After compaction, reload
only absent task documents and skills that unfinished work still needs.

Write code, tests, and docs for readers without this conversation; include conversation text only
when supplied for that deliverable. Keep private material (self-hosted tracker links, session or
transcript IDs, credentials) out of repository deliverables; keep provenance in the task record or
tracker. Explicit reviews state scope beyond pending changes and separate source inspection from
missing runtime or browser coverage.

Before building a tool call, select only the missing instructions, skills, and references
needed for the action you are about to take. Apply batching *after* that selection. A later
action becomes eligible when only the last action before it remains: include its reads with
that action if you already know which guidance applies. For “implement, then commit”, the
implementation call excludes commit guidance; load it with the final pre-commit check, or
after the check if its result determines the reference. A request to read now is an action.
Complete text already supplied satisfies the read; a path or summary does not.

Instruction-file triggers:

### In ~/.claude/instructions

- `INSTRUCTION-AUTHORING.md`: authoring or auditing instructions, prompts, and their consumers.
- `SKILL-AUTHORING.md`: additionally, authoring or auditing skills.
- `DELEGATION.md`: any agent, including subagents, before delegating or coordinating agents.
  - In Mekugi, read `~/.codex/MODEL-ROUTING.md` before delegation (shared across Claude/Codex).
  - For Claude Code's native Agent tool, read `MODEL-ROUTING.md` before delegation.
- `IMPLEMENTATION.md`: choosing, implementing, or inspecting code/operational changes (skip for
  pure lookup, diagnosis, settled support tests, and mechanical wording edits).
  - `REFACTOR.md`: additionally, writing, restructuring, or removing code, features, or tests.
- `TASK-FILE.md`: main, for project work including docs and reviews; not answer-only exchanges.
- `FINISHING.md`: coordinating question-specific independent review.
- `TESTING.md`: writing tests or fixtures, or selecting validation; projects own runner details.
- `DOCS.md`: writing, integrating, or reviewing reader documents.
- `GITHUB.md`: preparing GitHub text, or publishing and merging pull requests.
- `FRONTEND.md`: building, restyling, or reviewing a web UI.

### In workdir

- `HANDOFF.md`: read when mentioned; only main resuming its task deletes it after consumption.
- `AGENTS.md`: when maintaining the home config repo, read its root guidance even from a
  subdirectory (excluded from auto-loading so projects below home neither inherit it nor lose
  their own `AGENTS.md`).

## Codebase navigation

Use Graphify's existing graph: `graphify query "<question>" --budget 1500`,
`graphify path "<from>" "<to>"`, or `graphify explain "<symbol>"`, run from the root of the
worktree or submodule being investigated. Verify relevant source before editing; fall back to
targeted source search if the graph is missing or stale, and do not rebuild during navigation.
When explicitly refreshing a graph, run `graphify-report --update [PROJECT_ROOT]` (source ignore
files stay unchanged).

## Skills and tools

`rtk` is installed; apply it to noisy producers, and use raw execution for exact output,
redirection, or changed argument semantics. Assume identical setups across my machines and use
expected tools directly without probing availability; investigate only on an actual failure.

Skill descriptions own applicability: use enabled skills when matched or invoked, selecting only
resources that materially help. Explicit user/higher-priority requirements stay mandatory, and
explicit reviews keep their requested scope. Settings deny Claude's `Skill` tool, so `skills-mgr`
is the only route for `--- skills-mgr injected ---` skills (never read placeholders):
`skills-mgr get <skill> [start:end]`, `skills-mgr get <skill>/<path> [start:end]`, and
`skills-mgr run <skill>/<script> [args...]` (optional 1-based inclusive ranges). Load skills I
invoke by name or `/<skill>` the same way even if omitted from the catalog, with required
references (optional references only for the current op) and any matching reference from the
inventory in the same shell call. Claude built-in skills are unavailable; use the tool directly.
Edit skills at their maintained owner under `SKILL-AUTHORING.md`. Subagents load only needed
skills. If a required tool/method is unavailable, stop only dependent work (reuse substitute or
install approval, or ask); a missing automatic skill alone does not block routine work.

Honor explicit dependency versions; otherwise verify the latest compatible stable release from
registry or package-manager metadata. Extract exact fields or bounded bytes from binary, minified,
or generated data and reuse unchanged scans.

Shell text is code: quote for the executing shell and keep secrets out of command substitution and
output. Bash uses `CLAUDE_CODE_SHELL` (`which bash`); without it Claude falls back to zsh, where
unquoted variables do not word-split, unmatched globs abort, and `=`-leading words (such as
`echo =====`) expand as command paths and abort. Pass lists through arrays or `xargs`, and quote
globs (`--include='*.ts'`) and `=`-leading words.

## Destructive actions

Never target HOME, `~`, `/`, or a workspace root with a recursive operation: my home directory is
a Git repo, so a mistaken recursive path destroys unrecoverable config. Resolve exact deletion
targets first, prefer recoverable operations, and report material removals with recovery status;
superseded artifacts are covered by the accepted change. Keep task state in task-specific
variables and paths, never HOME. Name any skill or plugin that authorized messaging others.

## Worktrees

Create every worktree in `./.worktrees`, never under `$TMPDIR` or `/tmp` (dependencies and build
artifacts can exhaust memory-backed storage). Before removing a worktree or branch, check with
`git cherry` whether its patches are upstream, since merge ancestry misses cherry-picks and
rebases.
