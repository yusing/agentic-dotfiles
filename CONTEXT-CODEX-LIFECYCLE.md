# Codex instruction lifecycle

1. **Bootstrap and static context.** `.codex/config.toml` selects
   `.codex/overridden_base_instructions.md` for model-level communication, turn and tool-use
   mechanics, and safety. It uses
   `.skills-mgr/skills/handoff/STANDARD.md`, the handoff standard, for checkpoint
   handoffs. The user-invoked `handoff` skill uses the same standard for document content while
   its `SKILL.md` owns the cutoff, `HANDOFF.md` destination, and path-only response. Codex loads
   `.codex/AGENTS.md` for durable workflow guidance and the root `AGENTS.md` for repository context
   routing. The routed context maps and skill bodies are loaded only when their triggers match.
   Codex also discovers `.codex/agents/*.toml`; each role description guides the parent spawn,
   and each role selects its paired complete model prompt before its first turn.
2. **Session start.** At startup and after context compaction or clearing,
   `.codex/hooks.json` runs `.codex/hooks/check_project` and the automatic
   skill-inventory reporter. Resuming an existing session does not run
   these root-session hooks. Matched events receive project context and current skill metadata
   without selecting implementation or validation work.
3. **Tool loop.** Before matched tools run, guards may reject generated-Go edits, versioned
   dependency additions, unapproved Git clones, or container commands from spawned agents. The
   remaining guards are silent when their policies do not apply.
4. **Compaction.** `.skills-mgr/skills/handoff/STANDARD.md` is caller-neutral: the runtime owns
   the compaction cutoff and delivery while the standard preserves incomplete obligations without
   copying completed hook responses and carries the exact names of applicable skills.
   After handoff, the base prompt rereads named skills or, when that section is absent, selects
   them again from the current operation. No hook-specific state rotation runs at compaction.

Registration and implementation stay separate throughout this flow: `.codex/hooks.json`
decides when a hook runs, the registered command or script owns its output and behavior, and
`.codex/AGENTS.md` owns whole-task invariants outside hook coverage.
