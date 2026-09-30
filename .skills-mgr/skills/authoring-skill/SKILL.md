---
name: authoring-skill
description: Author, create, update, review, or rename agent skills from any project, including skills-mgr registration and public projection.
disable-model-invocation: false
---

# Authoring Skill

Use this skill for skill authoring and maintenance, whether the current directory is home
or another project. This skill's global availability does not make authored skills global.
Home paths below are relative to `$HOME`; repo paths are relative to the target repository.

## Scope and known owners

Preserve an existing skill's scope. For a new skill, repo-specific behavior belongs in the repo;
use global scope for intentionally reusable cross-project guidance, not merely because this
skill is globally available.

| Scope | Content owner | Selection |
| --- | --- | --- |
| Global/shared | `$HOME/.skills-mgr/skills/<name>/SKILL.md` | `$HOME/.skills-mgr/.skills-mgr.json` |
| Repo-local | `<repo>/.agents/skills/<name>/SKILL.md`, or the repo's established skill owner | `<repo>/.skills-mgr.json` when an override is needed |

Repo-local `.agents/skills` content is enabled by default without a selection entry. Project
selection overrides global selection; enabling shared content for one repo does not require
enabling it globally. Keep repo skill content in the repo so it travels with that repository.

- Authoring guidance: `$HOME/.codex/SKILL-AUTHORING.md` and
  `$HOME/.codex/INSTRUCTION-AUTHORING.md`.
- Home-managed inventory only: the `## Agent Skills` table in `$HOME/README.md`.
- Home public projection only: `PROJECTED_SKILL_NAMES` in
  `$HOME/.local/lib/project-public-config/project-public-config.ts`; its fixture coverage is in
  `$HOME/.local/tests/project_public_config_test.ts`.

Start at the named owner for the requested operation. These locations and the procedures below
replace tool/source discovery; investigate further only when an owner is missing or the observed
behavior contradicts them. Compare neighboring skills only when choosing a new purpose or
resolving actual overlap. Repo-only changes do not need home inventory or projection edits.

## Content

- Use the content owner for the selected scope and a lower-case kebab-case name that
  matches both the directory and the frontmatter `name`. `skills-mgr get` falls back to
  Claude plugin and Grok native skills when the managed one is disabled, so a name shared with
  an enabled native skill serves that skill instead; choose another name or disable the native one.
- Frontmatter holds `name`, `description`, and `disable-model-invocation`. Set the latter to
  `true` only for a user-invoked skill: `list` then omits it, while `get` and `run` still serve
  it by name.
- Put optional material under the skill directory, such as `references/` or `scripts/`.
  Agents read it with `skills-mgr get <name>/<relative-path>` and run scripts with
  `skills-mgr run <name>/<relative-path>`, so refer to these files by path relative to the
  skill root.

## Registration

Add or update `"<name>": { "enabled": <value> }` in the applicable registry's `skills` object,
keeping keys sorted. `<value>` is `true`, `false`, or a Bash condition string evaluated from the project
directory, where exit status 0 enables the skill. Beyond ordinary commands, conditions can use
the builtins `lang <language>`, `has_dependency <name> ['<range>']`, and `tooling <name>`; for
example `"lang go"`, `"lang js || lang ts"`, or `"[ \"$PWD\" == \"$HOME\" ]"` for home only.
The skills-mgr README's `Conditional Expressions` section, in its Go module source, lists the
supported languages and range syntax.

For managed shared content, skills-mgr writes frontmatter-only placeholders under
`.agents/skills/<name>/` and `.claude/skills/<name>/`. These generated placeholders are not
repo-local authored content; distinguish them by `.skills-mgr-placeholder`. A background refresh, started by any
`skills-mgr` command once the previous cycle is at least five minutes old, regenerates
them and may stage them. Include the affected placeholders in the change once they appear.
`skills-mgr refresh-runner` runs that refresh directly when immediate regeneration is needed;
it also refreshes due remote skills and registry caches. Inspect and report unrelated refresh edits.

For home-managed skills, add or update a row in the `## Agent Skills` table in `README.md`, in name order, with source `Shared`,
a short purpose, whether the model can see it, and its condition in plain words.

## Renames and public projection

For any rename, move the owning directory and align frontmatter, applicable selection keys, and
references in the owning scope. For home-managed skills, also update the home inventory row.
Refresh managed placeholders through skills-mgr rather than editing them.
A direct filesystem rename can leave the old placeholders behind: remove only the superseded
`SKILL.md` and `.skills-mgr-placeholder` files in the old `.agents/skills/<name>/` and
`.claude/skills/<name>/` directories, then remove those directories if empty.
For a published skill, rename its entry in `PROJECTED_SKILL_NAMES` and its projector fixture.
The projector's version and `CHANGELOG.md` live alongside its source; rebuild with
`.local/bin/compile-agent-tools` and validate with
`bun test ./.local/tests/project_public_config_test.ts` from home.
The projector reads committed revisions, not working-tree edits, so updating its selection is
separate from publishing the changed content.

## Validation

- From a directory where the condition should hold, `skills-mgr list --claude` shows the skill
  with the intended description (unless the model cannot invoke it), and `skills-mgr get <name>`
  prints its content.
- For a repo-local or conditional skill, `skills-mgr get <name>` from a nonmatching directory does not expose it (unavailable or disabled).
- Every referenced file resolves through `skills-mgr get <name>/<relative-path>`.
