# Generate from the installed CLI only when Fish requests its completions.
command -q skills-mgr; and command skills-mgr completion fish | source
