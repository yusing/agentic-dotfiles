# Delegation

Applies to any agent delegating or coordinating other agents, including a delegate acting as a
parent. Keep delegated work within your existing role, scope, and authorization.

## Assignment

Delegate substantial consumer paths with their entry-point wiring and affected tests. Keep behavior
sharing the same contracts with one owner rather than delegating helper APIs while main implements
their consumer. Keep small independent fixes and integration with main. Choose assignments that
remove more main-thread work than their briefing, integration, and review add. Select roles using
the native catalog's routing guidance.

- Documents: main by default; delegate a bounded document assignment when it speeds up delivery.
- LLM-facing: main owns instructions, skills, workflow/task documents, model-facing templates, and
  delivery hooks; delegates return findings/proposals for them.
- Tests: the agent implementing a change updates the tests and fixtures it affects, changing
  expected values only for ledger lines that changed them; do not assign tests to a separate
  delegate.

Supply known, complete applicable instructions, skills, and owner evidence needed to start the
assigned phase; load later-phase sources at their transition.
Start with a complete brief rather than an immediate follow-up. Named subagent types start with no
conversation history, so give each agent, as applicable, its ledger lines with sources, the chosen
approach, owned files, inputs, and useful checks.
Constraints come only from ledger lines or the approach; listing properties the change does not
touch invites the recipient to build machinery for them.
Include what has changed so far and distinguish the changes for this spawn or follow-up.
Omit earlier change context only when the recipient already retains it, as with a continued agent.
Brief review, audit, or diagnosis with scope, questions, and the ledger, without the approach,
suspected findings, or expected conclusions.
With the native Agent tool, use a `fork` only for support work when the retained conversation
concretely helps and no named role fits, and state in its prompt that it is a delegate under
`SUBAGENT.md`, since a fork otherwise inherits your position as main.

Native roles own workflows; the routing document chosen by `CLAUDE.md` owns model and effort, which
the spawner sets for every non-fork role.
The harness gives custom subagents `CLAUDE.md`; built-in Explore and Plan omit it, so state any
guidance they need in the brief.
Keep shared, project, role, and skill policy at its owner rather than
copying or paraphrasing it into task briefs. When the brief does not carry a needed skill, name
the applicable skill or reference for the recipient to load. Preserve task-specific scope
and ledger lines in the brief; these are assignment context, not policy recaps.

## Coordination

Keep edits off files/interfaces a running delegate depends on.

Continue a subagent while its scope and retained context stay useful. Start a fresh one before
compaction would erase its focus, and for independent judgment or a different assignment.
Before a same-task follow-up carrying substantial obsolete context, use current context/window
evidence to choose fresh context or ask the agent to compact at a safe checkpoint. Reuse available
metrics; inspect only missing or stale facts. Preserve the correction evidence and applicable
guidance in the selected sources.

Messages cost turns: forward only actionable user-message context relevant to the recipient, and
skip redundant follow-ups.
