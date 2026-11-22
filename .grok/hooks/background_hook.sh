#!/bin/sh
# version: 1.0.0
# Run a ported Codex hook detached. Grok hooks have no async option, and a
# SessionStart hook otherwise holds up session start until it exits.
payload=$(mktemp) || exit 0
cat >"$payload"
(
  "$HOME/.grok/hooks/bin/adapt_codex_hook" "$@" <"$payload"
  rm -f "$payload"
) </dev/null >/dev/null 2>&1 &
