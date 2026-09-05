# AGENTS.md

Hi, I am yusing. Thanks for the help.

This file is my standing guidance for how I like to work, and it applies to every project you
and I touch together, whatever the repository. Anything I say directly in a conversation
wins over it. Inside this file, `## Authorization` wins whenever another section would seem to
permit or forbid something differently.

## Language and writing style

Use clear, human-understandable language without jargon. Use a warm, direct tone.
Be conversational when it improves understanding; explain technical topics pragmatically.
Apply these language and tone rules to prose written directly to the user, not code, quotes,
or file content.

## Authorization

Please work out and preserve the requested abstraction, complete outcome, operation, paths,
interfaces, acceptance criteria, and exclusions before you act. Let discovery, ownership, and
implementation constraints determine where and how to realize that outcome, not narrow what it
covers; report the concrete conflict when the complete outcome cannot work as stated. Match the
requested layer: inspect and report without implementation for an answer, review, diagnosis, or
plan; implement and validate in scope for a change, build, or fix.

Preserve and report incidental changes made by an authorized formatter, generator,
or other tool rather than overwriting possible user work.

An external write creates, modifies, publishes, sends, uploads, or deletes state in an external
service, remote repository, hosted environment, device, or another user's system. Read-only
network requests are not external writes.

Process control means starting, stopping, restarting, signalling, or otherwise changing the
lifecycle of an existing or persistent service, agent, collection, or user-owned process. It does
not include running ordinary task-scoped inspection, editing, build, or validation commands.

## Completion and context

For a change, continue through implementation, affected documentation, focused local validation,
and fixes for failures caused by the change. Finish when the requested outcome is usable and
checked, or explain the concrete blocker. An initial implementation is not an automatic review
checkpoint. Respect named approval boundaries while continuing independent authorized work.

Read explicitly referenced task or handoff documents to recover the requested outcome, operation,
and scope. Routine local work needs the supplied paths, applicable repository guidance, and the
affected boundary, not a full repository map or a stack of workflow documents.

Load additional guidance when it changes the work:

- `$HOME/.codex/SMALL-TASK.md` is an optional guide for scoped execution, not a prerequisite.
- Read `$HOME/.codex/LARGE-TASK.md` for open-ended diagnosis, refactoring, cross-owner work, or
  changes with meaningful edge cases. It owns evidence delegation and synthesis.
- Read `$HOME/.codex/IMPLEMENTATION.md` for behavioral changes or substantive implementation
  and review. It owns validation, hygiene, and complexity decisions. Mechanical-only edits need
  the affected content and applicable repository rules, not this additional workflow.

Read each applicable document once per context; reread only if it changes or I ask. Direct
follow-ups and approvals continue the current task without restarting discovery. Dispatching a
native role leaves that role responsible for its assigned implementation or review. After
compaction, recover the active scope and reread only the guidance needed for the remaining work.

## Skills and required tools

Read skill instructions with `skills-mgr get <skill-name> [start:end]`, and listed references
with `skills-mgr get <skill-name>/<relative-path> [start:end]`. Omit the optional 1-based
inclusive range to read the whole file.
Load only the references you actually need.
Run scripts with `skills-mgr run <skill-name>/<relative/script> [args...]`.

`SMALL-TASK.md`, `LARGE-TASK.md`, and `IMPLEMENTATION.md` are task documents, not skills. Only
`skills-mgr get` reads use skill-specific timing and batching rules.

If a skill, tool, CLI, package, runtime, or exact approach explicitly required by me (`$name`, `/name`, or similar form),
a higher-priority instruction, an owning skill, or the repository's authoritative workflow is
unavailable, stop the dependent operation rather than substituting, working around,
reimplementing, or skipping it. Continue independent authorized work.
Explain why it is required and propose an installation, then install only once I agree. If I
decline the installation, ask me how to proceed. Do not introduce or require a dependency solely
for an optional implementation choice; use the simplest suitable available approach instead.

Noisy output: prefix each shell producer expected to emit large stdout/stderr with
`rtk command [argv...]`, including a user-supplied command that omits the prefix. In a compound
command or pipeline, prefix each noisy producer rather than mechanically wrapping every
executable. Leave quiet filters, control operators, and redirections outside `rtk`. Use raw
execution when the complete unmodified output is required or when the command writes its output
to a file instead of returning it to the conversation.

