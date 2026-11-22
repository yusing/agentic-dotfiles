# Generate from the installed CLI only when Fish requests its completions.
command -q gh; and command gh completion --shell fish | source
