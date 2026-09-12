# Instruction authoring

Check the effective instructions at their consumers, not just the edited file.

For local wording, ownership, or progressive-disclosure audits, start with the supplied content
and its applicable owners. Consult product documentation when a conclusion depends on current
client or model behavior, not merely because the instructions mention Codex.

When changing model-specific prompting or assessing model behavior, read the applicable
[prompting guidance](https://developers.openai.com/api/docs/guides/latest-model#prompting-best-practices).
For Codex, use `openaiDeveloperDocs.fetch_openai_doc` with that page's URL; other agents open the
linked guide. A documentation refresh does not request a model migration, runtime configuration
change, or live behavior evaluation.

Focus on what to do, not how to do, unless you are refering to something the audience is
unfamiliar with.

## General design

- **Layers:** Give each rule one owner and use focused pointers from other layers instead of
  copying it. Where these layers exist, base/shared instructions own general behavior at their
  existing client scope; repository instructions own repository-specific guidance; task documents
  own task decisions and checks; skills own conditional methods and workflows; roles own
  specialties and execution boundaries. Do not add layers merely to match this list.
- **Audience:** Name the actor for ownership, delegation, and integration decisions. When task
  documents or implementation guidance are shared with subagents, preserve each assigned agent's
  role and scope; reading general guidance must not reopen assignment or authorize delegation.
- **Invocation:** Preserve a cheap direct path for simple work. Distinguish choosing delegation,
  assigning a delegate, and executing an existing assignment. Skipping coordination must not skip
  needed routing; assigned workers must not load task-selection routing merely because their work
  was delegated. They still read the coordination guidance required by their assignment.
  Check triggers for standalone documentation and mechanical work as well as code changes.
- **Renames:** Keep instruction artifact names, paths, and references aligned. Update registration,
  delivered metadata, tests, documentation, and distribution allowlists where present. For skills,
  also align the directory and frontmatter name. Refresh generated content from its owner;
  retain historical names in historical records.

## Conditional client and role checks

- **Role selection:** When the client provides native role definitions, keep role descriptions
  and selection triggers there, not duplicated in shared instructions or skills. Otherwise use
  the existing role owner. Shared guidance points to that owner; workflow documents own delegation
  gates and handoff requirements, not parallel role catalogs. Preserve explicit model and reasoning
  selection rules for fields intentionally omitted from role configuration; those are dispatch
  policy, not duplicated role descriptions. Where the agent tool exposes role descriptions, use
  that catalog for selection; the selected role's instructions govern its execution.
- **Client scope:** When instructions serve multiple clients, keep model budgets and client-specific
  dispatch mechanics in the applicable native configuration or explicitly scoped workflow sections,
  not unqualified shared guidance. Check generated consumers when changing their sources.

## Validation

Before completion, verify changed rules at their affected consumers. For wording-only changes,
check meaning, triggers, and owner pointers directly. For workflow changes, trace simple main-agent
work and delegated work where applicable; include assigned writers or read-only agents only when
their contracts are affected. For inheritance changes, check fresh-context subagents where supported,
including no-history forks where available. Check other clients
when they share the changed owner. Look for duplicate decisions, missing or circular pointers,
and accidental role or scope expansion. Source inspection does not prove runtime reload or
behavioral improvement.
