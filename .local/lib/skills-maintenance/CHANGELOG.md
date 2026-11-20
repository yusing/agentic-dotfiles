# Changelog

## 1.5.0

Take base prompt snapshots from Mekugi's installed model catalog instead
of the standalone Codex cache.

## 1.4.0

Commit per-model base prompt snapshots from the local Codex cache on the
existing hourly schedule. The snapshot step makes no model calls and leaves
local edits and unrelated staged changes alone.

## 1.3.0

Remove update dispatch, version tracking, and placeholder handling for the uninstalled
Graphify skill. Keep remote skills and OpenAI Docs maintenance unchanged.

## 1.2.0

Keep the local Graphify skill in step with its locked graphifyy CLI version.
Dispatch updates and validate their committed baseline and resources.

## 1.1.0

Track the managed OpenAI Docs skill's upstream directory in openai/codex. Dispatch changed
trees to the existing Terra maintenance workflow, preserving local policy and multi-file
adaptations. Require a validated, committed baseline before reporting an update complete;
leave dirty skill owners untouched and continue independent remote maintenance on failure.

## 1.0.0

Check remote skills on the existing skills-mgr cache schedule. Dispatch stale-patch and
missing-upstream repairs to headless gpt-6.1-terra Mekugi agents, with an agent-authored
rolling maintenance log. Commit generated remote placeholder updates separately.
