# Grok hook port

`.grok/hooks/codex-port.json` explicitly registers the Codex hook set for Grok because
Grok's `compat.codex.hooks` cell is reserved and inert. `.grok/hooks/adapt_codex_hook.py`
owns only envelope, event-name, field-name, client-identity, and decision adaptation, plus
interpreter selection for a hook script that carries no executable bit; policy remains in
the reused `.codex/hooks/` implementation. `.grok/hooks/codex-port.json` owns Grok tool
matchers and event placement, extending the Claude matchers (`Bash`, `Edit`, `Write`) with
`run_terminal_command`, `search_replace`, and `MultiEdit`. Grok uses camelCase event fields
and `{"decision":"deny","reason":...}` denials. The adapter preserves prompt turn IDs for
later tool events and maps failed result events. Herdr session reporting remains
client-managed and is not part of the port.

`.grok/hooks/smoke_test.py` asserts that every registered Codex hook has a port counterpart,
that each ported script starts, and that Grok-specific tool matchers remain covered. Add
Codex and port registrations together, or that test fails.

Port coverage is limited to what a registered hook owns. Deletion policy has no registered
hook, so no event-scoped owner exists to carry it. Grok receives the destructive-action rule
from the shared `.codex/AGENTS.md` surface. The fuller destructive-action guidance in
`.codex/overridden_base_instructions.md` stays Codex-only, because that file is Codex's
`model_instructions_file` and the port supplies no equivalent. That remaining gap is
accepted. Closing it would mean registering a deletion guard, which is a new hook, not a
port change.

`.codex/hooks/subagent_exec_guard.py` is registered and ported, but it acts only on the
running agent's own `agent_type`, which Codex populates from the spawned thread's role.
Grok's `subagentType` names the agent a spawn tool call is about to create, not the caller,
so the adapter must not alias it: doing so would deny a root turn that merely spawns an
implementer. Under the port the guard therefore fails open. This gap is accepted, because
closing it needs a caller-identity field from the client, not an adapter change.

Native Grok-only hooks (not Codex ports) also live under `.grok/hooks/`.
`.grok/hooks/skills_path_guard.py` (registered by `.grok/hooks/skills-path-guard.json`)
owns PreToolUse denial of search and listing against `/home/$USER/*/skills`,
and of broad searches rooted at the home directory or an agent-client
directory. A named skill file may be read directly. Listing and fetching
unknown skills still belong to `skills-mgr`.
`.grok/hooks/skills_mgr_inventory.py` (registered by `.grok/hooks/codex-port.json`)
owns the `--- skills-mgr injected ---` heading on the SessionStart and
PostCompact inventory so that list is not mistaken for Grok's visible
skills.

When an instruction changes, edit only its owner. Supporting the same policy in multiple
clients means sharing or porting the owner, not copying its text into each client's static
instructions. `.grok/AGENTS.md` is that sharing for static instructions: it is a symlink to
`.codex/AGENTS.md`, so Grok and Codex read one file and neither holds a private copy. A
Grok-only static rule would need its own file, not an edit to the shared one.
