# Continuation content standard

Write the smallest self-contained account that lets a fresh session resume the unfinished task.
Preserve what determines the next action, not the history of how the previous session got there.

## Caller boundary

This standard defines content for either runtime compaction or a file handoff. The caller supplies
the cutoff and controls delivery, destination, and response format. This standard does not require
a file, a path-only response, or any particular delivery mechanism.

Use the task context held at the cutoff. Do not investigate, run checks, or continue implementation
to prepare the handoff. State material gaps instead of filling them with assumptions.

Handoff requests and their instruction reads, composition, delivery, and acknowledgements are
control flow, not unfinished user work. If a new caller takes over an undelivered handoff, inherit
the earlier task cutoff and supersede its delivery obligations. Carry neither caller's handoff
control flow into the task account. The next session resumes the underlying work, not an abandoned
file-writing or acknowledgement step.

## Current request

Begin with the current task: the requested outcome, acceptance criteria, scope, and still-binding
constraints. Consolidate repeated requests into one account. Preserve distinct unfinished outcomes;
a recent subtask must not displace the rest of the request.

Read prohibitions as part of the request, including their scope over coordinated actions. Keep a
prohibited operation out of pending work even when an earlier plan proposed it. Preserve exact
operational boundaries: prohibiting one command or target does not prohibit every use of its tool.
Apply user corrections to the affected requirement without discarding compatible requirements.
Preserve still-valid approvals within their scope; neither a routine nor an inherited plan grants
additional permission. Record genuinely unresolved authorization as a decision needed, not an action
to execute.

Use plain language rather than a verbatim message ledger or mandatory status tags. Keep exact user
wording when it defines a distinction that paraphrasing would lose. Distinguish a user-approved
interpretation from an agent's assumption; an assumption does not become user intent through
repetition.

Include an aside only while it has unfinished obligations. If an answered question yielded a fact
needed for the standing task, carry that fact in its relevant section without mentioning the
question or its completion.

## Useful continuation state

Select a detail only if it establishes a needed baseline, changes an unfinished action or decision,
prevents a specific known wrong turn or repeated investigation, or preserves an outstanding
obligation. Apply this test to every section, including the last action; none is required merely
for continuity.

- Describe relevant local changes and their uncommitted or deployed state. Preserve ownership or
  staging distinctions when they affect safe continuation. Use narrow file or symbol pointers
  instead of a file-by-file implementation changelog or copied specification.
- Keep the latest relevant measurement, its acceptance metric, and the remaining gap. Distinguish
  reported results from checks actually verified for the represented state. Record which behavior
  remains unchecked; old suite counts and fixed failures do not validate later changes.
- Keep concise findings and their evidential limits when they prevent repeating expensive work or
  making an unsupported claim. An unproven limit is not an impossibility result. Leave genuinely
  unchosen approaches open.
- Preserve outstanding failures, approvals, reporting, and external obligations. Carry recovery
  details only for a live recovery need, not because a completed rebase once produced a backup.
- Carry useful agent findings, not completed-agent rosters, session-local identities, or claims
  that those agents remain available. For running work, retain the information needed to inspect
  or resume it, or explicitly identify the recovery gap.

Remove superseded plans, completed action lists, abandoned hypotheses, stale identifiers, and
historical validation chronology. Do not invent documentation reconciliation or cleanup work from
a stale reference; retain it only when it is genuinely required by the unfinished outcome.

## Evidence and references

Attribute binding requirements to the user or their authoritative owner. Prefer repository paths,
test names, and retrievable evidence over names of agents or inaccessible tool-result identifiers.
When the conversation is the only source of a useful result, preserve its substance as a reported
finding. Do not upgrade it to fresh verification. Keep relevant working assumptions revisable,
with their rationale, rather than restating them as constraints.

Include an external path only for a needed input, evidence source, or recovery artifact. Preserve
the essential conclusion in the handoff when a temporary artifact would otherwise be its only
source. State known missing or unverified availability and any resulting dependency. A dead path
must not masquerade as an available source or create an obligation to recreate irrelevant material.

Carry task-specific requirements, not the active instruction set. Exclude system and developer
instructions, injected `AGENTS.md` contents, standing repository and agent rules, and skill bodies,
including paraphrased summaries of those instructions. When unfinished work needs a maintained
instruction document or specification, reference its authoritative path rather than repeating its
contents; preserve an `AGENTS.md` path when that file is itself an unfinished work target.

Use relative paths within the workspace and absolute paths for external resources. Preserve
secrets and sensitive data only as descriptive placeholders, with a safe source reference or a
necessary reacquisition obligation.

## Actions without frozen recipes

Describe unfinished operations and checks by intent, relevant test or interface, and indispensable
inputs such as the replay fixture and acceptance limit. The continuing session chooses execution
commands from the current project state and applicable instructions. Do not carry shell recipes,
flags, wrappers, build settings, or installation steps merely because a previous session used or
planned them.

Exact command text may identify a prohibited operation or an explicitly required user method.
Preserve that meaning and authorization boundary; do not convert it into a suggested recipe.

Include an `Active skills to reread` section only for skills still required by an explicit instruction
or an ongoing workflow. List their names, not their bodies. Omit previously loaded skills whose
work is finished, speculative future skills, and an empty section. The current instructions govern
skill selection when work resumes.

## Shape and continuation

Use short topical headings suited to the live content, such as Task, Current state, Validation,
Findings, or Remaining decisions. State each fact once. Include no preamble, change history,
mandatory last-action section, or empty template sections.

When work remains, put Continuation last. Give the first unfinished action in a `Next:` line and
any later obligations in a `Then:` line. Respect dependencies: prerequisite hook obligations first,
then unfinished asides newest first, then standing work in request order. Preserve an incomplete
hook's owner reference without copying its instructions.

Completion includes any required validation, documentation, reporting, and external obligations,
not implementation alone. If nothing remains, say so without manufacturing another action. If a
user decision or unavailable dependency blocks progress, identify the concrete gap and preserve
independent work that can still proceed.
