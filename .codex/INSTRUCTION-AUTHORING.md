# Instruction authoring

Check the effective instructions at their consumers, not just the edited file.

Start with supplied content and its owners. Consult product documentation when a conclusion depends
on current client or model behavior, not merely because the instructions mention Codex.

When changing model-specific prompting or assessing model behavior, read the applicable
[prompting guidance](https://developers.openai.com/api/docs/guides/latest-model#prompting-best-practices).
Use official documentation available through the current tools. A documentation refresh does not
request a model migration, runtime configuration change, or live behavior evaluation.

Describe outcomes and constraints rather than fixed itineraries. Keep only useful local facts,
preferences, and boundaries. Use short, operation-specific skill descriptions and conditional
document pointers; remove generic coaching and repetition.

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
