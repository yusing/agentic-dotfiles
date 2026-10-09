---
name: authoring-skill
description: Author, create, update, review, or rename agent skills from any project, including skills-mgr registration and public projection.
disable-model-invocation: false
---

# Authoring skill

Use for skill maintenance in any project. Design/consumer guidance lives in
`$HOME/.codex/INSTRUCTION-AUTHORING.md` and `$HOME/.codex/SKILL-AUTHORING.md`.
Global availability of this authoring skill does not make the edited skill global.

## Owners

| Scope | Content | Selection |
| --- | --- | --- |
| Shared | `$HOME/.skills-mgr/skills/<name>/SKILL.md` | `$HOME/.skills-mgr/.skills-mgr.json` |
| Remote | `$HOME/.skills-mgr/skills/.remote-patches/<reference-key>.patch` over fetched content | Registry remote reference |
| Project | `<repo>/.agents/skills/<name>/SKILL.md` or established owner | `<repo>/.skills-mgr.json` for overrides |

Project skills are enabled by default; project selection overrides global selection. Preserve an
existing scope. Inspect the named owner, not other stores, unless it is missing or behavior
contradicts the map. `skills-mgr inspect <name>` reports owner, selection, native alternatives,
remote patch, complete-manifest SHA256, and body health; `resolved` identifies what get serves.

## Content and registration

Keep directory/frontmatter `name` in lower-case kebab-case. Frontmatter owns `name`, `description`,
and `disable-model-invocation`; true means user-invoked, omitted from list but available via get/run.
A disabled managed name may fall back to Claude/plugin or Grok native content: check the served
owner instead of assuming it is your copy.

Put optional references/scripts under the skill root and use relative links. Consumers read
`skills-mgr get <name>/<path>` or run `skills-mgr run <name>/<script>`.

For selection, use `skills-mgr set <name> true` or a condition; `-g` selects shared scope, as does
running from home. `set <name> inherit` removes an override, not inherited availability. Registry
keys stay sorted. Conditions are Bash, including `lang`, `has_dependency`, and `tooling`; their
full grammar is in the skills-mgr README's Conditional Expressions section.

For a complete replacement use `skills-mgr edit <name> --file <path|-> --expect-sha256 <digest>`
with inspect's digest. Local edits retain the directory; a renamed frontmatter updates selection
and placeholders. Remote edits write an overlay, never the fetched cache.

Managed `.agents/skills` and `.claude/skills` copies are frontmatter placeholders identified by
`.skills-mgr-placeholder`, not authored project skills. Any skills-mgr command may start a due
background refresh (five-minute interval), regenerate them, and stage edits. Include affected
placeholders and report incidental edits. Use `refresh-runner` only when immediate regeneration
is needed; it also refreshes due remote content/caches.

## Names and publication

For renames, align owning directory, frontmatter, selection, and active references. Refresh
placeholders through skills-mgr. After a direct filesystem rename, remove only superseded
SKILL.md/marker files and empty old placeholder directories.

For shared skills, add a home README `## Agent Skills` row for a new skill, and update it only when
name, purpose, visibility, or selection changes: name order, source `Shared`, plain-word condition. Project-only
edits need no home inventory/projection changes.

Published names live in `PROJECTED_SKILL_NAMES` in
`$HOME/.local/lib/project-public-config/project-public-config.ts`. Renames also change its fixture
in `$HOME/.local/tests/project_public_config_test.ts`; version/changelog sit by projector source.
Rebuild with compile-agent-tools and run `bun test ./.local/tests/project_public_config_test.ts`.
Projection reads committed revisions, not working-tree content; selection edits do not publish.

## Validation

Use `skills-mgr check <name> [<required-skill> ...] [<name>/<reference-or-script> ...]` from a
matching project. It checks the served body and Markdown links; list required dependencies/scripts
explicitly. Scripts are read, not run. Unresolved, stale-overlay, and placeholder bodies fail.
Home's mapped maintenance checks are in `$HOME/CONTEXT-VALIDATION.md`.

Verify matching selection/get and adjacent nonmatching conditions without changing selection just
for the check. `list --claude` shows model-visible descriptions; user-invoked skills remain omitted.
Each linked resource must resolve through get. Compare neighboring skills only for real purpose
overlap, not as a routine inventory step.
