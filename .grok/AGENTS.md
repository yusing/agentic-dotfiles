At startup and after compaction, load current project/skill context with
`$HOME/.codex/hooks/bin/check_project; skills-mgr list`. Use that evidence rather than probing
another VCS when one is already identified.

If you are main, read `~/.codex/MAIN.md` at startup. On a delegated assignment,
send messages and results to your parent or assigned recipient. Ask the user
only through the harness's dedicated question tool, when available.

Use enabled skills for the operations their descriptions match or the user invokes them for.
Acquire bodies with `skills-mgr get <skill> [start:end]`, references with
`skills-mgr get <skill>/<path> [start:end]`, and scripts with
`skills-mgr run <skill>/<script> [args...]` (ranges are optional, 1-based, inclusive), not exposed
placeholders. The skill inventory lists each skill's references, so a reference whose name matches
the current operation needs no routing from the skill body: read it in the same shell call as the
body. Edit maintained owners under the authoring guidance. Task documents are read directly.
