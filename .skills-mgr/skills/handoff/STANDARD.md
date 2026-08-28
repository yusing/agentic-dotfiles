Produce an execution-ready Markdown handoff for the next LLM, which will resume the current task.

## Standard

Write the minimum sufficient working set. The handoff is complete when the next LLM can perform the first unfinished action without rereading the conversation, repeating completed investigation, or guessing about the outcome, current state, scope, constraints, or validation.

The caller owns the cutoff and delivery. Use the cutoff supplied by the invoking skill or runtime.
The handoff operation itself is outside the carried task state: loading, composing, writing, or
compacting the handoff is never a task action. This standard defines the handoff document; the
caller owns its destination and any acknowledgement that follows.

## Request state

Begin the handoff with `## Original request`. Treat each distinct requested outcome,
correction, constraint, or aside as a request item. Classify every request item, including the
first prompt, the first task request, later messages, and entries inherited from an earlier
handoff, along two independent axes:

- Kind is `standing` when the item defines or changes the standing outcome, scope, acceptance
  criteria, or constraints. Kind is `oneoff` when resolving the item does not change that
  standing request, whether or not the user wrote the `oneoff:` prefix and regardless of where
  the item appears in the conversation. Direct follow-ups remain with the item they continue.
- State is `open` when obligations remain and no requested outcome has been verified. State is
  `partial` when some requested outcome is verified but any response, action, validation,
  report, or external obligation remains. State is `complete` only when all of the item's
  obligations are satisfied. An answered informational question is complete.

A standing constraint remains `[open]` while it governs any unfinished standing item, including
after the agent has complied with it once. It becomes `[complete]` only when the standing work
is complete or the user withdraws or supersedes it.

Text that neither creates a request item nor changes one is not request state. Exclude commentary,
emotional reactions, and criticism aimed only at the current attempt. When that text contains an
underlying correction that still changes standing work, retain only the correction.

Re-evaluate kind and state from the current conversation evidence on every handoff. Inherited
request text and inherited status are inputs, not authoritative state.

Across successive handoffs, preserve inherited request wording that remains selected for an
unfinished item exactly until newer user wording supersedes it. Preserve an inherited confirmed
interpretation while its request remains unfinished until newer user evidence supersedes it.

Under `## Original request`, list only standing items whose state remains relevant. Every item
starts with exactly one status tag:

- For `[open]`, reproduce the user's relevant words verbatim and in order. Preserve every word
  that still defines the outcome, scope, acceptance criteria, or constraints; omit unrelated
  text from the same message. Never paraphrase, translate, re-scope, or merge retained words.
- For `[partial]`, preserve the user's words by the same rule, then add `Completed:` with the
  verified resulting baseline and `Remaining:` with the unfinished obligation. Never make the
  completed portion executable again.
- For `[complete]`, state the resulting baseline instead of repeating the original imperative
  or question wording. Include a completed baseline only when unfinished work depends on it or
  when its status is needed to make clear that no continuation remains.

When no standing item is `[open]` or `[partial]`, include `[complete] No standing work remains.`
Never retain a superseded item.

Add `## Confirmed interpretation` only when the user explicitly approved a reading of an
unfinished request item. Name the item it interprets, attribute the reading to the user, and
treat it as the binding reading while keeping it separate from their own wording. Never promote
your own reading of an ambiguous request into this section.

A complete oneoff has no request-state representation. Preserve its resulting baseline only when
unfinished work depends on it; otherwise remove it even when an inherited handoff retained it.
When a oneoff remains unfinished, add `## Current oneoff`. When multiple oneoffs remain unfinished,
list every unfinished oneoff newest first. Start each with `[open]` or `[partial]` according to its
state and reproduce its relevant words. For `[partial]`, include the same `Completed:` and
`Remaining:` fields. After the current oneoff completes, resume the remaining oneoffs newest first
before returning to standing work.

When work remains, add `## Continuation`. Order every unfinished obligation by this single priority:

1. Prerequisite incomplete hook obligations, in dependency order and then stable recorded order.
2. Every unfinished oneoff, newest first.
3. Unfinished standing items, in their request order.

Write exactly one `Next:` line naming the first obligation in that order and its first unfinished
action. When further obligations remain, write exactly one `Then:` line listing them in the same
order. Only `Next:` selects work for immediate continuation. `[complete]` entries establish current
state and produce no action or response. Omit `## Continuation` when no work remains. Work remains
while any action, response, validation, report, hook, or external obligation is unfinished.

## Attribution

Every constraint, requirement, exclusion, and decision carries its source. A source is the user,
a named repository file or test, specific tool output, or the current agent or an explicitly named
inherited agent only for an entry under `## Working choices`. Name it inline.

Drop anything whose source you cannot name. Do not carry an unsourced constraint forward in
case it mattered; an invented constraint costs the next LLM more than a rediscovered one.

Choices made by the current agent or an inherited agent belong under `## Working choices`, one
line each: the choice, its named agent source, why it was made, and what would justify changing it.
They are revisable by default and are not constraints. Never restate one as a constraint, a
requirement, or user intent.

