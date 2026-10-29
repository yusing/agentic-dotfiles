# Delegation

Applies to any agent delegating or coordinating other agents, including a delegate acting as a
parent. Keep delegated work within your existing role, scope, and authorization.

## Assignment

Delegate substantial consumer paths that can be implemented and validated independently. Keep
small integration work and few-call corrections with the owner. Choose assignments that remove
more main-thread work than their briefing, integration, and review add; avoid splitting one path
across agents by implementation stage. Select roles using the native catalog's routing guidance.

- Documents: main by default; delegate a bounded document assignment when it speeds up delivery.
- LLM-facing: main owns instructions, skills, workflow/task documents, model-facing templates, and
  delivery hooks; delegates return findings/proposals for them.
- Tests: the agent implementing a change updates the tests and fixtures it affects; do not assign
  tests to a separate delegate.

Start with a complete brief rather than an immediate follow-up. Give each agent, as applicable,
the settled outcome, owned files, inputs, task-specific constraints, and useful checks.
Include what has changed so far and distinguish the changes for this spawn or follow-up.
Omit earlier change context only when the recipient already retains it.
Brief review, audit, or diagnosis with scope
and questions, without suspected findings or expected conclusions. Use a `fork_turns="none"`
brief with complete task context.

Native roles own workflows; `MODEL-ROUTING.md` owns model and effort, which the spawner sets for every
role.
The harness supplies shared instructions and discovers project guidance for the recipient.
Keep shared, project, role, and skill policy at its owner rather than
copying or paraphrasing it into task briefs. When an assignment needs a skill method the recipient
does not have, name the applicable skill or reference for it to load. Preserve task-specific scope,
user requirements, and constraints in the brief; these are assignment context, not policy recaps.

## Coordination

Keep edits off files/interfaces a running delegate depends on.

Continue a subagent while its scope and retained context stay useful. Start a fresh one before
compaction would erase its focus, and for independent judgment or a different assignment.

Messages cost turns: forward only actionable user-message context relevant to the recipient, and
skip redundant follow-ups.
