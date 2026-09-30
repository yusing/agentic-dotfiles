# Changelog

## 1.0.9

- Port the investigator role and rename web-reviewer to ui-reviewer.
- Preserve Explorer's Claude Sonnet/high budget independently of its Codex Sol/low configuration.

## 1.0.8

- Map Codex GPT-6.1 Sol roles to their existing Claude model budgets.

## 1.0.7

- Map Codex GPT-6 Sol and Luna roles to their existing Claude model budgets and adapt their model identity text.

## 1.0.6

- Rename implementer to worker for tests, documentation, fixtures, and other support artifacts only, keeping its scoped editing and inspection tools; use Codex Luna/max with Claude Sonnet/xhigh.
- Hold explorer at Claude Sonnet/high while Codex uses Luna/max.

## 1.0.5

- Rename reviewer and simplify-checker to review-correctness and review-simplify, preserving their Claude budgets and tool boundaries.

## 1.0.4

- Consolidate implementation into the implementer role while preserving its Claude Opus/medium budget.

## 1.0.3

- Keep result-artifact write permissions in native role sources instead of injecting Claude-only policy.

## 1.0.2

- Expose nested-agent dispatch to both implementer roles for independent inspection.

## 1.0.1

- Preserve explicit Claude model budgets when a Codex role leaves its model and effort to dispatch.

## 1.0.0

- Compile the role-port helper with Bun and read each complete native role from its TOML developer instructions.
- Preserve Claude model budgets, tool allowlists, artifact-write exceptions, and shared command guards.
- Validate all sources before writing; keep `--check` side-effect-free.