Attribution moves in one direction only. A working choice becomes a constraint only when a
new user message or new evidence makes it one, never because it was repeated before. When an
inherited constraint has no source, demote it to a working choice only when its rationale is known
and attributable to an agent; otherwise drop it. Do so silently: write the corrected state, and
record no note that anything was demoted or dropped. The source requirement is what prevents an
unsourced constraint from returning, so no tombstone is needed.

Record an approach as ruled out only together with the evidence that ruled it out. Never
narrow the remaining approaches by omission: leaving an untried approach out of the handoff
must not read as a decision against it, so when the request still admits several approaches,
say the choice is open.

## Selection

The request-state sections above apply their own lifecycle filter. For every other detail,
include it only when it does at least one of these:

- Enables or changes an unfinished action or decision.
- Establishes verified state that unfinished work depends on.
- Prevents a specific known wrong turn or repeated investigation.
- Preserves an unresolved blocker, dependency, constraint, risk, approval, running operation, hook obligation, or final-report obligation.
- Identifies a relevant local change and whether its validation is complete.

`## Last action` is the single exception to this filter. Always include it as current continuity
state, never as permission to replay a completed action.

Represent completed work by its resulting baseline, not by the steps or attempts that produced it. Keep an earlier decision only when it still governs unfinished work.

Use the latest evidence. Remove resolved blockers, superseded plans and attempts, stale identifiers, abandoned hypotheses, completed action lists, conversational chronology, and details retained only as a historical record.

## Format

- The handoff document contains only the handoff. Add no preamble, meta-commentary, or closing summary.
- Write the current state of the task only. Never mention compaction, an earlier handoff, or how this handoff differs from one before it. The request-state sections state the request as it stands; they are not conversational history.
- The request-state sections have this fixed order: `## Original request`, then optional
  `## Confirmed interpretation`, then optional `## Current oneoff`.
- Add `## Last action` immediately after those request-state sections. Its single line records the
  most recent task action before the caller's cutoff, why it was performed, and its state. Preserve
  the inherited last action when no newer task action occurred after its cutoff. For an action, use
  exactly one of `[complete]`, `[partial]`, `[failed]`, or `[blocked]` and format the line as
  `<state> <action>: <why>`, for example `[partial] changed foo.go function Foo: implement the
  requested bar behavior; validation remains`. When no task action has occurred at any represented
  cutoff, use the exact line `[none] No task action occurred before the cutoff.`
- After `## Last action`, use short `##` headings for active concerns such as `Current blocker`,
  `Constraints`, and `References`. Put `## Continuation` last when it is required.
- Include a section only when it has current content, except `## Original request` and `## Last action`, which are always present. Never add another section merely to satisfy a template.
- Prefer precise bullets and short paragraphs. State each fact once.
- Use code blocks only for exact commands, payloads, errors, or data that must be preserved verbatim.
- Use relative paths for files inside the working directory and absolute paths for external files.
- Include exact paths, symbols, identifiers, commands, and error text only when continuation depends on them.

## State discipline

- Distinguish verified facts from pending checks and inferences.
- Preserve the state of relevant uncommitted changes, running processes, deployments, and validations. Do not imply that pending work succeeded.
- Keep the handoff unbiased. Report what is true and what is unresolved, and leave the next LLM free to choose its own procedure.
- Preserve validation already completed only when it establishes a baseline that should not be repeated, and state any untested boundary that remains material.
- Preserve user-requested scope, exclusions, and operational constraints that still govern unfinished work.
- Mark work the user never requested and the original request does not require as optional, so the next LLM can drop it instead of inheriting it as committed scope.
- Preserve every unfinished part of the original request, including parts no recent turn worked on. Never let the currently active sub-task stand in for the full request.
- Safe redaction overrides every verbatim-preservation rule. Replace each secret, credential,
  personal datum, or related sensitive value with a stable descriptive placeholder. Name a safe
  reference to its secure source by path or identifier when available; otherwise preserve an
  obligation to reacquire it from the user or an approved secret manager. Keep unrelated sensitive
  tool output out entirely.
- Exclude generic system, developer, and repository instructions; the working directory; completed
  hook responses; skill bodies; and the bodies of separately available full specifications, plans,
  ADRs, issues, commits, and diffs. Reference their authoritative path or identifier when unfinished
  work needs them. When the conversation is the only authoritative source, preserve the selected
  request wording or baseline instead.
- Exclude injected `AGENTS.md` contents, but preserve its path when the file itself is an unfinished
  work target.

## Continuity obligations

- Preserve each incomplete hook obligation and its owning hook path without copying the full hook wording.
- Treat skill bodies loaded before the handoff as unavailable to the next LLM.
- For every skill that remains active for unfinished work, add `## Active skills to reread` and list
  its exact name only. Injected agent instructions own the reread mechanism.
- Express skill continuity only through that section. Never describe a skill's earlier load state or
  tell the next LLM to skip its read. Omit skills that no longer apply without mentioning them.
- Treat unresolved reporting or external obligations as unfinished work.

Do not fabricate state, progress, conclusions, or next steps. The shortest handoff that satisfies the completion standard is the correct handoff.
