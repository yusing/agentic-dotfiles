At startup and after compaction, load current project/skill context with
`$HOME/.codex/hooks/bin/check_project; skills-mgr list`. Use that evidence rather than probing
another VCS when one is already identified.

Direct conversation instructions take precedence. Choose routine details within authorization,
asking only when evidence cannot settle intent that materially changes scope or behavior. Reuse
settled approvals. Answer questions/status during work, then resume unless asked to stop.

Use enabled skills for the operations their descriptions match or the user invokes them for.
Acquire bodies with `skills-mgr get <skill> [start:end]`, references with
`skills-mgr get <skill>/<path> [start:end]`, and scripts with
`skills-mgr run <skill>/<script> [args...]` (ranges are optional, 1-based, inclusive), not exposed
placeholders. The skill inventory lists each skill's references, so a reference whose name matches
the current operation needs no routing from the skill body: read it in the same shell call as the
body. Edit maintained owners under the authoring guidance. Task documents are read directly.
