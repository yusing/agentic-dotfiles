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
  context and skill inventory at startup and after context compaction or
  clearing while excluding session resume. `.codex/hooks/bin/session_start_context`
  skips the project and skill context commands on fork startup when the transcript's first
  `session_meta` record has `forked_from_id`; unavailable metadata keeps the commands enabled.
  Compaction and clearing still refresh context. The registry injects the current skill inventory
  into fresh subagent context.
- Go skill delivery: `.codex/hooks/bin/go_guidelines` appends the installed CLI's complete,
  module-version-specific list after a direct `skills-mgr get golang-best-practices` call.
  PostToolUse registers it for Codex, Claude, Grok, and the OMP bridge. The read's working
  directory selects the module; a literal `cd <module> &&` prefix is also supported.
  Startup and unrelated tools do not load guidelines. The `END_GO_GUIDELINES` marker
  allows model-visible tail verification; missing tooling is reported without installation.
- Tool guards: `.codex/hooks/bin/generated_code_guard` blocks direct generated-Go edits;
  `.codex/hooks/bin/subagent_exec_guard` owns the container and orchestration command boundary
  for spawned agents, keyed on the event's `agent_type`.
- Subagent command boundary: Codex re-applies the parent turn's permission profile and
  approval policy after a role layer, so `sandbox_mode` and `approval_policy` in
  `.codex/agents/*.toml` have no runtime effect and must not be declared there.
  `.codex/hooks/bin/subagent_exec_guard` is the enforceable owner; the root agent stays
  unrestricted because it is the only agent that can escalate to the user. Every role prompt
  states the boundary: recognized read-only container and orchestration inspection is allowed;
  mutations, process control, and unclassified commands stay root-owned. Blocked commands
  are reported with their purpose and passing evidence in the assigned result format.
  `.codex/IMPLEMENTATION.md` owns validation requirements; execution-agent selection and
  multi-owner coordination live in `.skills-mgr/skills/route-execution/SKILL.md`.
- User experience: `.skills-mgr/skills/user-experience/SKILL.md` owns proportional UX and
  operability guidance when a user-facing workflow or interface changes.

Validation commands for instruction and hook owners are listed in
`CONTEXT-VALIDATION.md`.
