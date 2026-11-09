# GitHub

Read when preparing GitHub text or publishing and merging pull requests.

## Pull request publication

Choose the landing strategy before publishing. Follow the user's or repository's specified
strategy; otherwise squash-land PRs assembled from temporary review or integration branches.
Publish each PR's intended change once, preserving author attribution and dependency order.

Apply review corrections to the original PR lineage rather than merging a rebased review copy
back into it. Keep temporary integration merges and duplicate original/rebased commits out of
published history. An ancestry-only `ours` merge to make a rewritten branch fast-forwardable
does not satisfy this requirement.

Before pushing or merging, inspect the proposed commit graph and per-PR diff against the actual
upstream base. Verify both the intended final tree and the history that will become public;
equal trees and passing tests do not establish clean history. Apply this check to supporting
repositories too. For stacked PRs, land parents first and update children so parent changes
are not published again as new changes.

## GitHub text

Preparing text does not authorize publishing it or changing Git state; keep to the requested
operation and its approval boundary.

Preserve the exact body, including real newlines and intentional literal escapes, and never let the
shell execute any of it. Pass multiline text through a quoted heredoc (`<<'EOF'`) or a body file
with `gh`'s `--body-file` option.
