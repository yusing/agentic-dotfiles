---
name: create-skill
description: Create a user-authored skill in this home-directory repository and register it with skills-mgr.
disable-model-invocation: false
---

# Create Skill

Paths are relative to `$HOME`. Write the content by `.codex/SKILL-AUTHORING.md`, with ownership
and consumer checks from `.codex/INSTRUCTION-AUTHORING.md`. Before choosing a name and
description, compare neighbors in `skills-mgr list` and the `## Agent Skills` table in
`README.md`; extend an existing skill instead when the new purpose overlaps it.

## Content

- Place the skill at `.skills-mgr/skills/<name>/SKILL.md`. Use a lower-case kebab-case name that
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

Add `"<name>": { "enabled": <value> }` to `skills` in `.skills-mgr/.skills-mgr.json`, keeping keys
sorted. `<value>` is `true`, `false`, or a Bash condition string evaluated from the project
directory, where exit status 0 enables the skill. Beyond ordinary commands, conditions can use
the builtins `lang <language>`, `has_dependency <name> ['<range>']`, and `tooling <name>`; for
example `"lang go"`, `"lang js || lang ts"`, or `"[ \"$PWD\" == \"$HOME\" ]"` for home only.
The skills-mgr README's `Conditional Expressions` section, in its Go module source, lists the
supported languages and range syntax.

skills-mgr, not the author, writes the frontmatter-only placeholders under
`.agents/skills/<name>/` and `.claude/skills/<name>/`. A background refresh, started by any
`skills-mgr` command once the previous cycle is at least five minutes old, creates and stages
them. They are tracked, so include them in the change once they appear.

Add a row to the `## Agent Skills` table in `README.md`, in name order, with source `Shared`,
a short purpose, whether the model can see it, and its condition in plain words.

## Validation

- From a directory where the condition should hold, `skills-mgr list --claude` shows the skill
  with the intended description (unless the model cannot invoke it), and `skills-mgr get <name>`
  prints its content.
- For a conditional skill, `skills-mgr get <name>` from a nonmatching directory reports it
  disabled.
- Every referenced file resolves through `skills-mgr get <name>/<relative-path>`.
