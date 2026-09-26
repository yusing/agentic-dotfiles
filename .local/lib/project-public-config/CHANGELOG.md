# Changelog

## 1.3.3

Publish the source-bound terminal paste implementation instead of the retired X selection and dependency lock.

## 1.3.2

Publish clip-session sources and locked build inputs instead of retired push helpers, watcher sources, and service units.

## 1.3.1

Include the Go quality hook source and changelog alongside its published hook
registration and compilation inputs.

## 1.3.0

Include the image-paste helpers the projected `setup.sh` already drives: `clip-push`,
`clip-recv`, the `clip-watch` macOS watcher, their changelogs, and the three
`clip-*.service` user units. Before this, `configure_image_paste` ran in the public
projection against helpers and units that were not published with it.

Replace Tailscale CGNAT addresses (100.64.0.1/10) with the `100.64.0.1` placeholder,
since `clip-push`'s default target names one of the author's own hosts. Also treat
`.service` as text, so the units are rewritten and validated rather than copied as
opaque bytes.

## 1.2.8

Include the Mise lock sidecars that hold Python tool dependency graphs, so the
public lock installs with matching digests.

## 1.2.7

Include the login Bash profile so the public projection retains the Mise shim
PATH setup used by Codex commands.

## 1.2.6

Keep public Codex settings when the source uses quoted TOML keys and dotted
quoted table names.

## 1.2.5

Include the Kilo agent-port context, renderer source, changelog, and generated
global agent profiles. Keep the compiled Kilo helper binary out of the projection.

## 1.2.4

Include the shared instruction-authoring task document and remove the redundant root context
and its route.

## 1.2.3

Match complete private IPv4 addresses without rejecting SNMP object identifiers
in skill examples. Continue rejecting addresses followed by ports or punctuation.

## 1.2.2

Remove the retired Go-guidelines hook from the public projection.

## 1.2.1

Include the conditional collaboration and GitHub text guidance referenced by shared instructions.

## 1.2.0

Project explicitly marked local-only Markdown blocks instead of rewriting context prose.
Reject malformed blocks before destination writes and keep disclosure checks unchanged.
Include session-start context source and the Claude-role renderer's source and changelog
instead of its machine-specific binary.

## 1.1.18

Remove the retired route-execution skill from the public projection.

## 1.1.17

Remove the retired assess-change-impact skill from the public projection.

## 1.1.16

Include the dedicated instruction-authoring context and route public instruction audits to it.

## 1.1.15

Remove the retired small-task document from the projection allowlist.

## 1.1.14

Include the incremental helper compiler source needed by the setup compile bootstrap.

## 1.1.13

Project the renamed `route-execution` skill from the managed skill store.

## 1.1.12

Project only maintained hook sources.

## 1.1.11

Project only Kaku’s maintained Lua configuration, keeping session and private settings excluded. Treat the Kaku config as text for home-path normalization and disclosure checks.

## 1.1.10

Claim unowned destination files that already match the projection instead of refusing them.

## 1.1.9

Include the home-path rewrite helper source and locked parser dependencies required by setup.

## 1.1.8

Remove the complete private Go-proxy selection function from projected setup scripts.

## 1.1.7

Omit the README’s Managing packages section, including nested subsections, from the public projection.

## 1.1.6

Include the setup package configuration and installer changelog in the public projection.

## 1.1.5

Stop treating `pi-orc` as a private shell-line token.

## 1.1.4

Strip private shell lines from `setup.sh`, including GOPROXY and `.pve` hosts.

## 1.1.3

Project `scriptc-compiler` from `.skills-mgr/skills/`.

## 1.1.2

Project `orchestrated-workflow` from `.skills-mgr/skills/` rather than `.codex/skills/`.

## 1.1.1

Project `.codex/hooks/lib/flock.ffi.json` with the lock helper.

## 1.1.0

Project the compiled-TypeScript hook sources, shared hook libraries,
`CONTEXT-HELPER-HOOKS.md`, and `compile-agent-tools`. Drop retired Python hook
paths from the public projection. The runnable form is a `bun build --compile`
binary; source lives at `.local/lib/project-public-config/project-public-config.ts`.

## 1.0.0

Initial versioned public-configuration projector.
