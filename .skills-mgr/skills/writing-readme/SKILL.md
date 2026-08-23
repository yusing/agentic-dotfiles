---
name: writing-readme
description: Write, rewrite, improve, or review README.md files for the repository's actual audience and use case.
---

# Writing README

A README is the entry point to a reader's intended use of a repository. Let that
reader and use case determine the content instead of forcing every repository into
the same manual.

## Route

1. Establish the intended reader and what they should understand or accomplish.
   Use the request and repository evidence. Ask before drafting when this choice is
   unresolved and would materially change the README.
2. Read the one matching preset:
   - User-facing application or service: [references/application.md](references/application.md)
   - Library, SDK, or package: [references/library.md](references/library.md)
   - Command-line tool or automation: [references/cli.md](references/cli.md)
   - Dotfiles, setup, or reusable configuration: [references/configuration.md](references/configuration.md)
   - Curated resources, examples, templates, or documentation: [references/collection.md](references/collection.md)
   - Personal or organization profile repository: [references/profile.md](references/profile.md)
3. Gather evidence for every behavior claim from implementation, metadata,
   configuration, user-facing help, examples, and owning documentation. Inspect an
   exemplar when the user requests a matching style.
4. Write the shortest path from the opening promise to the reader's first useful
   outcome, then add only the reference material that supports repeated use.
5. Verify runnable examples, local links, names, defaults, side effects,
   prerequisites, and placeholders. Run the repository's focused documentation
   checks and report what remains unverified.

For a hybrid repository, choose the preset matching the primary reader outcome.
Load another preset only when a genuinely separate audience or interface also needs
a path through the README. When no preset fits, derive the structure directly from
the intended reader instead of forcing the nearest case. When revising an existing
README, preserve accurate, useful material while applying the matching preset's
priorities.

## Shared Rules

- Open with project identity, intended reader, concrete purpose, and fit.
- Order sections by the reader journey, not by the repository's internal layout.
- Use exact commands and realistic examples when an executable path exists.
- State persistent, destructive, security-sensitive, or externally visible effects
  before the action that causes them.
- Link exhaustive contracts and deeper documentation instead of copying them.
- Include maintainer mechanics only when they help the intended reader contribute
  or operate the project.
- End with no unsupported claims, stale links, borrowed sections, or empty headings.
