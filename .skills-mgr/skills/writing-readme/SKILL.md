---
name: writing-readme
description: Write, rewrite, improve, or review README.md files for the repository's actual audience and use case.
---

# Writing README

A README helps readers understand the project, judge its fit, and reach a useful
outcome. Organize it around those decisions. Preserve explanations and examples
that help readers, rather than aiming for a shorter document.

## Reader-facing content

Make the purpose, meaningful capabilities, and first useful action clear to someone
without session history. Keep prerequisites, defaults, limitations, and important
side effects beside the claims or commands they qualify. Link deeper technical and
maintainer detail when it serves a separate audience.

For maintenance, update the affected explanations, examples, and links together.
Internal changes with no reader-visible effect may need no README edit. Keep agent
rules and implementation contracts with their existing owners.

Check changed claims and runnable examples against their authoritative sources.
The result should be both accurate and usable, not merely pass a link checker.

## Audience references

Consult the relevant reference when choosing a structure or covering an unfamiliar
repository type. These are starting points, not required section lists:

- [Application or service](references/application.md)
- [Library, SDK, or package](references/library.md)
- [Command-line tool or automation](references/cli.md)
- [Dotfiles or reusable configuration](references/configuration.md)
- [Curated resources or examples](references/collection.md)
- [Personal or organization profile](references/profile.md)
