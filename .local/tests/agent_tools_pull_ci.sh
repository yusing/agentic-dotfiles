#!/bin/sh
# Usage: sh .local/tests/agent_tools_pull_ci.sh /absolute/export-directory
set -eu
export_dir=$(realpath "${1:?provide the image export directory}")
test_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
fixture_dir=$(mktemp -d /var/tmp/agent-tools-oci-ci.XXXXXX)
trap 'rm -rf -- "$fixture_dir"' EXIT HUP INT TERM
mkdir "$fixture_dir/context"
for binary in bwrap squashfuse zsync zsyncmake; do
  cp "$export_dir/$binary" "$fixture_dir/context/$binary"
done
# The context contains four runtime utilities, never the production SquashFS.
timeout --kill-after=10s 300s docker buildx build \
  --file "$test_dir/agent_tools_pull_fixture.Dockerfile" \
  --output "type=local,dest=$fixture_dir/images" "$fixture_dir/context"
export PATH="$export_dir:$PATH"
export AGENT_TOOLS_TEST_BINARY="$export_dir/agent-tools"
export AGENT_TOOLS_TEST_RUNTIME="$export_dir"
export AGENT_TOOLS_TEST_HOOK="$export_dir/hook-codex-session_start_context"
export AGENT_TOOLS_TEST_HOSTLIB="$export_dir"
export AGENT_TOOLS_TEST_HOST_FISH="$export_dir/host-fish"
export AGENT_TOOLS_TEST_IMAGE="$fixture_dir/images/old.sqfs"
export AGENT_TOOLS_TEST_NEW_IMAGE="$fixture_dir/images/new.sqfs"
export AGENT_TOOLS_TEST_CONTROL="$fixture_dir/images/new.sqfs.zsync"
unset AGENT_TOOLS_RUNTIME AGENT_TOOLS_UPDATER
timeout --kill-after=10s 150s bun test "$test_dir/agent_tools_pull_test.ts"
