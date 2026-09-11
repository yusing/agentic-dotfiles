# Codex hook owners

- Shared infrastructure: `.codex/hooks/lib/session_scope.ts` owns session-id validation,
  digests, session-scoped state paths, spawned-agent scope digests, age-based pruning, and
  live command-session detection; `.codex/hooks/lib/shell_command.ts` owns shared shell
  tokenization, segmenting, `-c` payload extraction, command-substitution extraction, prefix
  stripping, and option skipping; `.codex/hooks/lib/hook_response.ts` owns denial and
  additional-context envelopes; `.codex/hooks/lib/locked_state.ts` owns private-directory
  creation and exclusive locks; and `.codex/hooks/lib/hook_runtime.ts` owns stdin JSON,
  `--version`, process spawning, and `runMain` so a hook binary can import another
  hook's policy without executing it. User-owned hook commands are the `scriptc` binaries under
  `.codex/hooks/bin/`.
- Session and subagent start: `.codex/hooks/bin/check_project` detects VCS, task runner, languages,
  and Go version, and its `--without-git` option omits the VCS report for a client that
  already reports plain Git state itself; `.codex/hooks.json` injects root-session project
  context and direct `skills-mgr list` output at startup and after context
  compaction or clearing while excluding session resume. `.codex/hooks/bin/session_start_context`
  skips the project and skill context commands on fork startup when the transcript's first
  `session_meta` record has `forked_from_id`; unavailable metadata keeps the commands enabled.
  Compaction and clearing still refresh root context. SubagentStart uses the same wrapper to
  compare the current inventory with retained hook context in the child transcript. It suppresses
  only proven identical inventory from a complete transcript of at most 256 KiB. Missing, oversized,
  malformed, rolled-back, or unsupported history keeps delivery. The separate
  `.codex/hooks/bin/skills_mgr_inventory` command adds the `--- skills-mgr injected ---` heading
  for Claude; it is not the command currently registered by Codex.
  `CONTEXT-GROK-HOOK-PORT.md` records Grok's missing subagent-start delivery.
- Go skill delivery: `.codex/hooks/bin/go_guidelines` appends the installed CLI's complete,
  module-version-specific list after a `skills-mgr get golang-best-practices` call,
  standalone or in a straight-line newline/semicolon batch or successful `&&` chain.
  PostToolUse registers it for Codex, Claude, and Grok. The read's working
  directory selects the module; literal `cd <module> &&` within a success chain is
  also supported. Pipelines, shell control flow, mixed conditional/unconditional
  chains, and skill reads spanning multiple directories are excluded.
  Codex's unified-exec PostToolUse envelope currently omits the tool's `workdir`;
  outside the session directory, use explicit `cd <module> && skills-mgr get
  golang-best-practices` so the hook can select the module. Other clients may
  supply `tool_input.workdir` or `tool_input.cwd`, which the hook honors.
  Startup and unrelated tools do not load guidelines. The `END_GO_GUIDELINES` marker
  allows model-visible tail verification; missing tooling is reported without installation.
- Tool guards: `.codex/hooks/bin/generated_code_guard` blocks direct generated-Go edits;
  `.codex/hooks/bin/subagent_exec_guard` owns the container and orchestration command boundary
  for spawned agents, keyed on the event's `agent_type`. Codex registers the former for
  `apply_patch|Edit|Write` and the latter for `Bash`; these matcher strings alone do not prove
  coverage of every client tool or command wrapper. Check the client's hook-name mapping when
  a tool surface changes.
- Subagent command boundary: Codex re-applies the parent turn's permission profile and
  approval policy after a role layer, so `sandbox_mode` and `approval_policy` in
  `.codex/agents/*.toml` have no runtime effect and must not be declared there.
  `.codex/hooks/bin/subagent_exec_guard` enforces its matched command boundary when the event
  identifies the running role. The guard exempts root/default agents; they remain subject to
  task authorization and runtime permissions. Every role prompt
  states the boundary: recognized read-only container and orchestration inspection is allowed;
  mutations, process control, and unclassified commands stay root-owned. Blocked commands
  are reported with their purpose and passing evidence in the assigned result format.
  `.codex/IMPLEMENTATION.md` owns validation requirements.
- User experience: `.skills-mgr/skills/user-experience/SKILL.md` owns proportional UX and
  operability guidance when a user-facing workflow or interface changes.
