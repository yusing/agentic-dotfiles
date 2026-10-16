---
name: instruction-audit
description: Audit agent instruction layers, ownership, and observed behavior using independent reviews and session evidence.
disable-model-invocation: true
---

# Instruction audit

Audit the instructions that reach agents, not just the files that store them. Deliver prioritized,
evidence-backed findings and owner-level resolutions. An audit invocation alone requests findings;
implement resolutions only within the accompanying authorization.

## Establish the evidence boundary

Identify the selected clients, instruction surfaces, audit questions, relevant sessions or time
window, and whether changes are requested. Use the current session when none is named; expand to a
bounded relevant local sample when historical behavior matters. State the coverage and gaps rather
than treating a sample as a complete history.

Use the environment's existing instruction-authoring and ownership guidance. Trace configured
entry points to their maintained owners, generated consumers, installed copies, and captured
prompts. For each relevant layer, establish:

- Its readers: main, custom subagents, built-ins, or operation-specific roles.
- Its delivery: harness loading, explicit reads, imports, hooks, or conversation inheritance.
- Its authority and composition: replacement, addition, override, scope, and refresh behavior.
- Its relationship to home-level, repository, and nested-project guidance.

A role name, filename, catalog entry, or parent tool read does not establish what a child received.
Separate current source behavior, documented platform behavior, and captured runtime delivery.

## Gather independent findings

Split genuinely independent work across the available roles. Useful lanes are:

| Lane | Evidence and questions |
| --- | --- |
| Client or layer review | Conflicts, duplicate effective delivery, stale pointers, missing relationships, and rules assigned to the wrong owner or reader. |
| Session investigation | Actual instruction/action/correction chains showing misdirection, redundant work, or failure to load applicable guidance. |
| Checks and tool economy | Existing validation and its wiring, stale assertions, excessive reads or output, and mechanical mistakes a current check could catch. |

Omit lanes without applicable scope or evidence. Give reviewers the factual scope and user
requirements independently, without feeding them another reviewer's conclusions. Main pauses its
own audit analysis and edits until all assigned findings arrive. Answer user clarifications during
the wait; resume synthesis after every assigned review is complete. When delegation is unavailable,
keep these evidence categories separate and disclose the lack of independent review.

For each candidate, identify the rule and consumer, triggering situation, conflicting or redundant
behavior, evidence location, consequence, and smallest correction at the existing owner. Seek
counterevidence before generalizing. Similar text serving separate clients or different actors is
not automatically redundant.

For behavioral claims, recover the instruction version available at the time, the agent action,
and any user correction or rework. Distinguish an original trace from a later report of it. Report
measured costs only when established; elapsed time is not isolated overhead. A rule permitting an
action does not prove it caused that action. Do not transfer one model's observed behavior to
another client without evidence.

## Synthesize and resolve

Classify findings before prioritizing them:

- **Current source defect:** a reachable contradiction, broken reference, or incorrect relationship.
- **Observed behavioral problem:** a session demonstrates the action and consequence, with causal
  confidence stated separately.
- **Historical, corrected incident:** useful regression evidence, not a current defect.
- **Hypothesis or coverage gap:** insufficient evidence for a behavioral conclusion.

Reconcile disagreements against the evidence and intended outcome. Separate accepted findings,
rejected claims, and unresolved gaps. Cite local paths and lines; cite the actual external pages
used for platform or research claims. Official documentation supports platform claims, while
session captures establish local delivery and behavior.

Prefer removing stale rules, narrowing triggers, correcting ownership, and precise on-demand
navigation over adding another layer or repeating policy. Evaluate progressive disclosure,
positioning, and whether the file's structure clearly signals active policy, reference evidence,
generated content, or historical records. Treat formatting and placement as design hypotheses
unless evidence establishes their effect.

When fixes are authorized, settle their owner and consumer impact before editing. Reuse existing
validation: repair broken checks before inventing replacements, and distinguish mechanical checks
from judgment about wording. New hooks, CI gates, scripts, and live model evaluations are not
automatic audit outputs.

## Verify and report

Follow the existing authoring, validation, and review workflow for authorized changes.

Report the prioritized findings and dispositions, changed owners and consumers when applicable,
checks actually performed, and remaining delivery or behavioral gaps. Structural checks and source
inspection do not establish live reload, enforcement, or improved model outcomes.
