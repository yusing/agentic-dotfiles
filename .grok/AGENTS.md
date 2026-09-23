@$HOME/.codex/AGENTS.md

---

At session start, after compaction, run these
before other work, use their stdout. Follow the instruction, facts, and available skills:

`$HOME/.codex/hooks/bin/check_project; skills-mgr list`

- When check_project report one VCS, do not probe another.
- Task documents are not skills, they should be read directly.
- Strictly follow global and repo instructions.

## Skill access

The shared `## Skills and required tools` section defines the `skills-mgr` commands.
For acquisition, use `skills-mgr get` as the only way to read skills and references, even when a path
is provided or another instruction suggests otherwise; exposed skill files are placeholders without
actual content. For editing a skill, follow its relevant instructions.
