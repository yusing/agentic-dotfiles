# Instruction authoring

Check the effective instructions at their consumers, not just the edited file.

For instruction authoring and audits, read the applicable prompting guidance in
[OpenAI's latest-model guide](https://developers.openai.com/api/docs/guides/latest-model).

For codex, use `openaiDeveloperDocs.fetch_openai_doc({"url":"URL_ABOVE"})`.

Use `projects/codex` for Codex source evidence when that checkout is available. Distinguish it
from the running client and report any source-verification gap.

- **Inheritance:** Codex children inherit base and host/user instruction context independently of
  conversation history; project AGENTS.md is discovered for the child's environment and cwd.
  `fork_turns="none"` is not policy isolation. Give no-history agents a self-contained task brief.
  Forks can filter tool results and rebuild developer context; carry required evidence explicitly
  rather than assuming a complete transcript survives.
- **Role selection:** Keep role descriptions and selection triggers in native role definitions,
  not in instructions or skills. Shared guidance directs agents to the available descriptions;
  workflow documents own delegation gates and handoff requirements, not parallel role catalogs.
  Preserve explicit model and reasoning selection rules for fields intentionally omitted from
  role configuration; those are dispatch policy, not duplicated role descriptions.
  The agent tool exposes available role names and descriptions before dispatch; the selected
  role's instructions govern its execution.
- **Tool contract:** Available roles, model overrides, history controls, and nesting limits come
  from the active client and tool schema. Fixed role settings remain authoritative; a source
  checkout alone does not establish which capabilities the running client exposes.
- **Composition:** A Codex role's `developer_instructions` replaces the configured developer
  instruction slot; it does not append to that slot. Base instructions, AGENTS.md, and runtime-generated
  context are separate inputs. Trace their assembly before treating inherited text as redundant.
- **Permissions:** A read-only role description is an instruction, not proof of a runtime sandbox.
  Distinguish role behavior, inherited runtime permissions, and hook enforcement; verify the
  effective boundary before documenting a restriction as enforced.
- **Discovery and refresh:** Codex project guidance depends on trust, root markers, cwd, and a
  shared byte limit. In each directory, AGENTS.override.md precedes AGENTS.md and configured fallbacks.
  Discovery is cached; editing a file alone does not prove a live session has reloaded it.
- **Skills and hooks:** Skill catalogs expose metadata, not the selected body. Native catalog
  guidance, hook-injected inventories, and skill bodies are separate instruction surfaces.
  Check the client's parser and effective settings; similarly named frontmatter fields are not
  portable. Codex runtime adds hook context to developer-role history without deduplicating it;
  a local hook may suppress proven duplicates.
  Thread-spawn startup dispatches SubagentStart rather than SessionStart; history forks can carry
  prior hook context alongside fresh injection. Verify startup, subagent, and compaction delivery
  before removing or duplicating instructions.
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
  needed routing; assigned workers must not load routing merely because their work was delegated.
  Check triggers for standalone documentation and mechanical work as well as code changes.
- **Renames:** Keep a skill's directory, frontmatter name, registration, callers, delivered
  metadata, tests, documentation, and projection allowlists aligned. Refresh generated content
  from its owner; retain historical names in historical records.

Before completion, trace the changed guidance for main doing simple work, main delegating,
an assigned writer or read-only agent, a no-history fork, and affected non-Codex clients. Check
for conflicting actors, duplicate decisions, missing or circular pointers, and accidental role
or scope expansion. Syntax and wording assertions alone do not establish correct routing.
