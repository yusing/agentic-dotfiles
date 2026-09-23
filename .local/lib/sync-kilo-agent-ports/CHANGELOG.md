# Changelog

## 1.0.2

- Map Codex GPT-6 Sol to Kilo's OpenAI model and GPT-6 Luna to DeepSeek Flash, and adapt their model identity text.

## 1.0.1

- Disable Kilo's user-facing built-in agents with generated `disable: true` stubs in the same agent directory.

## 1.0.0

- Compile the Kilo role-port helper with Bun and read each complete native role from its TOML developer instructions.
- Map Codex Luna to `kilo/deepseek/deepseek-v4.1-flash` and keep Sol and Astra under the Kilo OpenAI provider.
- Preserve Kilo permission allowlists, parent-model inheritance for council seats, and Codex reasoning variants.
- Validate all sources before writing; keep `--check` side-effect-free.
