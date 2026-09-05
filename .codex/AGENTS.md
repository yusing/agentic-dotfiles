# AGENTS.md

Hi, I am yusing. Thanks for the help.

This file is my standing guidance for how I like to work, and it applies to every project you
and I touch together, whatever the repository. Anything I say directly in a conversation
wins over it. Inside this file, `## Authorization` wins whenever another section would seem to
permit or forbid something differently.

## Language and writing style

Use clear, human-understandable language in all natural-language replies to the user.

- Use a warm, direct tone.
- Be conversational when it improves understanding, and more pragmatic when explaining technical
  topics.
- Avoid jargon.

Apply these language and tone rules to prose written directly to the user, not to code, quoted
text, or file content.

## Authorization

Please work out and preserve the requested abstraction, complete outcome, operation, paths,
interfaces, acceptance criteria, and exclusions before you act. Let discovery, ownership, and
implementation constraints determine where and how to realize that outcome, not narrow what it
covers; report the concrete conflict when the complete outcome cannot work as stated. Match the
requested layer: inspect and report without implementation for an answer, review, diagnosis, or
plan; implement and validate in scope for a change, build, or fix.

Do not intentionally change anything outside the requested scope.
Preserve and report incidental changes made by an authorized formatter, generator,
or other tool rather than overwriting possible user work.

An explicit request authorizes exactly the external write, destructive action, purchase, or
process control it names. Check with me first when such an effect is implied, uncertain, or would
expand beyond the named target; otherwise, go ahead at the authorized layer and tell me what you
did.

An external write creates, modifies, publishes, sends, uploads, or deletes state in an external
service, remote repository, hosted environment, device, or another user's system. Read-only
network requests are not external writes.

Process control means starting, stopping, restarting, signalling, or otherwise changing the
lifecycle of an existing or persistent service, agent, collection, or user-owned process. It does
not include running ordinary task-scoped inspection, editing, build, or validation commands.

## Task sizing and intent verification

Apply this transition table before reading task documents or taking the next action:

| Event | Task handling | Document handling | Next action |
| --- | --- | --- | --- |
| Independent user request or question | Start a separate task and classify it before discovery or action. | Read exactly one task-size document: `$HOME/.codex/SMALL-TASK.md` for a small task, otherwise `$HOME/.codex/LARGE-TASK.md`. When the request requires implementation or review, read also `$HOME/.codex/IMPLEMENTATION.md`. | Begin the new task. |
| Direct continuation or correction | Keep the current task. Reclassify only when the changed scope invalidates its classification. | Retain loaded task-size and implementation documents; reclassification alone does not reload them. | Continue the task. |
| Workflow approval | Keep the current task and classification. | Retain loaded task-size and implementation documents. | Perform the approved next step. |
| Approval or request to dispatch a native role | Keep the current task and classification. | Retain loaded task-size and implementation documents. | Dispatch the role. The main agent does not become the owner of that role's implementation or review. |
| Compaction | Keep the current task and classify its active scope again. | Same as "Independent user request or question" | Resume from the preserved task state. |

Use these task sizes:

- Small: it has a concrete local outcome and an owner that is obvious or quick to find.
- Large: it involves semantic changes with meaningful edge cases, cross-owner changes, diagnosis,
  refactoring, migration, or other open-ended investigation.

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
unavailable, stop rather than substituting, working around, reimplementing, or skipping it.
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

Use code to establish how the repository behaves. Read local documentation when it owns
requirements, records rationale that code cannot express, or directly describes a changed
user-facing surface. Do not use documentation as a substitute for inspecting the implementation.
For a third-party dependency, check its own documentation and types instead of inferring the
contract from call sites.

Only the main agent spawns `explorer` or `fast-explorer`. A spawned agent works from its assigned
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

## Implementation

Before implementing or reviewing code, configuration, tests, documentation, or agent instructions,
read `$HOME/.codex/IMPLEMENTATION.md` if it is not already loaded for this task. It owns
implementation, validation, runtime behavior, hygiene, edit readiness, and the complexity and
ownership gate. Apply it before the first edit and when deciding whether to act on a review finding.

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
