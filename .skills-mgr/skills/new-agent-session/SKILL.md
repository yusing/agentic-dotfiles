---
name: new-agent-session
description: Start an isolated coding-agent session in a new Git worktree linked beneath the original Herdr workspace.
disable-model-invocation: true
---

# New agent session

Deliver a visible, interactive agent in its own worktree and Herdr subspace, not a
background process or an in-thread subagent. Start with one read-only preflight call:

```bash
skills-mgr run new-agent-session/scripts/preflight.py --cwd "$PWD"
```

It returns caller agent kind and reusable Mekugi executable, one base commit, dirty status,
source workspace, existing worktrees, and taken agent names. It also checks the installed
Herdr CLI for the syntax used below, printing `cli: ok` or the usage of a mismatched command
group. Reuse this evidence across every batch instead of repeating discovery per launch.
Add `--with-skill` to also print this skill when it is not yet loaded.
Pass the caller's checkout explicitly because `skills-mgr run` executes in the skill directory.
It requires `HERDR_ENV=1`, preserves focus, and creates or launches nothing. A failed probe
retains successful evidence and reports errors separately; resolve only the dependent gap.
Load the `herdr` skill only for recovery or a Herdr operation these steps do not cover.

## Choose the agent

- Use the requested agent kind, model, reasoning effort, and profile. A coordinating workflow
  such as `batch-agent-sessions` may supply a workload-selected budget when the user left it open;
  apply that selection without overriding explicit user choices. Otherwise retain the configured
  model and effort.
- Otherwise keep the current agent kind when known, or ask.
- For Codex, use Mekugi unless the user asks for plain Codex. Use the preflight's absolute
  `mekugi_executable`: it resolves the caller's `/proc/<pid>/exe` when running under
  Mekugi, otherwise PATH lookup. The new pane's PATH may lack it, so always launch the absolute
  path. If the caller runs Mekugi but its executable cannot be reused, report the
  failure instead of falling back to plain Codex.
- Interactive Mekugi refuses to start without `--yolo` (no approvals or sandbox). A caller
  running under Mekugi already has that mode, so launch with `codex --yolo`. Do not copy the
  caller's other arguments, such as `--debug` or a resume target. Any other caller needs the
  user's authorization for `--yolo` before launching.

## Steps

1. **Capture the task.** Record the exact task text now: the user's task prompt, or the
   assignment a coordinating workflow supplies in its place. The new agent does not inherit
   this conversation. Skip only if the user asked for an empty session.
2. **Resolve the base.** Use the preflight's current checkout `base_commit`, resolved to a commit
   ID. Uncommitted changes do not follow; if the task depends on them, resolve that with
   the user instead of dropping them or copying unrelated edits.
3. **Find the source workspace.** Use the preflight's `source.source_workspace_id` and
   worktree inventory. Use the caller's context, not the
   UI-focused workspace. Choose a branch name and absolute path that do not collide with
   the listed worktrees.
4. **Create the worktree** so Herdr links it as a subspace:

   ```text
   herdr worktree create --workspace <source-workspace-id> --branch <branch> \
     --base <commit> --path <absolute-path> --label <task-label> --no-focus
   ```

   Keep the returned root pane ID. Do not use `git worktree add` plus
   `herdr workspace create`; that creates an unrelated top-level space. Leave focus
   unchanged unless asked.
5. **Launch in the returned pane.**
   - Mekugi: `herdr pane run <pane> "<mekugi-path> codex --yolo"`, then
     `herdr agent rename <pane> <agent-name>`. `herdr agent start` cannot use a
     replacement launcher. Herdr detects the Codex child under Mekugi only after startup:
     until then, agent commands fail with `agent_not_found`, so retry briefly, and read the
     pane if the error persists, since the launch may have exited. Once detected, a ready
     Mekugi may report `unknown` rather than `idle`, so do not wait for `idle`; the
     prompt's `--wait` in the next step confirms delivery.
   - Otherwise: `herdr agent start <agent-name> --kind <kind> --pane <pane>`.

   The agent name identifies the harness (`mekugi`, or the agent kind), while the
   workspace label identifies the work. Names must be unique among live agents, so
   append the lowest free numeric suffix (`mekugi-2`) when the bare name is taken, and
   address the agent by pane ID where several share a harness. Renaming an agent ends
   any wait that targets its old name.

   Pass native agent arguments only through the launcher's own interface. Never start a
   detached process and wrap a pane around it later. For a selected Codex budget, add
   `-m <model> -c 'model_reasoning_effort="<effort>"'` to its native arguments, after Mekugi's
   `codex` subcommand when using that wrapper. Verify the effective model and effort before
   sending the task; process arguments establish what was requested, not what configuration
   the client actually loaded.
6. **Send the prompt.** Run `herdr agent prompt <name> "<text>" --wait --until working`
   with one text argument: the captured task text verbatim. Append a handoff only for
   task-specific information missing from that text: preservation/acceptance conditions,
   relevant evidence, repository-edit boundary, delivery authorization and communication
   route. Include another owner only for a concrete overlap. Do not add empty evidence
   sections, hypothetical missing-file defenses, launch provenance, sibling inventories
   or unrelated coordinator work.

   Point to applicable project guidance rather than restating its documentation, testing
   or review rules. Carry settled decisions and authorization without reconfirming them.
   Launching does not by itself authorize a commit, merge or install. Required completion
   evidence uses the session's existing result channel; when that is a journal, its guidance
   owns completion rather than a handoff demanding a duplicate final report.
7. **Verify.** Confirm the agent's name and that its cwd is the worktree. For Mekugi,
   confirm with `herdr pane process-info` that both Mekugi and its Codex child are
   running; detecting Codex alone does not prove the wrapper. The prompt counts as
   delivered only after the agent reaches `working`. Startup readiness or a submitted
   prompt is not enough.

## Failure and recovery

On a blocked, stalled, or timed-out step, inspect the pane (`herdr agent read`,
`herdr agent explain`) and follow the herdr skill's recovery guidance. Do not start a
second agent or resend the prompt blindly. On retry, reuse the worktree and workspace
already created for this launch without resetting them. If setup only partly
succeeds, report what exists.

## Launch evidence

Return the worktree path, branch, workspace and pane IDs, agent name, effective model/effort,
and a session ID when available. State "launched and working", not "done". Do not wait for the
implementation to finish unless asked. Record these facts on the existing work-update
surface; they are not required final-answer text when that surface is a journal.
