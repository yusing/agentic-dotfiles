# AGENTS.md

Hi, I am yusing. Thanks for the help.

This file is my standing guidance for how I like to work, and it applies to every project you
and I touch together, whatever the repository. Anything I say directly in a conversation
outranks it. Inside this file, `## Authorization` wins whenever another section would seem to
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

Please work out the requested outcome, operation, paths, interfaces, and exclusions before you
act. Match the requested layer: inspect and report without implementation for an answer, review,
diagnosis, or plan; implement and validate in scope for a change, build, or fix.

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

### Small tasks

A small task has a concrete local outcome and an owner that is either obvious or quick to find.
For a small task, skip the workflow skills, still read any skill that owns the language,
library, or material you are changing, and then:

1. Follow the exact path, identifier, or literal in my prompt.
2. Read the smallest relevant boundary.
3. Make a safe in-scope assumption when one is available.
4. Perform the authorized operation.
5. Account for owning documentation, then run the cheapest focused check that could prove the
   result wrong.

When exact paths and required commands are supplied for a small task:
 - Treat its implementation boundary as settled.
 - Read those paths and any owning documentation required by step 5 directly.
 - When multiple required commands are ready, use one tool call: run independent commands in
   parallel, and batch commands that must remain ordered.
 - Do not list or search the repository or check repository status or diffs merely to rediscover scope.

### Other tasks

Treat work as medium or complex when it involves semantic changes with meaningful edge cases,
cross-owner changes, diagnosis, refactoring, migration, or other open-ended investigation.

- Stop and ask when:
  * An unresolved assumption could change the outcome, scope, authoritative owner, external
    effects, destructive effects, or material risk.
  * Evidence supports competing interpretations, distinguish the concrete reproducer,
    immediate failure mechanism, violated invariant, and authoritative owner from the assumptions connecting them.
- If I correct the abstraction, scope, owner, or causal model, every conclusion that depended on it is no longer valid.
- Reuse the framing evidence you already gathered, pick up only the remaining operation-ready context,
  and continue at the authorized layer.

## Skills and required tools

Read skill instructions with `skills-mgr get <skill-name> [start:end]`, and listed references
with `skills-mgr get <skill-name>/<relative-path> [start:end]`. Omit the optional 1-based
inclusive range to read the whole file.
Load only the references you actually need.
Run scripts with `skills-mgr run <skill-name>/<relative/script> [args...]`.

If a skill, tool, CLI, package, runtime, or exact approach explicitly required by me, a
higher-priority instruction, an owning skill, or the repository's authoritative workflow is
unavailable, stop rather than substituting, working around, reimplementing, or skipping it.
Explain why it is required and propose an installation, then install only once I agree. If I
decline the installation, ask me how to proceed. Do not introduce or require a dependency solely
for an optional implementation choice; use the simplest suitable available approach instead.

Run every shell command expected to produce large or noisy stdout/stderr through `rtk`. In a
compound command or pipeline, apply `rtk` to each noisy producer rather than mechanically wrapping
every executable. Leave quiet filters, control operators, and redirections outside `rtk`. Use raw
execution when the complete unmodified output is required or when the command's purpose is to
write its output to a file rather than return it to the conversation.

## Cross agent communication

When cross agent communication is required. The main agent creates one task-scoped communication artifact root and passes its path to the each agent.

Only the final consumer reads the artifact. Every intermediary, including the main agent, relays only its path and routing manifest without opening, summarizing, or reproducing its contents.

Agent<->Main: keep the task and result in messages
Agent<->Agent: writes the complete result in an artifact.

### Artifact Format

Use line records for content whose intended reader is another agent, including task and result
messages, routing manifests, and communication artifacts. Each nonempty line is `key value`.
A dispatch starts with `task`; a result starts with `status done|partial|blocked`. Use only the
needed keys from `task`, `scope`, `fact`, `rule`, `check`, `next`, `block`, `artifact`, and
`status`; repeat a key when needed. Use raw paths. Omit empty fields, greetings, headings,
Markdown, serialization wrappers, transitions, and inherited context. Exact code or data keeps
its native syntax or travels in a referenced artifact.

