# Kilo agent port

`.config/kilo/agent/*.md` ports the Codex native roles in `.codex/agents/*.toml`.
Each TOML `developer_instructions` contains the complete role and task/result
contract; the generated Markdown body carries that text with client-specific
mappings. The TOML is the design owner. Run `.local/bin/sync-kilo-agent-ports`
after changing it; do not edit generated roles by hand. The compiled helper's
source and changelog live in `.local/lib/sync-kilo-agent-ports/`. Its `--check`
mode reports drift without writing.

Field mapping is the helper's concern. `model` and `model_reasoning_effort`
become Kilo's `model` and `variant`. Codex Luna maps to
`kilo/deepseek/deepseek-v4.1-flash`. Codex Sol and Astra keep the same model
ids under `kilo/openai/`. Council roles omit both generated fields so Kilo
continues to inherit its parent settings. A new Codex role or an unmapped
model makes generation fail until that platform metadata is supplied. DeepSeek
Flash only offers `none`, `low`, `high`, and `max`, so a Luna role whose Codex
variant is outside that set also fails. The behavioral prompt and task/result
contract are read directly from the native TOML, so source edits cannot pass
the focused test while generated ports are stale.

Kilo custom agents are Markdown files with YAML frontmatter. The filename is
the agent name. Generated roles use `mode: subagent` so they are invoked through
Kilo's task tool or `@` mentions rather than replacing the user's primary
agent. Colors and permission allowlists live in the helper. Only the worker
role allows `task`, so it can dispatch independent inspections under shared
AGENTS.md. Read-only roles deny `edit` and `task`. `write` stays unspecified
on every role for a relayed result artifact, and evidence-gathering roles also
allow `bash`. These permission lists are not a filesystem sandbox: native TOML
role bodies prohibit repository writes and own the exact-path artifact
exception. The generator does not add artifact permissions.

Kilo has no Codex-hook adapter and no agent-frontmatter PreToolUse command
hook, so the shared `subagent_exec_guard` is not registered. Under this port
the command boundary rests on the role body and Kilo permissions. The helper
does not add Claude's hook sentence to the body.

The generated files live in the Kilo CLI global agent directory so every
project sees them. Project-level `.kilo/agent/` files are a separate surface
and must not shadow these roles with a third copy.


The helper also writes `disable: true` stubs for Kilo's user-facing built-in
agents: `ask`, `code`, `debug`, `explore`, `general`, `orchestrator`, and
`plan`. Those names are not Codex roles, so a stub removes the native catalog
entry instead of replacing it. `title`, `summary`, and `compaction` stay
enabled; Kilo uses them as session machinery rather than user-selectable
roles. A Codex role that later reuses a built-in name fails generation until
that collision is resolved in the helper metadata.
