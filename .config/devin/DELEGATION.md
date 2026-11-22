# Delegation

Applies to main (and any custom subagent configured with `max-nesting`) when
delegating or coordinating subagents. Keep delegated work within your existing
role, scope, and authorization.

## Assignment

Use `run_subagent` (`profile`, `title`, `task`, optional `is_background` and
`resume`) and `read_subagent` to delegate substantial bounded outcomes when
doing so saves more time than briefing, integration, and review add. Delegate
substantial consumer paths with their entry-point wiring and affected tests.
Keep behavior sharing the same contracts with one owner rather than delegating
helper APIs while main implements their consumer. Keep small independent fixes
and integration with main. Select named custom profiles under
`~/.config/devin/agents/` by their role descriptions; use `subagent_general`
for write-capable implementation tasks that do not match a read-only role.

- Documents: main by default; delegate a bounded document assignment when it
  speeds up delivery.
- LLM-facing: main owns instructions, skills, workflow/task documents,
  model-facing templates, and delivery hooks; delegates return
  findings/proposals for them.
- Tests: the agent implementing a change updates the tests and fixtures it
  affects, changing expected values only for ledger lines that changed them; do
  not assign tests to a separate delegate.

Supply known, complete applicable instructions, skills, and owner evidence
needed to start the assigned phase; load later-phase sources at their
transition. Start with a complete brief rather than an immediate follow-up.
Subagents start without the parent's conversation history, so give each agent,
as applicable, its ledger lines with sources, the chosen approach, owned files,
inputs, and useful checks. Constraints come only from ledger lines or the
approach; listing properties the change does not touch invites the recipient to
build machinery for them. Include what has changed so far and distinguish the
changes for this spawn or follow-up; omit earlier change context only when the
recipient already retains it (as with a resumed subagent). Brief review, audit,
or diagnosis with scope, questions, and the ledger, without the approach,
suspected findings, or expected conclusions.

`run_subagent` selects a profile, not a per-call model: custom profiles under
`~/.config/devin/agents/` pin their own `model:` across Devin's available
providers and embed `SUBAGENT.md`; `subagent_general` inherits the parent's
model; `subagent_explore` and any unpinned profile use `agent.subagent_model`
or the default subagent router. Keep shared, project, role, and skill policy at
its owner rather than copying or paraphrasing it into task briefs. When the
brief does not carry a needed skill, name the applicable skill or reference for
the recipient to load via `skills-mgr`. Preserve task-specific scope and ledger
lines in the brief; these are assignment context, not policy recaps.

## Coordination

Keep edits off files and interfaces a running delegate depends on.

Run parallel independent subagents with `is_background: true`, and wait for
completion notifications or read output with `read_subagent` (`block: true`)
rather than polling in a loop. Background subagents inherit pre-approved
permissions and auto-deny unapproved tools; use foreground execution
(`is_background: false`) for a single blocking subagent or when interactive
tool approvals are needed (such as write-capable `subagent_general`). Continue
a useful subagent with `run_subagent` (`resume: <agent_id>`), which always runs
in the foreground and can recover a background subagent stopped on a tool
denial. Start a fresh subagent before compaction would erase its focus, and for
independent judgment or a different assignment. Forward only actionable
user-message context relevant to the recipient, and skip redundant follow-ups.
