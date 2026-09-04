# Instruction surfaces

This is the path index for static instruction files. The user manages every file
under `Paths`. That list does not describe their contents.

transitively through `.grok/AGENTS.md`. Codex, Grok, Claude Code, OMP, Pi, and
KiloCode therefore share one static instruction surface. Edit that file once; a
change reaches all six clients, and none of them owns a private copy.

## Paths

- `AGENTS.md`
- `.codex/AGENTS.md`
- `.codex/SMALL-TASK.md`
- `.codex/LARGE-TASK.md`
- `.codex/IMPLEMENTATION.md`
- `.codex/overridden_base_instructions.md`
- `.skills-mgr/skills/handoff/STANDARD.md`
- `.codex/agents/*.toml`
- `.codex/agents/*.instructions.md`
- `.codex/skills/.system/`
- `.grok/AGENTS.md` (symlink to `.codex/AGENTS.md`)
- `.claude/CLAUDE.md` (symlink to `.codex/AGENTS.md`)
- `.claude/agents/*.md`
- `.claude/rules/`
- `.agents/skills/`
- `.skills-mgr/skills/`
- `.agents/skills/handoff/STANDARD.md`
- `.agents/skills/handoff/SKILL.md`

## Reference dumps

- `.codex/base_instructions.md` is a captured prompt dump. Treat it as read-only
  evidence, not an instruction owner; do not edit it to change Codex behavior.
  To update: run `cat ~/.codex/models_cache.json | jq -r '.models.[0].model_messages.instructions_template'`
