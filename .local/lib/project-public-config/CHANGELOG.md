# Changelog

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
