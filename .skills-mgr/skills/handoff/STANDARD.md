# Continuation content standard

Give a fresh session the state that determines its next action, not a history of the session.

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

Start with the outcome, acceptance criteria, scope, and still-binding constraints. Consolidate
repeated requests without losing distinct unfinished outcomes. Apply corrections only to the
affected requirement and retain compatible approvals. Preserve exact wording when paraphrasing
would erase a distinction; distinguish user decisions from agent assumptions.

Carry prohibitions with their operational scope, including coordinated actions. A prohibition on
one command or target does not ban its entire tool. Exclude prohibited work even if an old plan
included it. Record unresolved authorization as a decision, not an executable action.

Keep an aside only while obligations remain. Carry a useful fact from an answered question under
its topic, not as a completed conversation item.

## Useful state

Keep a detail only when it supplies a needed baseline, changes unfinished work, prevents a known
wrong turn or repeated investigation, or preserves an outstanding obligation:

- Relevant local changes and uncommitted/deployed state, including ownership or staging distinctions.
  Prefer narrow file/symbol pointers over a changelog or copied specification.
- Latest relevant measurements and their acceptance metric. Separate reported results from checks
  verified for this exact state; old suite counts do not validate later edits. Name unchecked behavior.
- Material findings, revisable assumptions and their reasons, evidence limits, and still-open choices.
  An unproven limitation is not an impossibility result.
- Outstanding approvals, failures, reporting, and external obligations. Keep recovery details only
  for a live need, not a completed operation's backup history.
- Useful agent findings, not completed rosters or session-local identities. For ongoing work, keep
  enough information to inspect it or identify the recovery gap; do not claim old agents remain live.

Remove superseded plans, abandoned hypotheses, stale identifiers, and validation chronology.
A stale documentation reference does not create new reconciliation or cleanup work.

## Evidence and references

Attribute binding requirements to the user or authoritative owner. Prefer retrievable paths and
test names over agent names or inaccessible tool-result IDs. If conversation is the only source,
retain the useful substance as reported evidence, not fresh verification.

Use relative paths inside the workspace and absolute external paths only for needed inputs or
recovery evidence. Preserve essential conclusions when a temporary artifact is their only source.
Name missing/unverified availability; a dead path is not an instruction to recreate irrelevant work.

Carry task-specific requirements, not system/developer text, AGENTS.md contents, standing rules,
or skill bodies, even paraphrased. Point to maintained instructions/specifications needed for
unfinished work. An AGENTS.md path may remain when it is itself a work target. Replace secrets
with descriptive placeholders and a safe source or necessary reacquisition obligation.

## Unfinished actions

Describe checks and operations by intent, relevant interface/test, and indispensable inputs such
as a replay fixture or acceptance limit. Do not freeze incidental shell recipes, wrappers, flags,
build settings, or install steps. Keep exact commands only for an explicit user method or a
prohibited operation, with their authorization meaning intact.

Include `Active skills to reread` only for skills still required by an explicit instruction or
ongoing workflow. List names, not bodies; omit completed, speculative, and empty entries.

## Shape and continuation

Use headings suited to the state. State each fact once; omit preambles, empty templates, mandatory
last-action sections, and change history.

Put Continuation last when work remains: `Next:` names the first unfinished action and `Then:`
later obligations. Order prerequisite hooks first, then unfinished asides newest first, then
standing work in request order. Reference an incomplete hook's owner without copying its rules.

Completion includes required validation, documents, reporting, and external obligations. If none
remain, say so. For a blocker, name the concrete missing decision/dependency and preserve
independent work that can still proceed.
