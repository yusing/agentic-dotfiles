---
name: new-project
description: Start a new software project through accepted specification, skeleton, complete delivery, and final review.
---

# Start an automated project

This workflow is for a new software project, not an existing-project feature, bug fix, diagnosis,
or question.

## Preflight

Resolve material product decisions and fix the working directory, accepted outcome, interfaces,
constraints, non-goals, toolchain, base revision, complete item set, and required checks. Confirm
that the native roles required for final review are available.

Before unattended work, obtain any missing authorization for repository writes, Conventional
Commits, fixup commits, autosquash, and external or destructive effects. Reuse granted permissions.
Begin only when the remaining workflow can run without further product or permission decisions.

## Specification and contracts

Give each accepted item one indexed file with a stable ID, observable acceptance examples, exact
user-visible surfaces, constraints, and non-goals. Keep facts with one authoritative owner and
reference related items. Every accepted capability must remain testable and mutually consistent.

Record necessary shared ownership, dependency direction, interfaces, data lifecycle, trust, and
failure propagation in one contract file per item. Existing code or contracts may already settle
an architectural decision; leave those artifacts unchanged rather than duplicating them. Resolve
material ambiguity before implementation without inventing conventional features or dependencies.

A user-confirmed specification with no remaining uncertainty needs no additional specification
inspection. Otherwise apply the standing native-inspection policy, resolving confirmed in-scope
issues without delegating user-owned decisions.

## Delivery and completion

Use `build-code-skeleton` once, then `deliver-vertical-slice` for every accepted item, followed by
`final-review` for the complete committed outcome. Carry item IDs, owning selectors, non-goals,
base revision, and authorizations through handoffs. Keep specification and contract decisions out
of implementation commits unless the accepted project requires those artifacts.

Continue automatically until final review passes, fixups are autosquashed, validation passes, and
the temporary recovery artifact is removed. Stop only for a conflict, required mechanism, or
unauthorized effect that cannot be resolved within the accepted project.
