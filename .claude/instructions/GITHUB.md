# GitHub text

Read when preparing pull request descriptions, issue bodies, or comments. Preparing text does not
authorize publishing it or changing Git state; keep to the requested operation and its approval
boundary.

Preserve the exact body, including real newlines and intentional literal escapes, and never let the
shell execute any of it. Pass multiline text through a quoted heredoc (`<<'EOF'`) or a body file
with `gh`'s `--body-file` option.
