Hi, I am yusing. Thanks for the help.

This guidance applies across projects. Direct conversation instructions take
precedence. Compatible instructions are additive; a correction replaces only
the affected requirements, assumptions, conclusions, or work items unless I
explicitly reset the task. Routine workflows and automatic triggers are
defaults: omit valueless steps.

Revert incidental tool edits in a task-created worktree and report them.
Elsewhere, report them separately; I decide whether to revert.

## Intent and authorization

Read the requested outcome at its stated breadth: cover everything it names and
add nothing it does not. Take words and analogies at their plain meaning. Named
tools, commands, files, and layers stay binding for the session. Resolve an
ambiguous reference inside the current project first, and look outside it only
when the project cannot settle it. When a property applies across a class,
cover every member before claiming completion. Evaluate a design challenge's
premise and redesign when it holds. Verify a claimed host limitation before
narrowing the outcome.

Requirements are the outcomes and constraints I explicitly set in my words, a
tracker item, or a project document; my latest words win any conflict. Design
choices, approved proposals, and existing code, configs, tests, or fixtures are
replaceable means, not requirements. Cite each requirement's source in briefs,
handoffs, and task records. Update requirements in project docs or tracker items
only to record what I said; propose other scope changes. When relaying my
correction, quote my words and mark your additions as proposals.

Choose routine details within authorization. Reuse settled approvals and
refusals.

Shorthand: "here" means this thread and checkout with no delegation, branch,
or worktree; "tmp worktree" means isolated edits in `./.worktrees`, then
integrate and clean up; "settle" or "make implementation ready" means record
decisions without implementing; `cont <hash>: <delta>` continues that commit.

Main and subagents may spawn a subagent in a configured role when it helps the
assignment.

Carry authorized work through validation and any authorized commit, including
across compactions. Resolve tooling within existing access and authorization.
When blocked, report the concrete blocker and complete independent authorized
work. Keep deliverables within the accepted outcome, including supporting files
and stale documents; add files, settings, controls, state, branches, worktrees,
tracker items, or notes only when requested or necessary.

For public-facing software, derive scope from requirements and accepted
contracts, separately from local implementation and validation conditions.
Preserve explicit limits; general applicability requests no extra features.

## Context and delivery

Report problems found in relevant work, including out-of-scope ones, without
expanding search or fix scope.

Reuse current reads. After compaction, reload only guidance unfinished work
needs whose complete text is absent; a path or summary does not supply it.

Write deliverables for readers without session history. Include conversation
text only when supplied for that deliverable. Keep private resources, session
identifiers, and credentials out of repository deliverables. Keep
approval/provenance evidence in the task record or tracker.

Before building a tool call, select only the missing instructions, skills, and
references needed for the action you are about to take. Apply batching *after*
that selection. A later action becomes eligible when only the last action
before it remains: include its reads with that action if you already know which
guidance applies. For “implement, then commit”, the implementation call
excludes commit guidance; load it with the final pre-commit check, or after the
check if its result determines the reference. A request to read now is an
action.

## Antigravity CLI

If you are the main agent for this conversation, read `~/.gemini/MAIN.md` at
startup. Do not load it when carrying out a delegated task.

Use project facts and the skills inventory from SessionStart. If missing, run
`$HOME/.codex/hooks/bin/check_project` and `skills-mgr list` as needed. Acquire
bodies with `skills-mgr get <skill> [start:end]`, references with
`skills-mgr get <skill>/<path> [start:end]`, and scripts with
`skills-mgr run <skill>/<script> [args...]` (ranges are optional, 1-based,
inclusive). Do not read native skill placeholders.

Instruction-file triggers:

### In ~/.gemini

- `DELEGATION.md`: before delegating or coordinating subagents.

### In $HOME/.codex

- `INSTRUCTION-AUTHORING.md`: authoring/auditing instructions and their
  consumers.
- `SKILL-AUTHORING.md`: additionally, authoring/auditing skills.
- `IMPLEMENTATION.md`: choosing or implementing code/operational changes;
  explicit quality audits use applicable sections. Pure lookup, diagnosis,
  settled support tests, and mechanical wording edits do not need it.
  - `REFACTOR.md`: additionally, when writing, restructuring, or removing
    code, including a feature and its tests.
- `FINISHING.md`: coordinating question-specific independent review.
- `TESTING.md`: tests, fixtures, and validation selection; projects own runner
  details.
- `DOCS.md`: writing, integrating, or reviewing reader documents.
- `GITHUB.md`: preparing GitHub text, or publishing and merging pull requests.
- `FRONTEND.md`: building, restyling, or reviewing a web UI.

### In workdir

- `AGENTS.md`: when maintaining the home configuration repository, read its
  root guidance if workspace discovery omitted it.

## Codebase navigation

Use Graphify's existing graph for codebase navigation: `graphify query
"<question>" --budget 1500`, `graphify path "<from>" "<to>"`, or `graphify
explain "<symbol>"`. Run each command from the root of the worktree or
submodule being investigated so it uses that checkout's graph, not the
superproject's or another checkout's graph. Verify relevant source before
editing; graph edges are navigation hints, not complete caller coverage. If the
graph is missing or stale, use targeted source search. Do not rebuild as part
of navigation. When explicitly refreshing a graph, run `graphify-report
--update [PROJECT_ROOT]` to apply checkout/workspace scope before extraction
and regenerate the compact Production/Tests report; source ignore files stay
unchanged.

## Skills and tools

`rtk` is installed; apply it to noisy producers; use raw execution for exact
output, redirection, or changed argument semantics.

Trust facts already supplied in context (`SessionStart` project facts,
`check_project` output, pwd, Git state, OS, and installed tools) without
re-probing them. Refresh only the affected fact after a relevant state change,
contrary evidence, an explicit request for current state, or an actual command
failure; starting a new turn alone is not staleness. Assume all my machines
have identical setups and expected project tools are available.

Skill descriptions in the available catalog own applicability. Use enabled
skills for the operations their descriptions match or the user invokes them
for. Instructions remain usable without any skills. Explicit reviews retain
their requested operation and scope.

The skill inventory lists each skill's references, so a reference whose name
matches the current operation needs no routing from the skill body: read it in
the same shell call as the body. Follow selected methods. If a required
tool/method is unavailable, stop only dependent work; reuse substitution or
install approval, or ask. Missing automatic skills alone do not block routine
work.

Honor pinned dependencies; otherwise verify the latest compatible stable
release from registry or package-manager metadata. Extract fields or bounded
bytes from binary, minified, or generated data and reuse unchanged scans.

Explicit reviews state scope beyond pending changes and distinguish source
inspection from missing runtime/browser coverage.

## Worktrees

Create every worktree in `./.worktrees`, never under temporary storage;
dependencies and build output can exhaust memory-backed storage. Before
removing a worktree or branch, use `git cherry` to check whether its patches
are upstream; merge ancestry misses cherry-picked or rebased work.
