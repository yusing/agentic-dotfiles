# Task file

Main keeps a task file for project work, including documentation and reviews; answer-only
exchanges need none. Write it at
`${XDG_STATE_HOME:-$HOME/.local/state}/agent-work/<client>-<session>.json`, named
`codex-$CODEX_SESSION_ID` in Codex and `claude-$CLAUDE_CODE_SESSION_ID` in Claude. A later
unrelated task in the same session adds `-2`, `-3`, and so on before `.json`.

It is a JSON object
`{"title": "...", "cwd": "...", "status": "...", "note": "...", "resume": [], "lines": []}` with no
other fields. `cwd` is the task's absolute directory and `note` its current step in a sentence.
`resume` lists, as strings, the facts a later session cannot recover from the lines, such as
worktree and artifact paths, unpublished commits, and running delegates; omit it when there are none.

Each `lines` entry
`{"id": "L1", "outcome": "...", "source": "...", "status": "pending", "evidence": "..."}` is one
observable outcome, listed in delivery order and citing the user's words, a project document, or a
tracker item. A line has no other fields. Statuses are `pending`, `active`, `blocked`, and `done`.
`evidence` is required once a line is `done` or `blocked`: the check or observation that proved
the outcome, or the reason it stopped.

Only main writes the file; delegates report to main. Keep the path through compaction and name it
in a handoff.

A session continuing an earlier task adopts that task's file: copy it to this session's path and
keep its lines, their order, and their statuses, changing a status only on new evidence. A line
recovered without a recorded status returns as `pending`. The task file is the task's only record,
so keep what a later session needs in its lines and `resume` rather than in a second file. When a
tracker item governs the task, each of its open outcomes has a line.

Mark the task blocked with the concrete blocker when it cannot proceed. For a needed user
decision, put the question and recommendation in the note and ask the user. Mark the task or a line
done only after its applicable validation, recorded as the line's evidence. Record canceled or
superseded work as blocked with the stopped reason as evidence, not as done; delete task files only
when authorized.
