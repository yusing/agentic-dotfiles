At root-session start and after compaction, run these before other work and use their stdout:

`$HOME/.codex/hooks/bin/check_project --without-git`
`skills-mgr list`

When a spawned subagent begins, run `skills-mgr list` before other work and use the stdout.

@../.codex/AGENTS.md
