# Claude agent port

`.claude/agents/*.md` ports the Codex native roles in `.codex/agents/*.toml`. Each TOML
`developer_instructions` contains the complete role and task/result contract; the generated
Markdown body carries that text with client-specific mappings. The TOML is the design owner.
Run `.local/bin/sync-claude-agent-ports` after changing it; do not edit generated roles by hand.
The compiled helper's source and changelog live in `.local/lib/sync-claude-agent-ports/`.
Its `--check` mode reports drift without writing.

Field mapping is the helper's concern. `model` and `model_reasoning_effort` become Claude's
`model` and `effort`, unless the role's Claude metadata specifies its own model or effort.
The simplification role keeps its Claude Sonnet/high budget independently of Codex routing.
The implementation role keeps Opus/medium independently of Codex routing.
Explicit Claude metadata still applies when a Codex role omits its model and effort for dispatch.
Council roles use `model: inherit` in the helper's metadata, omitting both generated fields so
Claude continues to inherit its parent settings.
Claude subagents start from a fresh
context. The Codex handoff fields `input_artifacts` and `result_artifact` are
harness structure with no Claude equivalent, so each body states the same contract in terms of
artifact paths the parent names in the task text.

The helper copies each descriptive role summary from the TOML without adding invocation policy.
Colors, tool allowlists, and the Codex-to-Claude model mapping live in the helper. A new Codex role
or an unmapped model makes generation fail until that platform metadata is supplied. The behavioral
prompt and task/result contract are read directly from the native TOML, so source edits
cannot pass the focused test while generated ports are stale.

Only the implementation role includes `Agent` in its `tools` allowlist, so it can dispatch
independent inspections under shared AGENTS.md. This requires a Claude runtime and depth limit
that permit nested agents; the generator does not configure runtime limits.
The allowlist omits `Edit` and `NotebookEdit` for the review and council roles. `Write` stays
on every role for a relayed result artifact, and evidence-gathering roles also have `Bash`.
These tool lists are not a filesystem sandbox: native TOML role bodies prohibit repository
writes and own the exact-path artifact exception for both clients. The generator does not
add artifact permissions.

`.codex/hooks/bin/subagent_exec_guard` is registered directly as a frontmatter `PreToolUse` hook
on each role that has `Bash`, with no adapter. The guard emits Claude's
`hookSpecificOutput` denial envelope and keys on the running role's `agent_type`.
Enforcement depends on Claude supplying that identity; frontmatter registration alone does
not prove a runtime payload or permission boundary. `council-member`
reasons from its brief alone, declares no `Bash`, and therefore registers no guard, while
`council-investigator` gathers its own repository evidence and registers the guard like the
review roles. Policy stays in the single Codex implementation; no Claude file repeats the denial
wording.

Check the running Claude client's hook delivery and trust behavior when those boundaries matter;
the generated files and local tests establish configuration, not a live permission guarantee.

## Grok reads the same role files

Grok resolves its subagent types from these same files, which `grok inspect --json` reports with
`"source": {"type": "project", "path": ".../.claude/agents/<name>.md"}` for every role. There is
therefore no `.grok/agents/` directory and no third copy of any role: this port is the role
surface for both clients, and a native Grok role file would shadow the Claude one and split
ownership. `[compat.claude]` in `.grok/config.toml` documents its `agents` cell as covering named
instruction files rather than this directory, so which cell gates the discovery is unconfirmed;
`grok inspect` is the check that it still happens.

Grok drops what it has no field for. `model` and `effort` are Claude names, so a Grok subagent
runs on the session model at the session reasoning effort. The frontmatter `Bash` matcher still
reaches Grok, which matches `Bash` and `run_terminal_command` under one matcher name, but the
guard fails open there for the reason `CONTEXT-GROK-HOOK-PORT.md` records, so under Grok the
command boundary rests on the role body alone.


## Session start

`.claude/settings.json` registers two `SessionStart` hooks of its own.
Grok does not load them: `[compat.claude] hooks = false` in
`.grok/config.toml`, and Grok's copies live in `.grok/hooks/codex-port.json`.

`.codex/hooks/bin/check_project` runs with `--without-git`, and with no adapter, because its
plain-text report needs none. Claude's own session context already states the working
directory, whether it is a Git repository, the branch, the working-tree status, and recent
commits, so the flag drops the hook's `vcs:` field and its version-control instruction for a
plain Git repository or an unversioned directory. Subversion and mixed `git+svn` checkouts are
still reported, because no client reports those. The task runner, language mix, and Go version
have no harness equivalent, which is what makes the registration worth having.

`.codex/hooks/bin/skills_mgr_inventory` is the shared inventory hook. It owns the
`--- skills-mgr injected ---` heading so the injected list is not mistaken for Claude's own
visible skills. `skills-mgr list` scopes itself from the session environment, so the Claude
registration needs no harness flag or adapter. The current settings register it with `*`
matchers for `SessionStart`, `SubagentStart`, and `PostCompact`. Check the running client's
event sequence before assuming one inventory delivery per compaction; the registrations
themselves do not deduplicate it.

`.claude/hooks/` remains Herdr-managed and untracked. The shared hook is covered by the existing
`.codex/hooks/*` allowlist entry. The `SessionStart` group that reports the session to Herdr stays
separate from the two static session-start hooks because Herdr rewrites its own group.
