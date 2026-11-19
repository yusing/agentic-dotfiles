# Changelog

## 2.0.0

- Use one generator for Claude, Kilo, and Antigravity role files.
- Embed Antigravity's subagent guidance only in its generated roles.

# Claude port history

## 1.0.15

- Remove `Skill` from every role's tool allowlist; roles acquire skills through skills-mgr, and settings deny the native Skill tool.

## 1.0.14

- Leave model and effort unset in every Claude role so the spawning agent can route each assignment.

## 1.0.13

- Take each role's Claude model and effort from Claude metadata, now that Codex roles leave model and effort to the spawning agent; remove the Codex model mapping and reject a Codex role that pins either.

## 1.0.12

- Map Codex GPT-6.1 Terra roles to Claude Sonnet.

## 1.0.11

- Remove worker role metadata after retiring the support-artifact role.

## 1.0.10

- Preserve native command-boundary guidance without adding a runtime-enforcement guarantee; retain Bash hook registration.

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

# Kilo port history

## 1.0.9

- Route Kilo Sol and Astra roles to GPT-6.2 while preserving their reasoning variants.

## 1.0.8

- Keep Kilo's built-in code agent enabled. Remove its former generated disable stub during synchronization while preserving authored code profiles; check mode reports the obsolete stub without deleting it.

## 1.0.7

- Take each role's Kilo model and variant from Kilo metadata, now that Codex roles leave model and effort to the spawning agent; remove the Codex model mapping and reject a Codex role that pins either.

## 1.0.6

- Map Codex GPT-6.1 Terra roles to Kilo's matching OpenAI model id.

## 1.0.5

- Remove worker role metadata after retiring the support-artifact role.

## 1.0.4

- Port the investigator role and rename web-reviewer to ui-reviewer.

## 1.0.3

- Map Codex GPT-6.1 Sol roles to Kilo's matching OpenAI model id.

## 1.0.2

- Map Codex GPT-6 Sol to Kilo's OpenAI model and GPT-6 Luna to DeepSeek Flash, and adapt their model identity text.

## 1.0.1

- Disable Kilo's user-facing built-in agents with generated `disable: true` stubs in the same agent directory.

## 1.0.0

- Compile the Kilo role-port helper with Bun and read each complete native role from its TOML developer instructions.
- Map Codex Luna to `kilo/deepseek/deepseek-v4.1-flash` and keep Sol and Astra under the Kilo OpenAI provider.
- Preserve Kilo permission allowlists, parent-model inheritance for council seats, and Codex reasoning variants.
- Validate all sources before writing; keep `--check` side-effect-free.
