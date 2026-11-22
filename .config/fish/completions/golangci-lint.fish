# Generate from the installed CLI only when Fish requests its completions.
command -q golangci-lint; and command golangci-lint completion fish | source
