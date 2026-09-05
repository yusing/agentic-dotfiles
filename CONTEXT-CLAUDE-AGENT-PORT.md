# Claude agent port

`.claude/agents/*.md` ports the Codex native roles in `.codex/agents/*.toml`. Each generated Claude
file carries one complete role: Claude has no separate developer channel, so the Markdown body
carries both the model prompt and the TOML `developer_instructions` contract. The Codex role pair
remains the design owner. Run `.local/bin/sync-claude-agent-ports` after changing one; do not copy
the change into the Claude file by hand. The helper applies the client-specific mappings and
regenerates every Claude role. Its `--check` mode reports drift without writing.

Field mapping is the helper's concern. `model` and `model_reasoning_effort` become Claude's
`model` and `effort`, unless the role's Claude metadata specifies its own model or effort.
The simplification role keeps its Claude Sonnet/high budget independently of Codex routing.
Council roles use `model: inherit` in the helper's metadata, omitting both generated fields so
Claude continues to inherit its parent settings.
`fork_turns` and `service_tier` have no Claude counterpart and are
dropped: a Claude subagent always starts from a fresh context, which is what `fork_turns="none"`
selects under Codex. The Codex handoff fields `input_artifacts` and `result_artifact` are
harness structure with no Claude equivalent, so each body states the same contract in terms of
artifact paths the parent names in the task text.

The helper copies each descriptive role summary from the TOML without adding invocation policy.
Colors, tool allowlists, and the Codex-to-Claude model mapping live in the helper. A new Codex role
or an unmapped model makes generation fail until that platform metadata is supplied. The behavioral
prompt and developer contract are read directly from the native pair, so edits to either source
cannot pass the focused test while generated ports are stale.

Claude enforces structurally what Codex states by prompt. The `tools` allowlist omits `Agent`,
so no role can spawn another agent, and it omits `Edit` and `NotebookEdit` for the review and
council roles, so they cannot change repository files. `Write` stays on every role because a
relayed result artifact is the one permitted write, and the role body owns that limit.

`.codex/hooks/subagent_exec_guard.py` is registered directly as a frontmatter `PreToolUse` hook
on each role that has `Bash`, with no adapter. The guard already emits Claude's
`hookSpecificOutput` denial envelope and already keys on `agent_type`, which Claude sets inside
a subagent. Unlike the Grok port, the guard does not fail open here: a frontmatter hook runs
only inside its own subagent, so the field always names the running role. `council-member`
reasons from its brief alone, declares no `Bash`, and therefore registers no guard, while
`council-investigator` gathers its own repository evidence and registers the guard like the
review roles. Policy stays in the single Codex implementation; no Claude file repeats the denial
wording.

Frontmatter hooks in user-level agents under `.claude/agents/` run without a workspace-trust
grant, so this registration needs no per-folder approval.

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

Its focused test is `.local/tests/claude_agent_port_test.py`, which runs the generator in `--check`
mode and asserts the Codex-to-Claude role correspondence, tool boundaries, and guard registration.
Add the Codex source pair and its Claude-specific metadata together, then run the helper; stale or
missing generated output fails the test.

## Session start

`.claude/settings.json` registers two `SessionStart` hooks of its own.

`.codex/hooks/check_project` runs with `--without-git`, and with no adapter, because its
plain-text report needs none. Claude's own session context already states the working
directory, whether it is a Git repository, the branch, the working-tree status, and recent
commits, so the flag drops the hook's `vcs:` field and its version-control instruction for a
plain Git repository or an unversioned directory. Subversion and mixed `git+svn` checkouts are
still reported, because no client reports those. The task runner, language mix, and Go version
have no harness equivalent, which is what makes the registration worth having.

`.codex/hooks/skills_mgr_inventory.py` is the shared inventory hook. It owns the
`--- skills-mgr injected ---` heading so the injected list is not mistaken for Claude's own
visible skills. `skills-mgr list` scopes itself from the session environment, so the Claude
registration needs no harness flag or adapter. Claude has no separate post-compaction event:
the `*` matcher covers the `compact` session source, while the same hook is also registered for
Claude's subagent starts and post-compaction context.

`.claude/hooks/` remains Herdr-managed and untracked. The shared hook is covered by the existing
`.codex/hooks/*` allowlist entry. The `SessionStart` group that reports the session to Herdr stays
separate from the two static session-start hooks because Herdr rewrites its own group.

Both are covered by `.local/tests/claude_agent_port_test.py`; `--without-git` itself belongs to
`.codex/hooks/tests/check_project_test.sh`.
