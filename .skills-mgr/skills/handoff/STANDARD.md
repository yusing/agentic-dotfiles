You are performing a CONTEXT CHECKPOINT COMPACTION. Produce an execution-ready Markdown handoff for the next LLM, which will resume the current task.

## Standard

Write the minimum sufficient working set. The handoff is complete when the next LLM can perform the first unfinished action without rereading the conversation, repeating completed investigation, or guessing about the outcome, current state, scope, constraints, or validation.

## Anchor

Begin the handoff with `## Original request`. Reproduce these anchors in the user's own words:

- The user's first prompt.
- The user's first task request, when it came after preliminary questions or conversation.
  When the first prompt was the first task request, include it only once.
- The relevant words from later messages that still define the standing outcome, scope,
  acceptance criteria, or constraints. Preserve their wording and order; omit unrelated text
  from the same message.

Never paraphrase, translate, re-scope, or merge retained words, and never drop the section
because the request looks satisfied or because a narrower sub-task is currently active.

Apply a carry-forward test to every later user message. Retain only content that should still
govern the next agent's work. In particular:

- Retain durable constraints and corrections to the standing outcome, scope, or acceptance
  criteria. A constraint added after the agent violated it remains durable unless the user
  later withdraws or supersedes it.
- Exclude one-time operational directions, whether or not the user wrote the `oneoff:` prefix.
  If such an operation remains unfinished and is still needed, record it as current work in a
  later section; remove it when complete.
- Exclude commentary, criticism, and instructions aimed only at correcting the current agent's
  current attempt. Retain only any underlying correction that still changes the standing work.
- Exclude emotional reactions and other text that does not change the standing work.

When a later message prefixed with `oneoff:` left work unfinished, carry that work in a later
section instead of this anchor.

When the conversation already contains this section from an earlier handoff, treat it as input,
not immutable text. Reapply this anchor rule so transient material does not propagate merely
because an earlier handoff retained it.

Directly below the verbatim words, add `## Confirmed interpretation` for readings the user
explicitly approved, attributed to the user and kept separate from their own wording.
Record only confirmations the user gave. Never promote your own reading of an ambiguous
request into this section.

Then state in one line how the current work serves the original request. When the current
thread no longer serves it, say so, name the last action that did, and treat returning to
that point as the default next action.

## Attribution

Every constraint, requirement, exclusion, and decision carries its source. A source is the
user, a named repository file or test, or specific tool output. Name it inline.

Drop anything whose source you cannot name. Do not carry an unsourced constraint forward in
case it mattered; an invented constraint costs the next LLM more than a rediscovered one.

Choices you made yourself belong under `## Working choices`, one line each: the choice, why
it was made, and what would justify changing it. They are revisable by default and are not
constraints. Never restate one as a constraint, a requirement, or user intent.

Attribution moves in one direction only. A working choice becomes a constraint only when a
new user message or new evidence makes it one, never because it was repeated before. When an
inherited constraint has no source, demote it to a working choice or drop it, and do so
silently: write the corrected state, and record no note that anything was demoted or
dropped. The source requirement is what prevents an unsourced constraint from returning, so
no tombstone is needed.

Record an approach as ruled out only together with the evidence that ruled it out. Never
narrow the remaining approaches by omission: leaving an untried approach out of the handoff
must not read as a decision against it, so when the request still admits several approaches,
say the choice is open.

## Selection

The anchor sections above are exempt from this filter and are always included. For every
other detail, include it only when it does at least one of these:

- Enables or changes an unfinished action or decision.
- Establishes verified state that unfinished work depends on.
- Prevents a specific known wrong turn or repeated investigation.
- Preserves an unresolved blocker, dependency, constraint, risk, approval, running operation, hook obligation, or final-report obligation.
- Identifies a relevant local change and whether its validation is complete.

Represent completed work by its resulting baseline, not by the steps or attempts that produced it. Keep an earlier decision only when changing it would break unfinished work, or when it came from the user.

Use the latest evidence. Remove resolved blockers, superseded plans and attempts, stale identifiers, abandoned hypotheses, completed action lists, conversational chronology, and details retained only as a historical record.

## Format

- Output only the handoff. Add no preamble, meta-commentary, or closing summary.
- Write the current state of the task only. Never mention compaction, an earlier handoff, or how this handoff differs from one before it. Carrying the anchor sections forward is not history; they state the request as it stands.
- Use short `##` headings named for the active concerns. Examples include `Current blocker`, `Constraints`, and `References`.
- After the anchor sections, continue with the unfinished outcome or the current state that determines the next action.
- Put executable next actions in dependency order. Make the first action explicit.
- Include a section only when it has current content, except `## Original request`, which is always present. Never add a section merely to satisfy a template.
- Prefer precise bullets and short paragraphs. State each fact once.
- Use code blocks only for exact commands, payloads, errors, or data that must be preserved verbatim.
- Use relative paths for files inside the working directory and absolute paths for external files.
- Include exact paths, symbols, identifiers, commands, and error text only when continuation depends on them.

## State discipline

- Distinguish verified facts from pending checks and inferences.
- Preserve the state of relevant uncommitted changes, running processes, deployments, and validations. Do not imply that pending work succeeded.
- Keep the handoff unbiased. Report what is true and what is open, and leave the next LLM free to choose its own procedure.
- Preserve validation already completed only when it establishes a baseline that should not be repeated, and state any untested boundary that remains material.
- Preserve user-requested scope, exclusions, and operational constraints that still govern unfinished work.
- Mark work the user never requested and the original request does not require as optional, so the next LLM can drop it instead of inheriting it as committed scope.
- Preserve any part of the original request that is still unaddressed, including parts no recent turn worked on. Never let the currently active sub-task stand in for the full request.
- Keep secrets, credentials, personal data, and unrelated sensitive tool output out of the handoff.
- Exclude generic system, developer, and repository instructions; the working directory; completed hook responses; skill bodies; full specifications; plans; ADRs; issues; commits; and diffs. Reference an authoritative path or identifier when unfinished work needs it.
- Exclude `AGENTS.md` entirely.

## Continuity obligations

- Preserve each incomplete hook obligation and its owning hook path without copying the full hook wording.
- If a skill remains active for unfinished work, add `## Active skills to reread`, list its exact name, and require `skills-mgr get <skill-name>` before more task work. Omit skills that no longer apply.
- If no work remains, state that the task is complete and list only unresolved reporting or external obligations, if any.

Do not fabricate state, progress, conclusions, or next steps. The shortest handoff that satisfies the completion standard is the correct handoff.
