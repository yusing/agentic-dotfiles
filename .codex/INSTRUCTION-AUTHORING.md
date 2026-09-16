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
- Express the stable outcome we want, leaving ordinary execution methods to the agent. A change
  in runner, editor, or library should not invalidate the requirement.
- Specify a procedure only where the agent needs unfamiliar context, such as a nonstandard tool,
  a third-party library's particular contract, or a local integration. Keep only the necessary
  mechanics and explain when they apply. Familiar tool use does not need a fixed recipe.
- Give conditional obligations a clear trigger and intended result. State tool-use conditions
  directly; a tool's general benefits alone do not establish when to use it.
- Remove explanations of common knowledge and prohibitions already covered by a positive rule.
  Keep a prohibition when it adds a distinct boundary.
- Retain useful local facts and constraints, and make document pointers conditional on the
  operation. Reconsider scaffolding inherited from older models while accounting for other
  models and clients that still consume the same instructions.

### Examples

- Prefer "Test `./cmd/foo`" to a fixed `go test ./cmd/foo` invocation; the test target matters,
  while the current runner may differ.
- Prefer "Perform symbol lookup" to prescribing `gopls references`; ordinary tool selection
  belongs to the executing agent.
- Prefer "Use rtk for commands expected to produce large output" to deriving a blanket obligation
  from its benefits. Preserve exceptions where compression would discard needed evidence.
- For documentation maintenance, identify the change that requires an update and the reader
  outcome: "When setup or usage changes, keep the README accurate for readers." A description
  of what a README contains alone does not establish that trigger.
- Do not append a separate ban on changelogs or task journals when the existing rule already
  excludes them; add only a missing distinction.

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

Check meaning, triggers, and owner pointers for wording changes. Across the affected instruction
layers, distinguish stable outcomes and constraints from replaceable methods. For each prescribed
step, identify the unfamiliar context that requires it; otherwise express the intended result.
Check matching and nonmatching situations for conditional rules, and remove duplicate obligations
or prohibitions that add no meaning.

For workflow changes, trace affected main and delegated paths, including writers or read-only agents
only when their contracts change.
For inheritance changes, check supported fresh-context and no-history forks. Look for duplicate
decisions, broken or circular pointers, and expanded authority. Source inspection does not prove
runtime reload or behavioral improvement.