### Agents council

Use the `council` skill only after gathering the relevant evidence when a consequential decision
still has multiple evidence-supported conclusions and no authoritative owner or further available
evidence can settle them. A council can improve your judgment, but it cannot decide intent that
belongs to me.

## Exploring

Use code to establish how the repository behaves. Read local documentation when it owns
requirements, records rationale that code cannot express, or directly describes a changed
user-facing surface. Do not use documentation as a substitute for inspecting the implementation.
For a third-party dependency, check its own documentation and types instead of inferring the
contract from call sites.

Let the task size and the evidence you already have pick your discovery method:

- Small task: The main agent owns discovery. When I supply an explicit path, use it directly.
- Medium/Complex:
  * When framing still leaves the owning path or identifier unknown,
  use an `explorer` with exactly one atomic question and one matching purpose: diagnosis,
  change impact, behavior, or ownership. This includes read-only ownership discovery; a report-only
  outcome does not make the task small.
  * For artifact summarization or context-heavy reading, use `fast-explorer`
  * For repository investigation, use `explorer`.

Only the main agent spawns `explorer` or `fast-explorer`. A spawned agent works from its assigned
context and returns any unresolved discovery need to the main agent rather than spawning another
exploration agent.

If an equivalent explorer is already active, please wait for it; if it has finished, use its
result. Launch another only when the question or available evidence changes materially, or when
the earlier explorer fails or gives you an unusable result.

When implementation behavior and its tests, fixtures, or assertions disagree, first determine
whether the current request or authorized change deliberately resolves the disagreement. If it
does, update the implementation, expectations, and owning documentation together to express the
requested final behavior. Otherwise, inspect the relevant `git log -S` output or patch history.
Restore a rule that an unrelated rewrite dropped. Update an expectation when the current request
or history establishes that the behavior changed deliberately, and cite the commit when history
supplied that evidence.

## Implementation

Choose the simplest implementation that fully meets the current requirements.
Start with the smallest working end-to-end version, then add capabilities without regressing
behavior that the current requirements still accept. A behavior superseded by the current request
is not a compatibility obligation.

Please validate the implementation through the interface that owns the changed behavior. Test every
reachable happy and unhappy path affected by the change.

Please keep the demonstrated failure and violated invariant together as the unit of
implementation and of any authorized commit. Helper code, callers, tests, documentation, and
cleanup that restore the same invariant should travel together. When the same invariant requires
corresponding commits in separate Git histories, including a parent repository and submodule, keep
the complete fix together within each history.

After implementation and before validation, reread the likely documents that own or directly
describe each changed user-facing behavior, interface, configuration, workflow, or agent
instruction. Update or remove every claim those documents retain about behavior the change
supersedes. For configuration, include nearby documentation that states the setting or its
operator workflow. Do not inspect unrelated documentation merely to prove its absence.

### Runtime behavior

When a user-facing or operator-facing operation can remain active long enough that silence
obscures whether it is progressing, expose proportional progress through the interface that owns
the operation. Reuse progress, logging, or job-state facilities already owned by the host runtime
or project instead of duplicating them. Report meaningful milestones or measurable completion,
not merely start and finish. Progress reporting must remain auxiliary and must not determine or
interfere with successful core behavior.

For a new operation, use bounded concurrency when work items are genuinely independent and
concurrency materially helps meet a requirement such as latency or throughput. Keep an existing
sequential path sequential when it already meets the current requirements; do not retrofit
concurrency merely because its work items could run independently.

### Hygiene

Please keep durable artifacts focused on the final state. Code, comments, documentation, tests,
commit messages, change descriptions, and final responses should explain the resulting behavior
and only the rationale that still applies. Mention a rejected alternative only when it is
necessary to explain the final choice or the requested artifact is an investigation log, decision
record, or postmortem.

Unless the current requirements explicitly call for compatibility, remove what the authorized
change supersedes rather than retaining it. Removal covers every code path, reference, test,
fixture, configuration entry, documentation statement, and whole file that no longer serves the
final behavior, including obsolete portions of shared files. Do not keep a superseded approach as
a compatibility layer, wrapper, fallback, migration, falsification baseline, documentation
example, or dead test. When you stumble across an unrelated pre-existing obsolete path, tell me
about it and let me decide.

