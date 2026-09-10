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

For delivery, inheritance, role composition, permissions, or refresh behavior, read
`CONTEXT-CODEX-LIFECYCLE.md`. For event coverage or static-versus-hook ownership, read
`CONTEXT-HOOK-ARCHITECTURE.md`; follow its owner pointers only for affected hooks.

- **Role selection:** Keep role descriptions and selection triggers in native role definitions,
  not in instructions or skills. Shared guidance directs agents to the available descriptions;
  workflow documents own delegation gates and handoff requirements, not parallel role catalogs.
  Preserve explicit model and reasoning selection rules for fields intentionally omitted from
  role configuration; those are dispatch policy, not duplicated role descriptions.
  The agent tool exposes available role names and descriptions before dispatch; the selected
  role's instructions govern its execution.
- **Audience:** Task documents and implementation guidance are also read by subagents. Name the
  actor for ownership, delegation, and integration decisions. Assigned agents keep their role and
  scope; reading general guidance must not reopen assignment or authorize further delegation.
- **Layers:** Base/shared instructions own general behavior at their existing harness scope;
  root AGENTS.md owns repository maintenance. Task documents own task decisions and checks;
  skills own conditional methods and workflows; roles own specialties and execution boundaries.
  Give each rule one owner and use focused pointers from other layers instead of copying it.
- **Harness scope:** Shared instruction files serve multiple clients. Keep model budgets and
  harness-specific dispatch mechanics in native configuration or explicitly scoped skill sections,
  not shared AGENTS.md. Check generated ports when changing their source roles.
- **Invocation:** Preserve a cheap direct path for simple work. Distinguish choosing delegation,
  assigning a delegate, and executing an existing assignment. Skipping coordination must not skip
  needed routing; assigned workers must not load task-selection routing merely because their work
  was delegated. They still read the coordination guidance required by their assignment.
  Check triggers for standalone documentation and mechanical work as well as code changes.
- **Renames:** Keep a skill's directory, frontmatter name, registration, callers, delivered
  metadata, tests, documentation, and projection allowlists aligned. Refresh generated content
  from its owner; retain historical names in historical records.

Before completion, verify changed rules at their affected consumers. For wording-only changes,
check meaning, triggers, and owner pointers directly. For workflow changes, trace simple main-agent
work and delegated work where applicable; include assigned writers or read-only agents only when
their contracts are affected. Check no-history forks for inheritance changes and other clients
when they share the changed owner. Look for duplicate decisions, missing or circular pointers,
and accidental role or scope expansion. Source inspection does not prove runtime reload or
behavioral improvement.
