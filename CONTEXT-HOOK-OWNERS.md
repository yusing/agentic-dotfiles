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
- Session and subagent start: `.codex/hooks/bin/check_project` detects VCS, Git branches and
  HEAD commits, nested submodules, task runner, languages, and Go version. It lists each
  submodule path from the repository root, including nested checkouts, followed by its branch
  and 8-character HEAD prefix when present (`path@branch@<sha>`). The VCS line names the
  detected kind and worktree's Git branch, HEAD, and SVN revision when present, for example
  `git@branch@<sha>+svn@r<revision>`. Detached checkouts omit the branch; unborn branches
  omit the SHA. Its `--without-git` option omits
  the plain Git or unversioned VCS line for a client that already reports that state, and still
  lists those submodule commits; `.codex/hooks.json` injects root-session project
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
- Tool guards: `.codex/hooks/bin/generated_code_guard` blocks direct generated-Go edits;
  `.codex/hooks/bin/subagent_exec_guard` owns the container and orchestration command boundary
  for spawned agents, keyed on the event's `agent_type`. Codex registers the former for
  `apply_patch|Edit|Write` and the latter for `Bash`; `.claude/settings.json` registers the
  former for Claude's edit tools. These matcher strings alone do not prove
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
- Go quality: `.codex/hooks/bin/go_quality` records a background baseline for Go
  projects at `SessionStart`, fences potential Go writes at `PreToolUse` until
  the baseline is ready, and refreshes the command preimage under a best-effort
  writer gate that never denies a tool. Read-only shell commands skip the gate. A
  failed non-shell tool is reconciled by the same session's next tool, and `Stop`
  reconciles any writer the session still holds. First project creation, a
  `go.mod` or `go.work` written at the cwd or an ancestor, snapshots pre-existing
  loose Go sources before the tool runs. It records source
  edits and applies `go fix` (Go 1.26+) and `gofmt` at `PostToolUse` to the
  files each tool changed, saving private per-command diff reports. Model context
  carries only the hook's own rewrites, as a diff or line ranges, and auto-fix
  errors. A file that does not build or parse yet is silently retried by later
  Go edits; `Stop`
  requires fixes for new `go fix`, `golangci-lint`, or `deadcode` findings after
  Go files change. Project discovery follows the session cwd and its ancestors;
  for a Go module nested under a non-Go cwd, start the agent inside that module.
  The managed Go skill no longer owns these checks. `.claude/settings.json` registers the
  same actions directly, and `CONTEXT-GROK-HOOK-PORT.md` records the Grok port. Both clients
  also run `edit` on `PostToolUseFailure`, so a failed writer is reconciled at once, and
  match only write-capable tools so file reads skip the gate.
