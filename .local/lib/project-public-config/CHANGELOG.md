# Changelog

## 1.3.14

Publish the `svn-merge` shell helper. The script is the maintained source, so the
projection includes it with the other published local tools.

## 1.3.13

Synchronize a destination where a generated directory becomes a file or a generated file
becomes a directory: stale outputs occupying those paths no longer count as unowned, and they
are removed before new outputs are installed.

## 1.3.12

Publish `.codex/DOCS.md` and `.codex/TESTING.md`, which the README and the shared routing list
already point to.

## 1.3.11

Publish the Codex and Claude `REVIEW.md` task documents, which now own the post-change review
policy previously kept in `MAIN.md`.

## 1.3.10

Publish the Claude-specialized task documents under `.claude/instructions/`, which
`.claude/CLAUDE.md` now points to in place of importing `.codex/AGENTS.md`.
Publish Grok's shared-guidance rule symlink and its `[compat.claude]` settings, which keep
Grok from also loading the Claude instruction files.

## 1.3.9

Include the local Oh My Posh theme used by Fish and Zsh.
Publish the shared daily theme updater source and changelog.

## 1.3.8

Stop publishing the removed writing-for-agents skill path; its guidance now lives in the
instruction- and skill-authoring task documents.

## 1.3.7

Publish the tmp_clean helper's source and changelog alongside its build registration
and usage documentation, keeping the compiled binary out of the projection.

## 1.3.6

Publish the compiled batch-session lifecycle helper's source and changelog with its skill.

## 1.3.5

Publish authoring-skill under its renamed path in place of create-skill.

## 1.3.4

Restore the public file list: publish skill-authoring guidance, the batch-agent-sessions,
commit, create-skill, and new-agent-session skills, and changelogs for published hooks
and shell launchers. Remove retired tracked completion and read-codex-session paths.

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
