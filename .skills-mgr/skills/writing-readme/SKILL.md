---
name: writing-readme
description: Write, rewrite, update, or review README.md files for the repository's actual audience and use case, including README edits that accompany a code change.
---

# Writing README

A README helps readers judge the project and reach a useful outcome without
session history. Its quality depends on useful, accurate content, not its length.
Preserve explanations and examples that serve those decisions.

## Reader and evidence

Identify the reader, the software's operator, and the scope of each action. They
can differ: a human may read about a command invoked by an agent. Name the agent,
thread, workspace, or account whose state the command uses instead of calling all
of it “your” state. Preserve the project's established voice and terminology.

Ground affected claims in supported behavior, authoritative source, public
interfaces, and user-facing specifications. Distinguish available behavior from
planned work. Gather evidence for the requested change; a narrow README edit does
not require a repository-wide audit.

When asked what changed since a README update or commit, establish that baseline,
the relevant changes, and what the README already covers before proposing
additions. Separate new capabilities, improvements to existing ones, fixes, and
inherited upstream behavior. A chronological change list is evidence for the
selection, not the README's structure.

## Features that help readers choose

Make the purpose, meaningful capabilities, and first useful action clear. When
Features is present or requested, keep it useful for attraction: concrete benefits
with enough detail to judge fit, linked to usage where needed. When reviewing
capability coverage or catching up documentation, check for missing meaningful
capabilities, not only whether existing bullets need different wording.

Describe ordinary or inherited behavior where readers need it for use. Present
it as a distinctive feature only when the project adds a meaningful benefit.
Use mode names and comparisons only for supported alternatives that help readers
choose; internal adapter names do not establish separate user-facing modes.

## Usage at the reader's level

Give commands and non-obvious options a use case, the affected scope, and an
expected result. A flag table alone does not explain when to use the flag. Keep
prerequisites, important defaults, limitations, and side effects beside the claim
or example they qualify, especially before commands that change state.

Describe observable behavior and consequences. Put calculation inputs, tuning
thresholds, event ordering, storage identities, and other implementation contract
detail in their existing technical owners, with a focused link when useful.
Retain a technical detail in the README when it changes a reader's choice, action,
or interpretation of the result. A shorter paragraph that hides a necessary
limitation or removes a useful example is not an improvement.

## Maintenance without accumulation

Integrate each change at its existing topic. Keep one complete setup or workflow
explanation and link to it from summaries and related sections. Features can
summarize a benefit without repeating its configuration and caveats. Update
affected summaries, examples, navigation, and links together; remove superseded
claims rather than append the latest implementation story.

Place content by who uses it: everyday controls, launch, resume, and configuration
belong with usage even when added during development. Development sections serve
contributors. Internal changes with no reader-visible effect may need no README
edit. Keep agent rules and implementation contracts with their existing owners.

## Reader check

Read the changed topics with their affected summaries and examples as the intended
reader. Can they judge the capability, choose the right path, identify whose state
is affected, and understand the result? Check changed claims and runnable examples
against their authoritative sources. Verify links after moving content. A passing
link check establishes navigation, not accuracy, completeness, or usability.

## Audience references

Choose by the reader's primary task, not the implementation language, package
manager, or presence of an executable. An interactive terminal application is not
a command utility just because it launches from a shell. For mixed repositories,
combine only the guidance that serves the affected reader path. The outlines are
options, not required section lists or whole-repository evidence checklists.

The guides link real project READMEs and explain useful patterns to borrow. When
choosing an unfamiliar structure, inspect a relevant example's actual README,
including its media, section order, examples, and documentation links. Use web
search when a fitting example is missing or an external comparison is requested.
Popularity helps find examples; accuracy and reader fit determine what to adopt.

- [Interactive developer tool, editor, or TUI workbench](references/developer-tool.md), including coding-agent frontends such as Mekugi
- [End-user application](references/application.md), including desktop, web, and mobile apps
- [Infrastructure, server, or service platform](references/infrastructure.md), for operators and teams deploying or connecting to a service
- [Library, SDK, framework, or plugin](references/library.md), for developers integrating a public interface
- [Command utility or automation](references/cli.md), for readers choosing commands, inputs, and outputs
- [Starter, scaffold, or project template](references/starter.md), for readers creating and customizing a new project
- [Dotfiles or reusable configuration](references/configuration.md), for readers adopting or adapting an existing setup
- [Curated resources or examples](references/collection.md)
- [Personal or organization profile](references/profile.md)
