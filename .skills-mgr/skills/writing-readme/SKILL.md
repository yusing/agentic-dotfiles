---
name: writing-readme
description: Write, rewrite, improve, or review README.md files for the repository's actual audience and use case.
---

# Writing README

A README helps readers understand the project, judge its fit, and reach a useful
outcome. Organize it around those decisions, not the sequence of implementation
changes. Concision means removing distractions while preserving explanations.

## Route

1. Establish the intended reader, their useful outcome, and the requested scope.
   For maintenance, identify which reader-facing claims the change affects before
   deciding whether an edit is needed. Ask only when an unresolved audience choice
   would materially change the result.
2. Read the one matching preset:
   - User-facing application or service: [references/application.md](references/application.md)
   - Library, SDK, or package: [references/library.md](references/library.md)
   - Command-line tool or automation: [references/cli.md](references/cli.md)
   - Dotfiles, setup, or reusable configuration: [references/configuration.md](references/configuration.md)
   - Curated resources, examples, templates, or documentation: [references/collection.md](references/collection.md)
   - Personal or organization profile repository: [references/profile.md](references/profile.md)
3. Support every behavior claim with the applicable authoritative source: implementation,
   metadata, configuration, user-facing help, examples, or owning documentation. Read only
   what the claim needs. Inspect an exemplar when the user requests a matching style.
4. Revise the affected reader journey as a whole: explanations, headings,
   examples, options, and cross-references must describe the same final behavior.
   Use the maintenance and cleanup criteria below; an internal change may need
   no README edit, while a removed workflow may need deletions in several sections.
5. Check both usefulness and correctness using the completion criteria below.

For a hybrid repository, choose the preset matching the primary reader outcome.
Load another preset only when a genuinely separate audience or interface also needs
a path through the README. When no preset fits, derive the structure directly from
the intended reader instead of forcing the nearest case. When revising an existing
README, preserve accurate, useful material while applying the matching preset's
priorities.

## Content placement

- Open with project identity, intended reader, concrete purpose, and fit.
- Order sections by the reader journey, not by the repository's internal layout.
- Use exact commands and realistic examples when an executable path exists.
- State persistent, destructive, security-sensitive, or externally visible effects
  before the action that causes them.
- Keep reader-relevant defaults, limitations, and prerequisites beside the action
  or claim they qualify. Link deeper contracts without hiding information needed
  to decide whether or how to use the feature.
- Put normative acceptance criteria in specifications, implementation ownership
  and rationale in architecture documentation, and agent rules in AGENTS.md or
  its linked guidance. Use the repository's existing owners rather than creating
  a document for every edit.
- Include maintainer mechanics only when they help the intended reader contribute
  or operate the project.

## Maintenance and cleanup

Update the README when a change alters a reader-facing capability, explanation,
command, configuration, prerequisite, limitation, or observable workflow. Fix or
remove affected existing claims; adding a new correct paragraph does not repair
an old contradictory example. Internal fixes with unchanged reader-facing behavior
belong in their owning code or technical documentation, not a new README section.

For cleanup, distinguish useful explanation from implementation detail. Preserve
accurate examples, feature distinctions, and user-requested categories. Explain
what a feature does and what the reader sees or gains; a label such as “subagent
activity” is not a replacement for that explanation. Remove repetition and move
deep reference material behind descriptive links. A shorter line count is not a
completion criterion, and rejecting clutter does not mean omitting future useful
updates.

## Completion criteria

- A reader without the session history can understand the project's fit, its
  meaningful features, and the first useful action, including important effects
  and limitations. Summarizing the result internally from the README should not
  require filling in missing explanations from the implementation or conversation.
- Every retained claim affected by the change agrees with the final behavior,
  including headings, examples, defaults, and linked workflow descriptions.
- Verify runnable examples, local links and anchors, names, prerequisites, side
  effects, and placeholders against their authoritative sources. Run applicable
  focused documentation checks and report what remains unverified. Syntax and
  link checks establish mechanical correctness, not reader usefulness.
