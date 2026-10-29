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
Codex specifics, resolve client conflicts in Claude Code's favor, and follow Anthropic's prompting
guidance. Assess redundancy from the instructions actually delivered to each consumer, rather than
assuming the main agent's system prompt also reaches its subagents. A change to a shared rule in a
`.codex/` owner needs a matching review of its Claude counterpart.

## Layers and loading

| Layer | Delivery and readers |
| --- | --- |
| Codex base override | Selected by `.codex/config.toml`; replacement and priority are defined in `CONTEXT-CODEX-LIFECYCLE.md`. Claude does not consume it. |
| Client standing guidance | The harness loads `.codex/AGENTS.md` or `.claude/CLAUDE.md` for main and custom subagents, independently of conversation-history inheritance. Claude's documented built-in Explore/Plan exception is described in its standing guidance. |
| Repository guidance | Root `AGENTS.md` and its `CLAUDE.md` symlink route home-configuration maintenance, not independent projects below home. Discovery scope depends on the client; see `CONTEXT-CODEX-LIFECYCLE.md` and Claude's instruction-authoring guidance. Claude would load both files as ancestors in every project below home, and a `CLAUDE.md` above a project suppresses that project's `AGENTS.md`, so `claudeMdExcludes` in `.claude/settings.json` skips them and `.claude/CLAUDE.md` tells home-directory sessions to read `AGENTS.md` on demand. |
| Task documents | Main reads `MAIN.md`; subagents read `SUBAGENT.md`. Any agent, including a subagent coordinating children, reads `DELEGATION.md` before delegation or coordination; Claude reads its adapted copy. Any applicable role reads `DOCS.md`, `IMPLEMENTATION.md`, or `TESTING.md` when its operation triggers them. `FINISHING.md` supplies deferred practices for implementation delivery/handback and explicit quality review, with a delivery and review orchestration section that main applies and delegates apply only when assigned review dispatch. Other document triggers remain in the client standing file. |
| Native roles and skills | Role configuration supplies the selected role; skill metadata selects an on-demand body. Neither a catalog entry nor a parent's tool read establishes that a child has the body. |

Instruction-authoring guidance owns changes to these layers. The maps describe maintained owners,
generated consumers, and reference evidence; they are not an additional set of workflow rules.

## Paths

- `AGENTS.md`
- `CLAUDE.md` (symlink to root `AGENTS.md`, not to `.claude/CLAUDE.md`)
- `CONTEXT-*.md`
- `.codex/config.toml` (base prompt, compaction prompt, and client settings)
- `.codex/AGENTS.md`
- `.codex/GITHUB.md`
- `.codex/FRONTEND.md` (client-neutral; `.claude/instructions/FRONTEND.md` symlinks to it)
- `.codex/MAIN.md`
- `.codex/DELEGATION.md`
- `.codex/MODEL-ROUTING.md`
- `.codex/SUBAGENT.md`
- `.codex/IMPLEMENTATION.md`
- `.codex/FINISHING.md`
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
can read that owning file directly without searching other skill stores. `.codex/config.toml`
also owns runtime compaction-prompt selection; the file-handoff route alone does not establish
that the runtime selects the managed handoff standard.


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
