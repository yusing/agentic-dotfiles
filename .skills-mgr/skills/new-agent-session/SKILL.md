---
name: new-agent-session
description: Start an isolated coding-agent session in a new Git worktree linked beneath the original Herdr workspace.
disable-model-invocation: true
---

# New agent session

Deliver a visible, interactive agent in its own worktree and linked Herdr subspace.
Use this workflow for standalone launches. Mekugi's `/orchestrate` coordinates batch threads.

## Preflight and inputs

Reuse preflight evidence supplied by a coordinating workflow, otherwise run once:

```bash
skills-mgr run new-agent-session/scripts/preflight.py --cwd "$PWD"
```

This read-only probe requires `HERDR_ENV=1` and checks launch inputs and Herdr CLI compatibility.
Pass the caller's checkout because `skills-mgr run` changes directory. Reuse successful evidence
across launches; resolve only failed probes. `--with-skill` also prints this skill when needed.

Capture the exact user task or coordinator assignment, unless an empty session was requested.
The session does not inherit this conversation. Use preflight's committed `base_commit` and
`source_workspace_id`, not the UI-focused workspace. If the task needs uncommitted changes,
resolve that with the user. Choose a branch and absolute checkout path absent from its inventory.

## Select and launch

Honor requested agent kind, model, effort, and profile. Otherwise keep the caller's agent kind
(or ask if unknown), and use coordinator-selected budgets or the configured model and effort.
For Codex, default to Mekugi unless plain Codex was requested.

Use preflight's absolute `mekugi_executable`; a returned process path remains usable only while
its caller runs. A new pane may lack the executable on PATH. If the caller's Mekugi executable
cannot be reused, report the failure rather than substitute plain Codex.
Launch Mekugi with `codex --yolo` (no approvals or sandbox). A Mekugi caller already uses this
mode; other callers need user authorization. Standalone launches do not copy caller arguments
such as `--debug` or resume targets.

Create the linked subspace, preserving focus unless the user requests a change:

```text
herdr worktree create --workspace <source-workspace-id> --branch <branch> \
  --base <commit> --path <absolute-path> --label <task-label> --no-focus
```

Keep the returned root pane ID. Separate `git worktree add` and `herdr workspace create` calls
produce an unrelated top-level space. Launch directly in the returned pane:

- Mekugi: `herdr pane run <pane> "<mekugi-path> codex --yolo"`, then
  `herdr agent rename <pane> <agent-name>`. `herdr agent start` cannot use a replacement launcher.
- Otherwise: `herdr agent start <agent-name> --kind <kind> --pane <pane>`.

Name the agent by harness (`mekugi` or its kind), adding the lowest free numeric suffix when
needed; label the workspace by task. Address agents by pane ID when several share a harness.
Rename before waiting, since renaming ends waits on the old name.

Pass native arguments through the launcher's interface. For selected Codex budgets, add
`-m <model> -c 'model_reasoning_effort="<effort>"'`, after Mekugi's `codex` subcommand.

## Verify and deliver

Before sending the task, verify the name, worktree cwd, and effective loaded model/effort;
arguments alone show only requested settings. For Mekugi, use `herdr pane process-info` to
confirm both Mekugi and Codex. Briefly retry startup `agent_not_found`, then inspect the pane
if it persists. Ready Mekugi can report `unknown`; do not wait indefinitely for `idle`.

Unless an empty session was requested, send
`herdr agent prompt <name> "<text>" --wait --until working` with one text argument:
the exact task plus a handoff for missing evidence, settled boundaries, authorization, and
result channel. Label unverified causes as hypotheses; owner pointers are not requirements.
Launching alone authorizes no commit, merge, or install. Use the session's journal when
available, otherwise its ordinary result channel. Observed `working` confirms task delivery.

## Recovery and result

For blocked, stalled, or timed-out steps, inspect with `herdr agent read` or `herdr agent explain`
and load `herdr` for recovery or operations not covered here. Reuse existing worktree/workspace
resources without resets; inspect uncertain delivery before any resend or replacement launch.
Report partial resources and blockers when recovery cannot complete.

Record one launch receipt on the existing work-update surface: checkout, branch, workspace/pane,
agent name, effective budget, and session ID when available. Report "launched and working"
only after delivery; do not wait for implementation completion unless asked. The result channel's
guidance owns completion, without an additional recap.
