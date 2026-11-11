# Changelog

## 1.0.1

Read ccstatusline's config-scoped usage cache before its legacy cache so locally
signed-in Claude accounts remain visible without a credentials file. Preserve
explicit cache overrides and isolate caches by the resolved Claude config path.

## 1.0.0

Show remaining usage for Codex and Claude, with 5h and W labels when both windows
are available and no label for a single window, including Claude's local fallback. Preserve private cached usage,
credential-change refreshes, reset countdowns, and Codex banked weekly resets.
