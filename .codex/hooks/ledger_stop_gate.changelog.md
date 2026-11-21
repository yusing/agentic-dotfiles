# Changelog

## 3.2.0

Recheck task files on every stop, including stops during hook-driven
continuation. An earlier continuation no longer bypasses unfinished-line or
task-shape checks. When work cannot proceed or the user asks to stop, the
continuation message directs the agent to record the reason and mark the
task blocked before stopping.

## 3.1.0

Continue a turn that stops while a well-formed task file has `pending` or
`active` lines, unless the task's status is `blocked` or `done`. A final
message is the only one that stays visible, so answering a question during
work ends the turn; the continuation resumes that work. A second stop in the
same turn passes, which covers a deliberate stop.

## 3.0.0

Stop running commands. The gate now checks the task file's shape: only the
defined task and line fields, valid statuses, a string-array `resume`, a
source on every line, and `evidence` on every line that is done or blocked.
The `e2e` field is no longer defined, so a file that carries it is reported
with the other undefined fields. A task file no longer has to be owned by the
user, because the gate only reads it.

## 2.0.0

Read the ledger from the session's task files,
`${XDG_STATE_HOME:-~/.local/state}/agent-work/codex-<session_id>[-n].json`,
where it is the `lines` array. Block on unsourced lines and on a failing `e2e`
of a line whose `status` is `active`, run from the task's `cwd` when it names a
directory. Sessions without task files stop freely.

## 1.0.0

Initial release of the Stop gate for the session outcome ledger at
`/tmp/codex-ledger/<session_id>.json`. Reject a stop while an entry lacks a
source or an active entry's `e2e` command fails, reporting its output tail.
Skip continued stops, absent ledgers, and files not owned by this user or
writable by others.
