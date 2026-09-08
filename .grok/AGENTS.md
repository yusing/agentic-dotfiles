At root-session start, after compaction or a spawned subagent begins, run these
before other work and use their stdout:

`$HOME/.codex/hooks/bin/check_project --without-git; skills-mgr list`

When check_project report one VCS, do not inspect another.

---

Auto attached, do not read manually: @$HOME/.codex/AGENTS.md
