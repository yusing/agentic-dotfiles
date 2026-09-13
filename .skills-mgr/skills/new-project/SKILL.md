---
name: new-project
description: Start a new software project with accepted requirements and a delivery approach proportional to its capabilities.
---

# Start an automated project

This workflow is for a new software project, not an existing-project feature, bug fix, diagnosis,
or question.

## Preflight

Resolve material product decisions and fix the working directory, accepted outcome, interfaces,
constraints, non-goals, toolchain, complete item set, and required checks. Choose direct delivery
or staged capability delivery from the accepted outcome, not the number of files or layers.

Before unattended delivery, settle material decisions and missing permissions; reuse granted
authorization. Staged delivery also needs a base revision and authorized commits, fixups, and
autosquash. Pending decisions block dependent work, not authorized preparation.

## Specification and contracts

Establish observable acceptance examples, user-visible surfaces, constraints, and non-goals.
Use the confirmed request for a bounded project; staged delivery needs indexed item files with
stable IDs. Keep facts with one authoritative owner and capabilities testable and consistent.

Record necessary shared ownership, dependency direction, interfaces, data lifecycle, trust, and
failure propagation where they affect delivery. Existing code or contracts may already settle
an architectural decision; leave those artifacts unchanged rather than duplicating them. Resolve
material ambiguity before implementation without inventing conventional features or dependencies.

A user-confirmed specification with no remaining uncertainty needs no additional specification
inspection. Otherwise apply the standing native-inspection policy, resolving confirmed in-scope
issues without delegating user-owned decisions.

## Delivery and completion

For direct delivery, implement the complete usable outcome and validate under standing task
guidance. For staged delivery of usable capabilities, use `build-code-skeleton` once, then
`deliver-vertical-slice` and `final-review`. Carry accepted items, contracts, non-goals, and
authorizations through the selected approach.

Continue until the complete outcome and required checks pass, including inspection and cleanup
required by the selected approach. Stop only for a conflict, required mechanism, or
unauthorized effect that cannot be resolved within the accepted project.
