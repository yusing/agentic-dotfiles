---
name: new-project
description: Start a new software project through an automated specification, contract, skeleton, delivery, and final-review workflow. Use only when the user requests a new project; do not use for a bug fix, diagnosis, question, or a feature in an existing project.
---

# Start an automated project

## Preflight

- Before automation starts, resolve material product decisions and confirm authorization for repository writes, Conventional Commits, fixup commits, autosquash, and any external or destructive effect. Reuse authorization already granted; ask only for missing decisions or permissions.
- Fix the working directory, accepted outcome, public interface, constraints, non-goals, toolchain, base revision, and complete item set. Confirm the native review roles required for final review are available before starting unattended delivery.
- Start only when every required decision and authorization is settled. After starting, run every stage without manual intervention and stop only for an unresolvable blocker.
- Preserve established project behavior and tools; add no conventional command, option, configuration, service, dependency, discovery, or persistence that the accepted outcome does not require.

## Specify and contract

- Record each accepted item as its own indexed file with one stable ID, observable acceptance examples, exact user-visible surfaces, constraints, and non-goals; give each fact one authoritative owner and reference related items instead of copying them.
- Apply the active ownership and complexity gate to implementation choices, preserving every accepted capability. Resolve uncertain ownership or material requirements before implementation; a new capability needs acceptance evidence, not a pre-existing bug reproducer.
- When the user confirmed the specification and no uncertainty or ambiguity remains, continue without specification inspection; otherwise use native review roles under the standing independent-inspection policy. Correct confirmed in-scope blockers without delegating user-owned product decisions or broadening the accepted outcome.
- Record only necessary shared ownership, dependency direction, interface shape, data lifecycle, trust enforcement, and failure propagation as one contract file per item with references; leave architecture artifacts unchanged when existing code and contracts already decide them.

## Execute the project

- Use `build-code-skeleton` for the initial compile-safe checkpoint, then `deliver-vertical-slice` for every accepted item, then `final-review` for the complete committed outcome.
- Carry the accepted item IDs, exact owning selectors, non-goals, base revision, and preflight authorizations through every handoff.
- Keep specification and contract decisions outside implementation commits unless the accepted project itself requires those artifacts.
- Do not enter delivery until the next slice can be implemented without inventing a product decision or material shared boundary.

## Completion

- The preflight is complete only when the remaining workflow can run unattended with every required operation already authorized.
- The specification is complete only when all accepted items are testable, lossless, and mutually consistent, with implementation choices checked through the ownership gate.
- Report only an unresolvable conflict, unavailable required mechanism, or unsafe unauthorized effect; otherwise continue automatically.
- A successful new-project run ends only after `final-review` passes, fixups are autosquashed, validation passes, and the temporary recovery artifact is removed.
