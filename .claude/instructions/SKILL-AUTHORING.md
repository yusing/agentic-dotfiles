# Skill authoring

Use this document for skill-specific design. Instruction ownership, Claude prompt style, and
consumer checks remain in `INSTRUCTION-AUTHORING.md`.

## Selection and loading

- Give a skill a narrow, useful workflow or application purpose. Its description identifies the
  operation that needs it, not every adjacent topic, because a model-invoked skill's description
  sits in every context and clients may truncate long ones, hiding the selection cues.
- Write the description in third person and say both what the skill does and when to use it
  ([descriptions][sk-desc]), short enough to distinguish it from its neighbors. For example,
  trigger a migration skill on creating or reviewing migrations, not on all database work.
- For multiple workflows, make `SKILL.md` a small router to references and scripts, with references
  one level deep from it, because Claude may only preview files reached through a chain of
  references ([nested references][sk-nested]). State when each reference matters so the agent loads
  only what the current operation needs.
- Choose model invocation only when the agent or another skill must reach the skill. A user-invoked
  skill (`disable-model-invocation: true`) costs no context, but only a person typing its name
  reaches it, so no skill can depend on it. Put reference that several user-invoked skills share in
  a plain file they point to.

## Content and boundaries

- Read and edit the owning skill file directly. Describe the outcome, required inputs, constraints,
  and useful resources concisely; once loaded, every token of the body competes with the rest of the
  context ([concise is key][sk-concise]).
- Include exact procedures where tools or domain constraints require them. Leave choices the model
  can resolve from context to the model, and remove generic coaching.
- Separate mandatory constraints from adaptable defaults. Routine guidance must not become an
  approval gate, an early stopping point, or a requirement to do unrelated work.
- Keep task-specific completion criteria and authorization with their existing owners. A skill must
  not silently broaden the task or narrow permission that applicable guidance already grants.
- Account for every supported model and client that consumes the skill; skills here are served to
  Codex, Grok, and others as well as Claude. Remove obsolete scaffolding without assuming identical
  capabilities across them.

## Validation

Check descriptions against matching and adjacent nonmatching tasks, including overlap with other
skills. Trace reference loading for each changed route and verify that required resources resolve.
Check that the skill supports completion without redundant reading, testing, or permission prompts.
Resolve each mandatory skill dependency and reference through its actual served owner, including
remote patches and native or plugin fallbacks. Missing bodies and frontmatter-only placeholders are
resource-health failures, not successful resolution. Run the mapped skill-resource check during
skill maintenance; ordinary skill reads need no refresh or background health daemon.

[sk-desc]: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#writing-effective-descriptions
[sk-nested]: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#avoid-deeply-nested-references
[sk-concise]: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#concise-is-key
