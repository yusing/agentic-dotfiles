# Delegation

Applies to any agent delegating or coordinating other agents, including a subagent acting as a
parent. Keep delegated work within your existing role, scope, and authorization.

## Assignment

Delegate substantial consumer paths with their entry-point wiring and affected tests. Keep behavior
sharing the same contracts with one owner rather than delegating helper APIs while main implements
their consumer. Keep small independent fixes and integration with main. Choose assignments that
remove more main-thread work than their briefing, integration, and review add.

- Documents: keep document work yourself by default; delegate a bounded document assignment when it
  speeds up delivery.
- LLM-facing: the main agent alone edits instructions, skills, workflow and task documents,
  model-facing templates, and delivery hooks; subagents return findings and proposals for them.
- Tests: whoever implements a change updates the tests and fixtures it affects; do not hand tests
  to a separate subagent.

Supply known, complete applicable instructions, skills, and owner evidence needed to start the
assigned phase; load later-phase sources at their transition. Use host preload support when
available; otherwise name the applicable skill or reference for the recipient to load, without
substituting a policy recap.
Named subagent types start with no conversation history, so give each one, as applicable, the
settled outcome, chosen approach, owned files, inputs, task-specific constraints, and useful
checks, plus what has changed so far and which changes belong to this assignment or follow-up.
Constraints are those I stated or the approach requires; listing properties the change does not
touch invites the recipient to build machinery for them. Omit earlier change context
only when the recipient already retains it, as with a continued agent.
The harness gives custom subagents `CLAUDE.md`; built-in Explore and Plan omit it, so state any
guidance they need in the brief.
Brief a review, audit, or diagnosis with its scope and questions; leave
out suspected findings and expected conclusions, because they steer the recipient toward your view.
With the native Agent tool, use a `fork` only for support work when the retained conversation
concretely helps and no named role fits, and state in its prompt that it is a delegate under
`SUBAGENT.md`, since a fork otherwise inherits your position as main.

## Coordination

Keep your edits off files and interfaces a running agent depends on. Send necessary contract
corrections promptly and batch other messages. Continue an agent while its scope and retained
context stay useful. Start a fresh one before compaction would erase its focus, and for independent
judgment or a different assignment.
Before a same-task follow-up carrying substantial obsolete context, use available context
observations to choose fresh context or ask the agent to compact at a safe checkpoint. Preserve
the correction evidence and applicable guidance; do not invent a fixed token cutoff.

Each message costs the recipient a turn, so skip status requests and acknowledgments that need no
action.
