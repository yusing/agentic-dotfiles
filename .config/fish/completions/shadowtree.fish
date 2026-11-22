# Generate from the installed CLI only when Fish requests its completions.
command -q shadowtree; and command shadowtree completion fish | source
