#!/bin/sh
# version: 1.1.0
# Runtime and changelog: .local/lib/batch-agent-sessions/.
set -eu
exec "${HOME:?HOME must be set}/.local/bin/batch-agent-sessions" "$@"
