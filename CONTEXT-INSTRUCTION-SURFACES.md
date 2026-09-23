# Instruction surfaces

This is the path index for static instruction files. The user manages every file
under `Paths`. That list does not describe their contents. Configuration selects
the active surfaces; installed copies and reference dumps are not interchangeable owners.

`.claude/CLAUDE.md` is a symlink to `.codex/AGENTS.md`, so Codex and Claude Code
share one static instruction surface. Edit that owner once. `.grok/AGENTS.md` is
a Grok-only extra instruction file that `@`-references `.codex/AGENTS.md` for the
shared standing guidance.

## Paths

- `AGENTS.md`
- `CONTEXT-*.md`
- `.codex/config.toml` (base prompt, compaction prompt, and client settings)
- `.codex/AGENTS.md`
- `.codex/GITHUB.md`
- `.codex/MAIN.md`
- `.codex/SUBAGENT.md`
- `.codex/IMPLEMENTATION.md`
- `.codex/INSTRUCTION-AUTHORING.md`
- `.codex/SKILL-AUTHORING.md`
- `.codex/overridden_base_instructions.md`
- `.skills-mgr/.skills-mgr.json` (managed skill registry)
- `.skills-mgr/skills/handoff/SKILL.md`
- `.skills-mgr/skills/handoff/STANDARD.md`
- `.codex/agents/*.toml`
- `.grok/AGENTS.md` (Grok-only extra instruction; `@` references `.codex/AGENTS.md`)
- `.claude/CLAUDE.md` (symlink to `.codex/AGENTS.md`)
- `.codex/skills/` (user-maintained content only)
- `.skills-mgr/skills/`

For a managed skill, check `.skills-mgr/.skills-mgr.json` for its activation rule and edit
`.skills-mgr/skills/<name>/SKILL.md`, not a client-local installed copy or placeholder.
For example, `golang-best-practices` is owned by
`.skills-mgr/skills/golang-best-practices/SKILL.md`; its `lang go` activation can make
`skills-mgr get` report it disabled from this home-directory repository. Skill authoring
can read that owning file directly without searching other skill stores. The configured
compaction prompt likewise points to the managed handoff standard, not a client-local copy.


## Generated and imported surfaces

- `.claude/agents/*.md` is generated from `.codex/agents/*.toml` by
  `.local/bin/sync-claude-agent-ports`; Grok also consumes these generated roles.
  `CONTEXT-CLAUDE-AGENT-PORT.md` owns the port map and drift check.
- `.config/kilo/agent/*.md` is generated from `.codex/agents/*.toml` by
  `.local/bin/sync-kilo-agent-ports`; `CONTEXT-KILO-AGENT-PORT.md` owns the
  port map and drift check.
- `.codex/skills/.system/` is imported Codex system content, excluded from the repository.
- Hook-delivered instructions are mapped in `CONTEXT-HOOK-ARCHITECTURE.md` and
  `CONTEXT-HOOK-OWNERS.md`; this static index does not establish hook coverage.
