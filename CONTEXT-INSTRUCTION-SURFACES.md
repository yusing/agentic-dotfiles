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
| Codex base instructions | Codex/Mekugi uses the selected model's built-in base instructions; `.codex/config.toml` does not set `model_instructions_file`. Claude does not consume them. |
| Client standing guidance | The harness loads `.codex/AGENTS.md` or `.claude/CLAUDE.md` for main and custom subagents, independently of conversation-history inheritance. Claude's documented built-in Explore/Plan exception is described in its delegation and instruction-authoring guidance. |
| Repository guidance | Root `AGENTS.md` and its `CLAUDE.md` symlink route home-configuration maintenance, not independent projects below home. Discovery scope depends on the client; see `CONTEXT-CODEX-LIFECYCLE.md` and Claude's instruction-authoring guidance. Claude would load both files as ancestors in every project below home, and a `CLAUDE.md` above a project suppresses that project's `AGENTS.md`, so `claudeMdExcludes` in `.claude/settings.json` skips them and `.claude/CLAUDE.md` tells sessions maintaining the home repository to read `AGENTS.md` on demand. Claude also loads a subdirectory's `AGENTS.md` when it reads a file there, so the same setting lists the other clients' instruction files under home, which would otherwise put their standing guidance into a Claude session, and the `.claude/CLAUDE.md` copy inside a home worktree, which would load beside the user-level file. |
| Task documents | Session-start hooks deliver `MAIN.md` to main and `SUBAGENT.md` to subagents in Codex and Claude; the client standing files carry no routing line for them. Any agent, including a subagent coordinating children, reads `DELEGATION.md` before delegation or coordination; Claude reads its adapted copy. Mekugi agents of either provider read `.codex/MODEL-ROUTING.md`; Claude Code native dispatch reads `.claude/instructions/MODEL-ROUTING.md`. Any applicable role reads `DOCS.md`, `IMPLEMENTATION.md`, or `TESTING.md` when its operation triggers them; `REFACTOR.md` is nested under the `IMPLEMENTATION.md` trigger and loads only with it. `FINISHING.md` supplies question-specific review orchestration for main or an assigned coordinator. Catalog descriptions own skill applicability; construction and completion reuse their existing evidence without a separate finishing load. Native roles own review methods; documentation-only reviewers use their document guidance. Other document triggers remain in the client standing file. |
| Native roles and skills | Role configuration supplies the selected role; skill metadata selects an on-demand body. Neither a catalog entry nor a parent's tool read establishes that a child has the body. |

Instruction-authoring guidance owns changes to these layers. The maps describe maintained owners,
generated consumers, and reference evidence; they are not an additional set of workflow rules.

## Paths

- `AGENTS.md`
- `CLAUDE.md` (symlink to root `AGENTS.md`, not to `.claude/CLAUDE.md`)
- `CONTEXT-*.md`
- `.codex/config.toml` (compaction prompt and client settings)
- `.codex/AGENTS.md`
- `.codex/GITHUB.md` (client-neutral; `.claude/instructions/GITHUB.md` symlinks to it)
- `.codex/FRONTEND.md` (client-neutral; `.claude/instructions/FRONTEND.md` symlinks to it)
- `.codex/MAIN.md` (client-neutral; `.claude/instructions/MAIN.md` symlinks to it)
- `.codex/DELEGATION.md`
- `.codex/MODEL-ROUTING.md`
- `.codex/SUBAGENT.md`
- `.codex/IMPLEMENTATION.md` (client-neutral; `.claude/instructions/IMPLEMENTATION.md` symlinks to it)
- `.codex/REFACTOR.md` (client-neutral; `.claude/instructions/REFACTOR.md` symlinks to it)
- `.codex/TASK-FILE.md` (client-neutral; `.claude/instructions/TASK-FILE.md` symlinks to it)
- `.codex/FINISHING.md` (client-neutral; `.claude/instructions/FINISHING.md` symlinks to it)
- `.codex/TESTING.md` (client-neutral; `.claude/instructions/TESTING.md` symlinks to it)
- `.codex/DOCS.md` (client-neutral; `.claude/instructions/DOCS.md` symlinks to it)
- `.codex/INSTRUCTION-AUTHORING.md`
- `.codex/SKILL-AUTHORING.md`
- `.skills-mgr/.skills-mgr.json` (managed skill registry)
- `.skills-mgr/skills/*/SKILL.md` and their resource files
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
Registry metadata identifies each maintained body and its activation. Skill authoring can read that
owner directly without searching other stores. `.codex/config.toml` owns runtime compaction-prompt
selection; an available resource alone does not establish that the runtime selects it.

