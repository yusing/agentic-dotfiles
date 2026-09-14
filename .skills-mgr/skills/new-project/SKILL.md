---
name: new-project
description: Start a new software project with accepted requirements and a delivery approach proportional to its capabilities.
---

# Start a new project

Turn the accepted requirements into a usable new software project. This skill is for
new projects, not changes to an existing one.

## Define the outcome

Settle the working directory, material product decisions, constraints, and observable
acceptance examples. Record shared interfaces and architectural decisions where they
affect delivery. A bounded project can use the confirmed request as its specification;
a larger project needs a durable account of its accepted capabilities and non-goals,
without a prescribed document layout.

## Choose delivery

- **Direct:** implement and validate the complete usable outcome under standing task guidance.
- **Staged:** use `deliver-vertical-slice` when intermediate end-to-end capabilities help
  delivery, not simply because the project has many files or layers. Use `build-code-skeleton`
  first only when proving shared wiring separately materially helps; otherwise establish
  the wiring in the first usable slice.

Before staged work begins, establish the base revision and authorization for its commits,
fixups, and autosquash under `deliver-vertical-slice`'s invocation rules. Establish the single
recovery record defined there at staged entry, and carry it through every checkpoint,
including the skeleton when used. The delivery owner maintains it through completion.

Complete the chosen approach, including required validation and inspection, so the result
is usable rather than merely scaffolded.
