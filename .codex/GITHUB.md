# GitHub text

Read when preparing pull request descriptions, issue bodies, or comments. Preparing text does
not authorize publishing it or changing Git state; preserve the requested operation and approval
boundary.

Prefer structured tool arguments for multiline text. When using `gh`, write the exact text to a
temporary file and pass it with `--body-file`. Preserve actual newlines and intentional literal
escapes; treat shell command text as code rather than interpolating the body into it.
