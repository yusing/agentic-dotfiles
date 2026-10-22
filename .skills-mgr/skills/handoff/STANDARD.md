# Continuation content standard

Give a fresh session the state that determines its next action, not a history of the session.
Assume the handoff consumer has none of the prior conversation, tool results or session state,
but can read durable workspace files and query Git. Self-contained means preserving the
necessary context and decisions that cannot be recovered there, not copying retrievable content.

## Caller boundary

The caller supplies the cutoff, destination, delivery, and response format. This standard defines
content for runtime compaction or a file handoff; it requires neither a file nor a path-only reply.
Use context already held at the cutoff. Do not investigate, validate, or continue implementation
while composing; name gaps instead.

Handoff invocation, instruction reads, composition, delivery, and acknowledgements are control
flow, not unfinished user work. A new caller that takes over an undelivered handoff inherits the
original task cutoff and supersedes its delivery obligations. Resume the underlying task, not
an abandoned handoff or acknowledgement step.

## Current request

Honor the caller's transfer scope. In a focused task handoff, carry another
workstream only when it is a direct dependency. A runtime-compaction handoff still
preserves the unfinished work covered by its caller's scope.

Start with the outcome, acceptance criteria, scope, and still-binding constraints. Consolidate
repeated requests without losing distinct unfinished outcomes. Apply corrections only to the
affected requirement and retain compatible approvals. Preserve exact wording when paraphrasing
would erase a distinction. Attribute a decision to the user only when explicitly stated.
Keep observations, agent conclusions, and proposals distinct from user decisions. An interruption
records that work stopped; it does not establish a new prohibition or revoke authorization.

Carry only constraints that still apply to the receiving session, preserving their operational
scope. Omit constraints that expire at the transfer boundary; runtime compaction within the
same session retains its still-binding session constraints. A prohibition on one command or target
does not ban its entire tool. Exclude work that remains prohibited even if an old plan included it. Describe genuinely unresolved authorization as an open question, not
a user decision or executable action.

Keep an aside only when it is in scope and an obligation remains. Carry a useful fact from an answered question under
its topic, not as a completed conversation item.

## Useful state

Keep a detail only when it supplies a needed baseline, changes unfinished work, prevents a known
wrong turn or repeated investigation, or preserves an outstanding obligation:

- Ownership, intent or deployment facts that files and Git cannot establish.
  Point to durable records and relevant source locations; let the recipient retrieve current
  diffs, status, revisions and file contents instead of copying them into the handoff.
- Latest relevant measurements and their acceptance metric. Separate reported results from checks
  verified for this exact state; old suite counts do not validate later edits. Name unchecked behavior.
- Material findings, revisable assumptions and their reasons, evidence limits, and still-open choices.
  An unproven limitation is not an impossibility result.
- Outstanding approvals, failures, reporting, and external obligations. Keep recovery details only
  for a live need, not a completed operation's backup history.
- Useful findings stated in terms of the work, not agent names or roster entries. For unfinished
  work, give its purpose, current result, and a retrievable source or artifact when one exists.
  Do not claim old agents remain live.

Remove superseded plans, abandoned hypotheses, stale identifiers, and validation chronology.
A stale documentation reference does not create new reconciliation or cleanup work.

## Evidence and references

Attribute binding requirements to the user or authoritative owner. Reference durable files and
their relevant sections instead of repeating their contents. Preserve a conclusion inline only
when it is not recoverable from those sources; identify conversation-only evidence as reported,
not freshly verified. Omit session-scoped identifiers and handles, including mchanges ranges,
tool-result IDs and agent roster IDs. They are not portable evidence for a fresh session.

Use relative paths inside the workspace. Preserve essential conclusions when a temporary artifact is their only source.
For a completed review, point to its durable report and preserve only an unresolved decision
not already recorded there. Carry findings inline only when no durable report exists.
Name missing/unverified availability; a dead path is not an instruction to recreate irrelevant work.

Carry no system/developer text, or skill bodies, even paraphrased.
Point to maintained instructions/specifications needed for unfinished work.
An AGENTS.md path may remain when it is itself a work target. Replace secrets
with descriptive placeholders and a safe source or necessary reacquisition obligation.

## Unfinished actions

Describe checks and operations by intent, relevant interface/test, and indispensable inputs such
as a replay fixture or acceptance limit. Do not freeze incidental shell recipes, wrappers, flags,
build settings, or install steps.

## Shape and continuation

Use headings suited to the state. State each fact once; omit preambles, empty templates, mandatory
last-action sections, and change history.

Each next action must identify the work and its inputs without session-only references.

Put Continuation last when work remains: `Next:` names the first unfinished action and `Then:`
later obligations. Order prerequisite hooks first, then unfinished asides newest first, then
standing work in request order. Reference an incomplete hook's owner without copying its rules.

Completion includes required validation, documents, reporting, and external obligations. If none
remain, say so. For a blocker, name the concrete missing decision/dependency and preserve
independent work that can still proceed.