Managed-skill update automation lives in `.local/lib/skills-maintenance/skills-maintenance.ts`;
its per-skill update prompts live in the adjacent `repair-prompt.ts`. These are additional
consumers when removing or replacing a managed skill, alongside selection and placeholders.
Remove a retired skill's dedicated updater and prompt with its owner, while retaining historical
maintenance records.

### Antigravity and Devin

Antigravity loads its own standing guidance from `.gemini/AGENTS.md`. It routes
only the main agent to `.gemini/MAIN.md`, a symlink to the shared main guidance.
The generator embeds `.gemini/SUBAGENT.md` in the named subagent prompts, not
in the standing instructions or session hook. Delegation guidance lives in
`.gemini/DELEGATION.md` and uses the native invocation contract. CLI preferences
live in `.gemini/antigravity-cli/settings.json`; provider and permission settings
remain client-specific.

Generate the Antigravity roles with
`.local/bin/sync-agent-ports agy`; append `--check` to detect
drift. The generator adapts the native role bodies and tool lists for
Antigravity. The roles cannot delegate through native tools, and the brief-only
council role has no terminal tool. Claude's per-role shell guard does not port:
the remaining shell boundary is expressed in the role prompt. Antigravity's
global discovery folder can also be read by the Antigravity App.

Devin CLI loads its standing guidance from `.config/devin/AGENTS.md` and
disables Claude/Codex/Cursor/Windsurf/Copilot/Kiro/OpenCode/Zed config imports
in `.config/devin/config.json` while keeping standard project `AGENTS.md`
discovery enabled. `SessionStart` and `PostCompaction` hooks deliver
`.config/devin/MAIN.md` (a symlink to `.codex/MAIN.md`), project facts, and
the `skills-mgr` inventory; `.config/devin/DELEGATION.md` owns Devin
subagent delegation guidance. Generate the Devin custom subagent profiles in
`.config/devin/agents/*.md` with `.local/bin/sync-agent-ports devin` (append
`--check` to detect drift). The generator embeds `.config/devin/SUBAGENT.md`
in each role body (Devin CLI has no `SubagentStart` hook), sets native
`allowed-tools` without edit/subagent/skill tools, pins matched multi-provider
`model:` values per role so `run_subagent` does not fall back to the default
subagent router, and leaves the shell command boundary in the role prompt.


## Generated and imported surfaces

- `.claude/agents/*.md` is generated from `.codex/agents/*.toml` by
  `.local/bin/sync-agent-ports claude`; Grok also consumes these generated roles.
  `CONTEXT-CLAUDE-AGENT-PORT.md` owns the port map and drift check.
- `.config/kilo/agent/*.md` is generated from `.codex/agents/*.toml` by
  `.local/bin/sync-agent-ports kilo`; `CONTEXT-KILO-AGENT-PORT.md` owns the
  port map and drift check.
- `.codex/skills/.system/` is imported Codex system content, excluded from the repository.
  Keep local overrides at their managed owner; imported files remain upstream-owned.
- Hook-delivered instructions are mapped in `CONTEXT-HOOK-ARCHITECTURE.md` and
  `CONTEXT-HOOK-OWNERS.md`; this static index does not establish hook coverage.
