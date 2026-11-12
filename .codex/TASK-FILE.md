# Task file

Main keeps a task file for project work, including documentation and reviews; answer-only
exchanges need none. Write it at
`${XDG_STATE_HOME:-$HOME/.local/state}/agent-work/<client>-<session>.json`, named
`codex-$CODEX_SESSION_ID` in Codex and `claude-$CLAUDE_CODE_SESSION_ID` in Claude. A later
unrelated task in the same session adds `-2`, `-3`, and so on before `.json`.

It is a JSON object `{"title": "...", "cwd": "...", "status": "...", "note": "...", "lines": []}`:
`cwd` is the task's absolute directory and `note` its current step. Each `lines` entry
`{"id": "L1", "outcome": "...", "source": "...", "status": "pending"}` is one observable outcome,
citing the user's words, a project document, or a tracker item. Statuses are `pending`, `active`,
`blocked`, and `done`. Only main writes the file; delegates report to main. Keep the path through
compaction and name it in a handoff.

Mark the task blocked with the concrete blocker when it cannot proceed. For a needed user
decision, put the question and recommendation in the note and ask in chat. Mark the task or a line
done only after its applicable validation. Record canceled or superseded work as blocked with the
stopped reason, not as done; delete task files only when authorized.
