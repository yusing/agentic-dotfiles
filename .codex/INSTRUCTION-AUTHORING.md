# Instruction authoring

Check the effective instructions at their consumers, not just the edited file.

## Prompt design

- State the intended result, scope, constraints, and completion criteria. Include running and
  inspecting the result when that is part of completion; avoid an unnecessary first-pass review gate.
- Define which decisions need user input and which routine choices the agent can resolve. Make
  permission boundaries specific enough that caution does not halt already authorized work.
- Audit all applicable instruction surfaces for conflicting or stale rules. Strong instruction
  following can amplify an accidental restriction; trace unexpected pauses to the exact rule.
- Specify the audience, tone, and useful level of detail instead of relying on default formatting.
- Set delegation expectations for the workflow explicitly, within the existing authority and role
  boundaries. Calibrate verification to the change; require meaningful checks rather than repeated
  broad testing after the relevant checks pass.
- Prefer outcomes over fixed itineraries. Retain useful local facts and constraints, and make
  document pointers conditional on the operation. Reconsider scaffolding inherited from older models
  while accounting for other models and clients that still consume the same instructions.

## General design

- **Ownership:** Give each rule one owner at its existing scope: shared behavior, repository facts,
  task decisions, skill methods, or role boundaries. Link instead of copying; do not invent layers.
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

Check meaning, triggers, and owner pointers for wording changes. For workflow changes, trace affected
main and delegated paths, including writers or read-only agents only when their contracts change.
For inheritance changes, check supported fresh-context and no-history forks. Look for duplicate
decisions, broken or circular pointers, and expanded authority. Source inspection does not prove
runtime reload or behavioral improvement.
