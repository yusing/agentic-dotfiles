# Changelog

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
