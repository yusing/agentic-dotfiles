# Changelog

## 1.2.5

Retain the main session's Mekugi wrapper flags from preflight and pass them
before codex in batch launches. Keep native model, effort, profile, and resume
arguments separate. Existing launched sessions retain their original settings.
Exclude provider authentication and the main's capture destination. Preserve
successful preflight evidence when the wrapper-help probe fails.

## 1.2.4

Forward invocation-local TMPDIR and MEKUGI_RUNTIME_DIR to Mekugi launches.
Wait for the initial loaded-budget footer within the startup deadline.
Add an explicit retry-startup operation for inspected failed starts that have no
task delivery or retained agent identity. Verify the same linked workspace and
idle shell before retrying, preserving live agents and uncertain prompt receipts.

## 1.2.3

Prefix tasks that start with `/` with `Task:` so absolute paths and quoted slash
commands reach the agent as literal task text. Keep recorded task text unchanged
for initial and follow-up delivery.

## 1.2.2

Withdraw queued follow-ups without stopping agents or losing task receipts. Refuse
initial, delivered, or uncertain tasks; cancelled tasks stay cancelled on plan replay
and no longer block cleanup.

## 1.2.1

Confirm an empty, ready Mekugi composer before task delivery and return focus
from navigation panes to Main. Leave drafts and dialogs untouched, with the task
queued instead of recording an uncertain prompt that the agent never received.

## 1.2.0

Keep run directories, checkouts, and evidence under the state directory instead of `/tmp`.
Initialize each checkout's submodules recursively wherever the source checkout has them, at
the recorded commits, cloning from the local source repositories so unpublished pinned commits
resolve, and fall back to upstream when a commit is missing locally. Before cleanup, refuse
submodule work that forced removal would lose (uncommitted files, stashes, unmapped gitlinks,
and branch or tag commits outside recorded and remote history), retain changed nested commits as
the batch branch in the source submodule repositories, then force removal of checkouts that
Git refuses to remove because they contain submodules. Refuse cleanup when removed or
deinitialized submodules leave repository storage outside the live checkout checks. Prepare
submodules on batch-local named branches and record attached source branch names for integration
back onto those branches without losing changes.

## 1.1.1

Accept Herdr's silent successful pane-run response and recover unique agent names
when an earlier launch succeeded without its acknowledgement. Retain existing
processes and prompt receipts rather than launching replacement sessions.

## 1.1.0

Own the complete deterministic prepare, launch, wait, and cleanup lifecycle.
Launch retained assignments with native routes, unique names, process identity and
loaded-budget verification, and observed prompt activity. Record uncertain effects
without blindly relaunching or redelivering. Wait concurrently and stop only losing
CLI wait clients. Add new cohorts at an explicit or current committed baseline while
preserving existing sessions. Queue stable-ID follow-ups until ready, acknowledge
inspected deliveries, resolve handoff evidence copies, and preserve unfinished tasks
through cleanup. Serialize mutating commands with manifest-scoped advisory locks.

## 1.0.0

Provide manifest-owned batch preparation and cleanup: shared-base Herdr worktrees,
temporary evidence copies and retained-image recovery, explicit project setup,
and non-forced removal of selected finished worktrees while preserving branches.
Remove owned temporary evidence after every batch finishes; retain the manifest,
unfinished work, and altered or unrecorded artifacts for recovery.
Support inspected-ready attestations for unknown agent states, reconcile lost removal
responses, and recover literal quoted paths from Codex image markers.
