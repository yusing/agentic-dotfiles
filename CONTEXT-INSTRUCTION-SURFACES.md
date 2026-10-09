# Instruction surfaces

This is the path index for static instruction files. The user manages every file
under `Paths`. That list does not describe their contents. Configuration selects
the active surfaces; installed copies and reference dumps are not interchangeable owners.

`.grok/AGENTS.md` is a standalone client instruction file that owns Grok's client-specific
additions. Grok receives shared standing guidance through `.grok/rules/AGENTS.md`, a symlink to
`.codex/AGENTS.md`, because Grok does not expand `@` imports. `[compat.claude] agents = false` and
`rules = false` keep Grok from also loading `.claude/CLAUDE.md` and `.claude/rules/`; Grok still
loads the `.claude/agents/` roles.
`.claude/CLAUDE.md` owns Claude's standing guidance directly, and `.claude/instructions/`
holds Claude-specialized task documents. Both adapt the matching `.codex/` owners: they omit
Codex specifics and rules Claude Code's own system prompt covers, resolve conflicts in Claude
Code's favor, and follow Anthropic's prompting guidance. A change to a shared rule in a
`.codex/` owner needs a matching review of its Claude counterpart.

## Paths

- `AGENTS.md`
- `CONTEXT-*.md`
- `.codex/config.toml` (base prompt, compaction prompt, and client settings)
- `.codex/AGENTS.md`
- `.codex/GITHUB.md`
- `.codex/MAIN.md`
- `.codex/REVIEW.md`
- `.codex/SUBAGENT.md`
- `.codex/IMPLEMENTATION.md`
- `.codex/TESTING.md`
- `.codex/DOCS.md`
- `.codex/INSTRUCTION-AUTHORING.md`
- `.codex/SKILL-AUTHORING.md`
- `.codex/overridden_base_instructions.md`
- `.skills-mgr/.skills-mgr.json` (managed skill registry)
- `.skills-mgr/skills/handoff/SKILL.md`
- `.skills-mgr/skills/handoff/STANDARD.md`
- `.codex/agents/*.toml`
- `.grok/AGENTS.md` (standalone Grok additions)
- `.grok/rules/AGENTS.md` (symlink to `.codex/AGENTS.md`)
- `.claude/CLAUDE.md` (standalone; Claude adaptation of `.codex/AGENTS.md`)
- `.claude/instructions/*.md` (Claude adaptations of the `.codex/` task documents)
- `.codex/skills/` (user-maintained content only)
- `.skills-mgr/skills/`

For a managed skill, check `.skills-mgr/.skills-mgr.json` for its activation rule and edit
`.skills-mgr/skills/<name>/SKILL.md`, not a client-local installed copy or placeholder.
For a remote-managed skill, that registry's remote reference identifies its record under
`.cache/skills-mgr/remote-skills/entries/`. The record locates the fetched body; local edits are
owned by `.skills-mgr/skills/.remote-patches/<reference-key>.patch` and applied by skills-mgr.
Do not edit the fetched cache or generated placeholders. Verify the layered body through get.
Uninstall a remote skill with the selection interface's `u` action (`skills-mgr -g` for a global
entry). It removes the registry entry, remote patch, cached record and override, and placeholders;
removing only the registry entry leaves the cached skill discoverable through get.
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
  OpenAI Docs is served from `.codex/skills/.system/openai-docs/SKILL.md`; do not treat it as
  a missing managed skill or edit the imported copy to change its upstream policy.
- Context7's served plugin body is under
  `.codex/plugins/cache/context7-marketplace/context7/<version>/skills/context7-mcp/SKILL.md`.
  Plugin cache files are imported consumers, not maintained prompt owners.
- Hook-delivered instructions are mapped in `CONTEXT-HOOK-ARCHITECTURE.md` and
  `CONTEXT-HOOK-OWNERS.md`; this static index does not establish hook coverage.
