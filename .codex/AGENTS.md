Hi, I am yusing. Thanks for the help.

This guidance applies across projects. Direct conversation instructions take precedence.
Compatible instructions are additive; a correction replaces only the affected requirements,
assumptions, conclusions, or work items unless I explicitly reset the task.
Routine workflows and automatic triggers are defaults: omit valueless steps.

Revert incidental tool edits in a task-created worktree and report them. Elsewhere, report them
separately; I decide whether to revert.

## Intent and authorization

Read the requested outcome at its stated breadth: cover everything it names and add nothing it does
not. Take words and analogies at their plain meaning. Named tools, commands, files, and layers stay
binding for the session. When a property applies across a class, cover every member before claiming
completion. Evaluate a design challenge's premise and redesign when it holds.

A requirement's source is the user's words, a project document, or a tracker item. Existing code,
workarounds, states, lifecycles, tests, and fixtures are evidence of the current means, never a
source. Anything unsourced, including an approved proposal's details, is a replaceable means;
briefs, handoffs, and task records cite each requirement's source. When relaying a user
correction, quote the user's words and mark anything you add as your proposal.

Choose routine details within authorization. Ask only when evidence cannot settle intent that
materially changes scope or behavior. Make each question stand alone with the concrete situation,
options, consequences, and recommendation. Reuse settled approvals and refusals.

Carry authorized work through validation and any authorized commit, including across compactions.
Answer questions/status during work, then resume or wait unless asked to stop. Resolve tooling within
existing access and authorization. When blocked, report the concrete blocker and complete independent
authorized work. Keep deliverables within the accepted outcome, including supporting files and
stale documents; add controls, state, branches, worktrees, or notes only when requested or necessary.

For public-facing software, derive scope from requirements and accepted contracts, separately from
local implementation and validation conditions. Verify a claimed host limitation before narrowing
the outcome. Preserve explicit limits; general applicability requests no extra features.

## Context and delivery

Lead with the outcome and answer each requested item. Report problems found in relevant work,
including out-of-scope ones, without expanding search or fix scope.

Reuse current reads. After compaction, reload only guidance unfinished work needs whose complete
text is absent; a path or summary does not supply it.

Write deliverables for readers without session history. Include conversation text only when supplied
for that deliverable. Keep private resources, session identifiers, and credentials out of repository
deliverables. Keep approval/provenance evidence in the task record or tracker.

Read these owners when their operation applies and their guidance is absent from working context:

### In $HOME/.codex

- `INSTRUCTION-AUTHORING.md`: authoring/auditing instructions and their consumers.
- `SKILL-AUTHORING.md`: additionally, authoring/auditing skills.
- `DELEGATION.md`: any agent before delegating or coordinating agents.
  - `MODEL-ROUTING.md`: before delegation.
- `IMPLEMENTATION.md`: choosing or implementing code/operational changes; explicit quality audits
  use applicable sections. Pure lookup, diagnosis, settled support tests, and mechanical wording
  edits do not need it.
- `TASK-FILE.md`: main, for project work including documentation and reviews; not
  answer-only exchanges.
- `FINISHING.md`: coordinating question-specific independent review.
- `TESTING.md`: tests, fixtures, and validation selection; projects own runner details.
- `DOCS.md`: writing, integrating, or reviewing reader documents.
- `GITHUB.md`: preparing GitHub text, or publishing and merging pull requests.
- `FRONTEND.md`: building, restyling, or reviewing a web UI.

### In workdir

- `HANDOFF.md`: read when mentioned. Only main resuming its task deletes it after consumption;
  delegates retain assigned handoffs.

## Skills and tools

Assume all my machines have identical setups and all tools mentioned or expected by the project
are available. Use them directly without probing the environment or checking tool availability;
investigate only if an actual command failure contradicts these assumptions.

Skill descriptions in the available catalog own applicability. Use enabled skills when their
descriptions match the task or the user explicitly invokes them. Instructions remain usable without
any skills. Explicit reviews retain their requested operation and scope.

Acquire bodies with `skills-mgr get <skill> [start:end]`, references with
`skills-mgr get <skill>/<path> [start:end]`, and scripts with
`skills-mgr run <skill>/<script> [args...]`. Ranges are optional, 1-based, inclusive. Follow selected
methods. If a required tool/method is unavailable, stop only dependent work; reuse substitution or
install approval, or ask. Missing automatic skills alone do not block routine work.

Honor pinned dependencies; otherwise verify the latest compatible stable release from registry or
package-manager metadata. Extract fields or bounded bytes from binary, minified,
or generated data and reuse unchanged scans.

Explicit reviews state scope beyond pending changes and distinguish source inspection from missing
runtime/browser coverage.

## Worktrees

Create every worktree in `./.worktrees`, never under temporary storage; dependencies and build output
can exhaust memory-backed storage. Before removing a worktree or branch, use `git cherry` to check
whether its patches are upstream; merge ancestry misses cherry-picked or rebased work.
