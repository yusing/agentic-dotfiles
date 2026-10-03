# Instruction authoring

Check the effective instructions at their consumers, not just the edited file.

## Prompt design

- State the intended result, scope, constraints, and completion criteria. Include running and
  inspecting the result when that is part of completion; avoid an unnecessary first-pass review gate.
- Make each completion criterion checkable and as demanding as the work: "every affected caller
  accounted for" drives more legwork than "list the changes". A vague bound invites premature
  completion. Sharpen it first; move later steps behind a real context boundary, such as a handoff
  or delegate, only when agents observably rush the current step.
- Define which decisions need user input and which routine choices the agent can resolve. Make
  permission boundaries specific enough that caution does not halt already authorized work.
- Audit all applicable instruction surfaces for conflicting or stale rules. Strong instruction
  following can amplify an accidental restriction; trace unexpected pauses to the exact rule.
- Specify the audience, tone, and useful level of detail instead of relying on default formatting.
- Set delegation expectations for the workflow explicitly, within the existing authority and role
  boundaries. Calibrate verification to the change; require meaningful checks rather than repeated
  broad testing after the relevant checks pass.
- Express the stable outcome we want, leaving ordinary execution methods to the agent. A change
  in runner, editor, or library should not invalidate the requirement.
- Specify a procedure only where the agent needs unfamiliar context, such as a nonstandard tool,
  a third-party library's particular contract, or a local integration. Keep only the necessary
  mechanics and explain when they apply. Familiar tool use does not need a fixed recipe.
- Describe the desired state directly rather than turning it into a maintenance procedure.
  For unfamiliar tools, explain their purpose and relevant constraints so the agent can judge
  when they help. A usage condition without that context can encourage overuse.
- State the target behavior positively. A prohibition names the unwanted behavior and keeps it
  available; keep one only for a distinct boundary that has no positive form, paired with the
  positive target. Remove explanations of common knowledge.
- Prefer a compact word the model already understands to a repeated phrase, such as a _tight_ loop
  or a _red_ test. Repeat the word, not its definition; a coined term needs a definition.
- Retain local facts the agent cannot find by looking: unwritten conventions, reasons, and gotchas.
  Leave scripts, configuration, layout, and `--help` output to the environment, where they cannot
  go stale. Reconsider scaffolding inherited from older models while accounting for other
  models and clients that still consume the same instructions.
- A document pointer's wording decides when the agent reaches its target. Name what the target is,
  lead with the triggering word, give one trigger per distinct case, and condition it on the
  operation. Sharpen a pointer that misses before inlining its target.

### Examples

- Prefer "Test `./cmd/foo`" to a fixed `go test ./cmd/foo` invocation; the test target matters,
  while the current runner may differ.
- Prefer "Perform symbol lookup" to prescribing `gopls references`; ordinary tool selection
  belongs to the executing agent.
- Explain that rtk reduces noisy command output and when raw output matters, rather than giving
  a bare "Use rtk when ..." trigger. The purpose helps the agent judge whether using it adds value.
- Define a README by the understanding, choices, and actions it supports. An "Update README
  when ..." rule replaces that stable purpose with a maintenance procedure.
- Do not append a separate ban on changelogs or task journals when the existing rule already
  excludes them; add only a missing distinction.

## General design

- **Ownership:** Give each rule one owner at its existing scope: shared behavior, repository facts,
  task decisions, skill methods, or role boundaries. Link instead of copying; do not invent layers.
- **Structure:** Inline what every case needs and put what only some cases reach behind a
  conditional pointer. Keep a concept's definition, rules, and caveats together. An always-loaded
  line costs context on every turn; a document reached only through a person's memory costs that
  person. Split a document only when the cut is worth one of those costs.
- **Audience:** Name the actor. Shared guidance must preserve assigned roles and scope, not reopen
  assignments or authorize delegation.
- **Invocation:** Keep simple work direct. Distinguish selecting work, dispatching it, and executing
  an assignment. Delegates need applicable coordination, not redundant task-selection routing.
  Check triggers for documentation and mechanical work too.
- **Renames:** Align names, paths, references, registration, metadata, tests, documentation, and
  allowlists. Align skill directories and frontmatter. Regenerate from the owner; preserve
  historical names in historical records.

## Conditional client and role checks

- **Roles:** Keep descriptions and triggers in native definitions, or the existing owner when native
  roles are unavailable. Use the exposed catalog for selection; role instructions govern execution.
  Workflows own delegation gates and handoffs, not another catalog. Preserve explicit dispatch
  rules for model or reasoning fields intentionally omitted from role configuration.
- **Clients:** Keep model budgets and client-specific dispatch in native configuration or scoped
  workflow sections. Consider all clients sharing an owner and check generated consumers.

## Validation

Audit instruction quality, not merely agreement between files and generated copies. Treat the
change author's rationale as a claim to examine, not an approval checklist. Check meaning,
triggers, and owner pointers. Across the affected layers, distinguish stable outcomes and
constraints from replaceable methods. For each prescribed step, identify the unfamiliar context
that requires it; otherwise express the intended result. Check matching and nonmatching
situations for conditional rules, and remove duplicate obligations or prohibitions that add
no meaning. Test each sentence for a behavior change against the model's default: delete a
failing sentence whole, or replace a word too weak to beat the default. Observed behavior, not
debate, settles disagreement about the default. Prune stale layers instead of adding beside them.
Report consistency checks separately from conclusions about instruction quality.

For workflow changes, trace affected main and delegated paths, including writers or read-only agents
only when their contracts change.
For inheritance changes, check supported fresh-context and no-history forks. Look for duplicate
decisions, broken or circular pointers, and expanded authority. Source inspection does not prove
runtime reload or behavioral improvement.
