# Codex hook owners

- Shared infrastructure: `.codex/hooks/session_scope.py` owns session-id validation,
  digests, session-scoped state paths, spawned-agent scope digests, age-based pruning, and
  live command-session detection; `.codex/hooks/shell_command.py` owns shared shell
  tokenization, segmenting, `-c` payload extraction, command-substitution extraction, prefix
  stripping, and option skipping; `.codex/hooks/hook_response.py` owns denial and
  additional-context envelopes; and `.codex/hooks/locked_state.py` owns private-directory
  creation and exclusive locks.
- Session and subagent start: `.codex/hooks/check_project` detects VCS, task runner, languages,
  and Go version, and its `--without-git` option omits the VCS report for a client that
  already reports plain Git state itself; `.codex/hooks.json` injects the current skill
  inventory into root sessions and fresh subagent context.
- Documentation reads: `.codex/hooks/doc_read_guard.py` owns the one-line confirmation before
  the first Markdown read and the per-session first-edit marker.
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
- Review routing: `.codex/hooks/turn_review_instruction.py` owns explicit native-role routing,
  production-change detection, the inspection risk gate, and the one-time launch approval
  prompt. Native role prompts own their inspection method and result contract.
- User experience: `.agents/skills/user-experience/SKILL.md` owns proportional UX and
  operability guidance when a user-facing workflow or interface changes.

Validation commands for instruction and hook owners are listed in
`CONTEXT-VALIDATION.md`.
