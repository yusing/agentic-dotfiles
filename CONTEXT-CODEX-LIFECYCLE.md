# Codex instruction lifecycle

1. **Bootstrap and static context.** `.codex/config.toml` selects
   `.codex/overridden_base_instructions.md` for model-level communication, turn and tool-use
   mechanics, and safety. It uses
   `.skills-mgr/skills/handoff/STANDARD.md`, the handoff standard, for checkpoint
   handoffs. The user-invoked `handoff` skill uses the same standard for document content while
   its `SKILL.md` owns the cutoff, `HANDOFF.md` destination, and path-only response. Codex loads
   `.codex/AGENTS.md` for durable workflow guidance and the root `AGENTS.md` for repository context
   routing. The routed context maps and skill bodies are loaded only when their triggers match.
   Codex also discovers `.codex/agents/*.toml`; each role description guides role selection,
   while the spawning client or tool owns invocation mechanics. The assembly, inheritance,
   and cache boundaries are detailed below.
   Role files do not use `model_instructions_file`. Active hooks are assembled from
   `.codex/hooks.json`, any inline hook configuration, and manifests for enabled plugins.
2. **Session start.** At startup and after context compaction or clearing,
   `.codex/hooks.json` runs `.codex/hooks/bin/check_project` and `skills-mgr list`.
   Resuming an existing session does not run these root-session hooks.
   The project and inventory commands run through `.codex/hooks/bin/session_start_context`.
   Thread-spawn startup runs SubagentStart instead of root SessionStart and delivers inventory
   through the same wrapper. `CONTEXT-HOOK-OWNERS.md` owns the fork and retained-context
   suppression rules. Hook refresh is separate from the cached static `AGENTS.md` discovery.
   Matched events receive project context and current skill metadata without
   selecting implementation or validation work.
3. **Tool loop.** Before matched tools run, guards may reject generated-Go edits or container
   mutations and unclassified commands from spawned agents. Recognized read-only container
   inspection remains available. The registrations and supported command forms bound
   this coverage.
   Guards are silent when their policies do not apply.
4. **Turn end.** All matching hooks from active configuration sources run for their lifecycle
   event. The enabled Browser plugin currently contributes a `Stop` MCP hook independently of
   `.codex/hooks.json`.
5. **Compaction.** `.skills-mgr/skills/handoff/STANDARD.md` is caller-neutral: the runtime owns
   the compaction cutoff and delivery while the standard preserves unfinished obligations,
   needed owner references, and the exact names of still-applicable skills.
   When compaction interrupts an undelivered file handoff, runtime delivery supersedes the file
   destination and resumes the task from before the file-handoff invocation.
   After handoff, the base prompt rereads named skills or, when that section is absent, selects
   them again from the current operation. The reloaded shared instructions recover the active
   scope and reread only the guidance needed for remaining work. Routine local work does not
   require task-size documents; substantive changes and reviews use the implementation guidance.
   No hook-specific state rotation runs at compaction.

Registration and implementation stay separate throughout this flow: each active configuration
source decides when its hook runs, the registered command, script, or MCP tool owns its output
and behavior, and `.codex/AGENTS.md` owns whole-task invariants outside hook coverage.

## Assembly and verification

Use `projects/codex` for Codex source evidence when that checkout is available. Distinguish it
from the running client and report any source-verification gap. For discovery behavior, compare
the local implementation with the official
[AGENTS.md guide](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

- **Inheritance:** Codex children inherit base and host/user instruction context independently of
  conversation history; project AGENTS.md is discovered for the child's environment and cwd.
  `fork_turns="none"` is not policy isolation. Give no-history agents a self-contained task brief.
  Forks can filter tool results and rebuild developer context; carry required evidence explicitly
  rather than assuming a complete transcript survives.
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
  shared byte limit. Codex-home guidance tries AGENTS.override.md before AGENTS.md; project
  discovery tries those names before configured fallbacks in each directory. The source's
  project-doc manager reuses cached documents while environment selection and trust stay unchanged;
  editing a file alone does not prove a live session has reloaded it. Check a fresh session or
  actual delivered context when reload behavior matters.
- **Skills and hooks:** Skill catalogs expose metadata, not the selected body. Native catalog
  guidance, hook-injected inventories, and skill bodies are separate instruction surfaces.
  Check the client's parser and effective settings; similarly named frontmatter fields are not
  portable. Codex runtime adds hook context to developer-role history without deduplicating it;
  a local hook may suppress proven duplicates.
  Thread-spawn startup dispatches SubagentStart rather than SessionStart; history forks can carry
  prior hook context alongside fresh injection. Verify startup, subagent, and compaction delivery
  before removing or duplicating instructions.

For Codex source checks, start under `projects/codex/codex-rs/`: `core/src/agent/role.rs`
owns role overrides, `core/src/agent/control/spawn.rs` owns child assembly, and
`core/src/thread_manager.rs` owns parent user-instruction inheritance.
`codex-home/src/instructions/mod.rs` owns global instruction lookup, and
`core/src/agents_md.rs` plus `core/src/agents_md_manager.rs` own project discovery and caching.
`core/src/hook_runtime.rs` owns hook-context delivery. These paths are evidence, not proof
that the installed client matches the checkout.