An abandoned attempt, implementation, or previous state does not become a test case merely because
it existed. Do not invent an unhappy path or add a production seam solely to create a test case.
Keep test setup in test sources.

### Edit readiness

Keep components modular and responsibilities separate.
Reuse suitable project dependencies before you write a replacement or add a package.
Prefer maintained libraries when they reduce complexity or improve reliability.

Edit authoritative sources rather than generated, vendored, or minified outputs.
Match the local naming, error handling, idiom, and comment density. Let local style set a
comment's form, but let the final state set its content; the cases below matter even when the
local code has few comments.

Please write a comment wherever the reason for the code cannot be recovered from the code itself:
the invariant a check protects, the caller contract a signature cannot state, the external
behavior that forced a workaround, or the reason a non-obvious choice beat the obvious one.


### Complexity and ownership gate

Before you add any capability, restriction, convenience, defense, limit, validation,
compatibility path, retry, buffer, history, metric, defensive branch, helper, wrapper, callback
seam, interface, adapter, or function extraction, evaluate it against every applicable gate below.
These gates are cumulative checks, not mutually exclusive classifications. Reporting an observed
defect does not itself require a production-design justification, but any production fix you
propose for it must pass the gate.

- `N` — Does another component own this responsibility?
  Is the policy owned by the caller, the upstream provider, the host runtime, an external
  protocol, or another boundary? Would the proposal invent or redefine an external request,
  response, identifier, metadata field, argument, limit, or retry policy? Would it take a policy
  choice away from its authoritative caller and put it in a helper or wrapper that merely selects
  or forwards existing operations?

- `O` — Is the proposal more complex than the demonstrated problem requires?
  Does it add an unnecessary abstraction, a duplicate representation, or maintenance cost?
  Could streaming, hashing, direct comparison, or a simpler implementation solve the same
  problem with fewer resources? Try deleting every new production identifier. If that only moves
  its body unchanged into its sole production caller, without losing a shared policy, owned
  invariant, or nontrivial algorithm, please inline it.

- `D` — Is an authoritative owner already enforcing this policy?
  Would the proposal repeat validation, copy a limit across components, or impose a stricter
  downstream rule on data already bounded at the accepted-input boundary?
  Add another check only when it protects a distinct boundary and derives its rule from the
  authoritative owner.

- `I` — Can accepted inputs actually reach this case?
  If the branch is impossible under the established contracts and invariants, do not handle it as
  a normal condition. If corruption or external mutation is the real threat, validate that
  invariant at the relevant boundary.

- `U` — Is the need still speculative?
  Are the owner, the reproducer, the immediate failure, the violated invariant, or the actual
  consumer unknown? Do not add convenience, count limits, size limits, or compatibility behavior
  until those are established.

- `J` — Justified: Does this project own a necessary responsibility, resource, invariant, shared
  policy, or nontrivial algorithm?
  Name what it owns, describe the local failure or need, and choose the smallest sufficient
  implementation. For every new production identifier, name the responsibility it owns. Keep it
  only if that responsibility still matters after the deletion test, and do not present a local
  resource guard as an external protocol restriction.

Evaluate the gates once before you implement and again when you review the final diff. In your
internal reasoning, list every new production identifier. Resolve every applicable `N`, `O`, `D`,
`I`, and `U` finding, remove each identifier that fails the deletion test, and keep only identifiers
that satisfy `J`.

This gate never vetoes a capability I explicitly asked for. My request establishes the need for
that capability, but its implementation structure must still pass the ownership, duplication,
reachability, and complexity checks. Keep the gate analysis inside your internal reasoning. In
responses, focus on the requested result, its evidence, and actionable caveats. Include gate
labels, production identifier inventories, or smallest sufficient alternatives only when directly
answering my question about them. Never silently drop, defer, or narrow a requested capability on
gate grounds. If the gate shows my request cannot work as stated, tell me the concrete conflict
before you implement it.

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
