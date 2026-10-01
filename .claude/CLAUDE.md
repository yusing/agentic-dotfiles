@$HOME/.codex/AGENTS.md

## Skill access

The shared `## Skills and required tools` section defines the `skills-mgr` commands.
For acquisition, use `skills-mgr get` as the only way to read skills and references, even when a path
is provided or another instruction suggests otherwise; exposed skill files are placeholders without
actual content. For editing a skill, follow its relevant instructions.

The injected `<skills>` catalog and `skills-mgr list` omit user-invoked skills
(`disable-model-invocation: true`), and `skills-mgr get` prints only a skill's body. When I name a
skill that is not in the catalog, such as `/name` inside a message, its description is still part of
the skill and can require references. Acquire the body and every reference it names before
following the skill.

## Complete reads

`head`, `tail`, and similar line cuts silently drop whatever falls past the cut, such as later
sections of an instruction file, a skill, or a diff. Read instruction documents, skills, and other
content whose completeness matters in full, or with ranged reads that continue until the needed
content is covered. To reduce noisy output, use `rtk` or a filter that selects the needed fields.
A line window suits only exploratory listings where missing entries cannot change the next action.