## Agent communication

Native roles receive the complete assigned task directly in fresh context. Use the client's native
fresh-context mechanism rather than copying inherited conversation history into the handoff.

Agent-to-Main communication always uses messages. Main should create one artifact root only if the task includes Agent-to-Agent communication.
For example: `explorer`->message->`main`; `council-member` A->artifact path->main->`council-member` B.

### Artifact Format

Use Neuralese for content whose intended reader is another agent, including task and result
messages, routing messages, and communication artifacts. Omit empty fields, greetings, headings,
Markdown, serialization wrappers, transitions, and inherited context. Exact code or data keeps
its native syntax or travels in a referenced artifact. Write repository references as plain
`path:line` tokens. When an invoked workflow assigns a final consumer a different output format,
that workflow owns the final artifact format.

### Independent inspection

For an explicit code-review request, state when the requested scope extends beyond the pending diff.

After implementation and focused validation of a production or operational change are complete,
decide whether independent inspection is needed. It is needed only when a plausible defect
would have meaningful user, data, security, compatibility, or operational impact and source
inspection can find it beyond focused checks and direct diff review.

Native review roles are the only owners of independent inspection; root diff review and tests are
validation, not substitutes. When inspection is needed, autonomously select `reviewer`,
`simplify-checker`, or both, then spawn the selected roles concurrently and give each its exact
review scope directly. Include input artifacts only for evidence produced by another spawned
agent. Request a result artifact only when another spawned agent will consume the review; when the
main agent is the sole consumer, have the role return its complete review directly. Do not
duplicate an active role's inspection. When inspections cover web or frontend changes, also spawn
`web-reviewer` with the same scope, relevant upstream artifacts, and consumer-based result mode.

### Agents council

Use the `council` skill only after gathering the relevant evidence when an important decision
still has multiple evidence-supported conclusions and no authoritative owner or further available
evidence can settle them. A council can improve your judgment, but it cannot decide intent that
belongs to me.

## Exploring

Explorers retrieve missing facts; they do not reason about what should change. Keep audits,
reviews, evaluations, diagnosis, recommendations, and decisions with the main agent or the
appropriate non-explorer role. For an instruction audit or revision at supplied or known paths,
read the instructions directly instead of spawning an explorer.

Use code to establish how the repository behaves. Read local documentation when it owns
requirements, records rationale that code cannot express, or directly describes a changed
user-facing surface. Do not use documentation as a substitute for inspecting the implementation.
For a third-party dependency, check its own documentation and types instead of inferring the
contract from call sites.

Only the main agent spawns `explorer`. A spawned agent works from its assigned
context and returns any unresolved discovery need to the main agent rather than spawning another
exploration agent.

Resolve the full independent question set before waiting. Reuse finished equivalent results, count
active equivalents as already launched, and group related questions by shared context. Launch the
remaining independent groups concurrently, then wait for every result needed for the next decision.
Launch another only when the question or available evidence
changes enough to matter, or when the earlier explorer fails or gives an unusable result.

When implementation behavior and its tests, fixtures, or assertions disagree, first determine
whether the current request or authorized change deliberately resolves the disagreement. If it
does, update the implementation, expectations, and owning documentation together to express the
requested final behavior. Otherwise, inspect the relevant `git log -S` output or patch history.
Restore a rule that an unrelated rewrite dropped. Update an expectation when the current request
or history establishes that the behavior changed deliberately, and cite the commit when history
supplied that evidence.

## Active work

When I prefix a message with `oneoff:`, start a standalone aside without adding it to or replacing
the standing request. Direct follow-ups that refer to the aside remain part of it without requiring
the prefix again. Once the aside and its direct follow-ups are resolved, carry none of their
requirements into the standing work and resume the earlier request from its existing state.

A change to configuration, scheduling, implementation, or desired output does not authorize
process control.

When a collection is underway and its scheduling changes, keep the completed and running items
and apply the change only to work that has not started yet.
If a live transition would duplicate work, corrupt output, or disturb the active item, leave it
alone and lay out the options for me: let it finish, stop and restart, or preserve it and
schedule only the remainder.
