# Grok hook port

`.grok/hooks/codex-port.json` explicitly registers the Codex hook set for Grok because
Grok's `compat.codex.hooks` cell is reserved and inert. `.grok/config.toml` sets
`[compat.claude] hooks = false` so Grok does not also load `~/.claude/settings.json`
hooks. `.grok/hooks/bin/adapt_codex_hook` owns envelope, event-name, field-name,
client-identity, and decision adaptation. TypeScript Codex policy runs in-process;
policy remains in the reused `.codex/hooks/` implementation. `.grok/hooks/codex-port.json` owns Grok tool
matchers and event placement, extending the Claude matchers (`Bash`, `Edit`, `Write`) with
`run_terminal_command`, `search_replace`, and `MultiEdit`. The Bash PreToolUse group
runs `subagent_exec_guard` in-process. Grok uses camelCase event fields
and `{"decision":"deny","reason":...}` denials. The adapter maps failed result events. Herdr
session reporting remains
client-managed and is not part of the port.


SessionStart project report and skill inventory are not ported: Grok does
not attach that event output to the model.

Port coverage is limited to what a registered hook owns. Deletion policy has no registered
hook, so no event-scoped owner exists to carry it. Grok receives general authorization and
user-work preservation guidance from the shared `.codex/AGENTS.md` surface, which does not
contain the detailed destructive-action procedure. That procedure in
`.codex/overridden_base_instructions.md` stays Codex-only, because that file is Codex's
`model_instructions_file` and the port supplies no equivalent. That remaining gap is
accepted. Closing it requires a separately authorized instruction or enforcement change;
registering a deletion guard would add a new hook rather than port an existing one.

`.codex/hooks/bin/subagent_exec_guard` is registered and ported, but it acts only on the
running agent's own `agent_type`, which Codex populates from the spawned thread's role.
Grok's `subagentType` names the agent a spawn tool call is about to create, not the caller,
so the adapter must not alias it: doing so would deny a root turn that merely spawns an
implementer. Under the port the guard therefore fails open. This gap is accepted, because
closing it needs a caller-identity field from the client, not an adapter change.

Native Grok-only hooks (not Codex ports) also live under `.grok/hooks/`.
`.grok/hooks/bin/skills_path_guard` (registered by `.grok/hooks/skills-path-guard.json`)
owns PreToolUse denial of search and listing against `/home/$USER/*/skills`,
and of broad searches rooted at the home directory. A missing dedicated-search
path uses the event cwd, so a home-directory workspace is still a broad root.
Relative search and list roots resolve against that cwd.
Agent-client directories such as `.codex` are not broad roots; a `skills`
child still matches `/home/$USER/*/skills`. A named skill file may be read
or edited directly. Listing and fetching unknown skills still belong to
`skills-mgr`.
`.grok/AGENTS.md` owns the Grok-only extra instruction: at root-session start and
after compaction the agent runs `$HOME/.codex/hooks/bin/check_project --without-git`
and `skills-mgr list`. It has no separate subagent-start instruction, and the Grok port
does not register `SubagentStart`; this port does not establish inventory delivery to children.
That file `@`-references `.codex/AGENTS.md` for shared standing guidance. Do not
copy the shared file into the Grok extra file. Codex registers direct inventory through
`session_start_context`; Claude registers `.codex/hooks/bin/skills_mgr_inventory`.
Both use `.codex/hooks/bin/check_project` for project reporting.

When an instruction changes, edit only its owner. Supporting the same policy in
multiple clients means sharing or porting the owner, not copying its text into
each client's static instructions. Shared standing guidance lives in
`.codex/AGENTS.md`. A Grok-only static rule belongs in `.grok/AGENTS.md`.
