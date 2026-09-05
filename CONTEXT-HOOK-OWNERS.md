# Codex hook owners

- Shared infrastructure: `.codex/hooks/session_scope.py` owns session-id validation,
  digests, session-scoped state paths, spawned-agent scope digests, age-based pruning, and
  live command-session detection; `.codex/hooks/shell_command.py` owns shared shell
  tokenization, segmenting, `-c` payload extraction, command-substitution extraction, prefix
  stripping, and option skipping; `.codex/hooks/hook_response.py` owns denial and
  additional-context envelopes; and `.codex/hooks/locked_state.py` owns private-directory
  creation and exclusive locks.
- Session and subagent start: `.codex/hooks/check_project` detects VCS, task runner, languages,
  and delegates module-scoped Go version and guideline reporting to
  `.codex/hooks/go_guidelines.py`. Its `--without-git` option omits the VCS report for a client that
  already reports plain Git state itself; `.codex/hooks.json` injects root-session project
  context and skill inventory at startup and after context compaction or
  clearing while excluding session resume, and injects project context and current skill inventory into fresh
  subagent context.
- Go guidance: `.codex/hooks/go_guidelines.py` finds the nearest owning `go.mod`, obtains the
  provider's pinned CLI version through `skills-mgr`, and uses only the already-installed
  binary from the cache layout owned by the provider's `scripts/run-tool.sh`. It caches complete
  lists by CLI and Go version, never installs at startup, and reports unresolved or unavailable
  guidance without suppressing ordinary project context. A `go.work` or installed toolchain
  version does not replace a member module's language version. UserPromptSubmit and PostToolUse
  run its `--refresh` mode, with delivery state scoped to session and agent; startup,
  fresh-agent, and compaction reports always reinject. Normal tool working directories and
  explicit Go file/patch targets select the module automatically, using the file-target resolver
  shared with the generated-Go guard. Literal file/directory operands and `cd` in shell inspection
  use the shared shell parser. Modules are deduplicated before provider calls, which share one
  deadline. Agents need no refresh command or extra path argument.
- Skill inventory: `.codex/hooks/skills_mgr_inventory.py` supplies the shared harness-aware
  inventory and omits `use-modern-go`, which remains an enabled CLI backend. The project hook
  owns its generated list and application policy; `golang-best-practices` is the only initial
  Go skill read. The tracked remote patch owns the backend's explicit-use instructions.
- Tool guards: `.codex/hooks/generated_code_guard.py` blocks direct generated-Go edits;
  `.codex/hooks/latest_dependency_instruction.py` blocks explicitly versioned dependency
  additions; `.codex/hooks/remote_vcs_guard.py` requires approval for `git clone`; and
  `.codex/hooks/subagent_exec_guard.py` owns the container and orchestration command boundary
  for spawned agents, keyed on the event's `agent_type`.
- Subagent command boundary: Codex re-applies the parent turn's permission profile and
  approval policy after a role layer, so `sandbox_mode` and `approval_policy` in
  `.codex/agents/*.toml` have no runtime effect and must not be declared there.
  `.codex/hooks/subagent_exec_guard.py` is the enforceable owner; the root agent stays
  unrestricted because it is the only agent that can escalate to the user. Every role prompt
  states the boundary because the guard denies every spawned role; implementer prompts own
  routing it as a manifest blocker, and read-only role prompts own recording it as a coverage
  limitation. `.codex/skills/orchestrated-workflow/SKILL.md` owns external validation before
  review roles are spawned when the change carries that dependency.
- User experience: `.skills-mgr/skills/user-experience/SKILL.md` owns proportional UX and
  operability guidance when a user-facing workflow or interface changes.

Validation commands for instruction and hook owners are listed in
`CONTEXT-VALIDATION.md`.
