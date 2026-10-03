# Skill authoring

Use this document for skill-specific design. Instruction ownership and consumer checks remain in
`INSTRUCTION-AUTHORING.md`.

## Selection and loading

- Give a skill a narrow, useful workflow or application purpose. Its description should identify
  the operation that needs it, not every adjacent topic. Long descriptions consume catalog space
  and may be shortened by the client, obscuring selection cues.
- Keep the description short enough to distinguish the skill from its neighbors. For example,
  trigger a migration skill on creating or reviewing migrations, not all database work.
- For multiple workflows, make the root document a small router to references and scripts. State
  when each reference matters so the agent loads only what the current operation needs.
- Choose model invocation only when the agent or another skill must reach the skill; its
  description stays in every context. A user-invoked skill (`disable-model-invocation: true`)
  costs no context, but only a person typing its name reaches it, so no skill can depend on it.
  Reference that several user-invoked skills share belongs in a plain file they point to.

## Content and boundaries

- Read and edit the owning skill file directly. Describe the outcome, required inputs, constraints,
  and useful resources clearly and concisely.
- Include exact procedures where tools or domain constraints require them. Avoid elaborate recipes
  for choices the model can resolve from context, and remove generic coaching.
- Separate mandatory constraints from adaptable defaults. Do not turn routine guidance into an
  approval gate, early stopping point, or requirement to do unrelated work.
- Keep task-specific completion criteria and authorization with their existing owners. A skill
  should not silently broaden the task or narrow permission already granted by applicable guidance.
- Account for every supported model and client consuming the skill; remove obsolete scaffolding
  without assuming that all consumers have identical capabilities.

## Validation

Check descriptions against matching and adjacent nonmatching tasks, including overlap with other
skills. Trace reference loading for each changed route and verify that required resources resolve.
Check that the skill supports completion without redundant reading, testing, or permission requests.
Resolve each mandatory skill dependency and reference through its actual served owner, including
remote patches and native/plugin fallbacks. Missing bodies and frontmatter-only placeholders are
resource-health failures, not successful resolution. Run the mapped skill-resource check during
skill maintenance; ordinary skill reads do not need a refresh or a background health daemon.
