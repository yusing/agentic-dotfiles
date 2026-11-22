# Generate from the installed CLI only when Fish requests its completions.
command -q codex; and command codex completion fish | source
