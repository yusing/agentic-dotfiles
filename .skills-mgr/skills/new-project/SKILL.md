---
name: new-project
description: Start a new software project through an automated specification, contract, skeleton, delivery, and final-review workflow. Use only when the user requests a new project; do not use for a bug fix, diagnosis, question, or a feature in an existing project.
---

# Start an automated project

## Preflight

- Before automation starts, resolve every material product decision with the user and obtain explicit authorization for repository writes, required Git-agent inspections and follow-ups, Conventional Commits, fixup commits, autosquash, and any external or destructive effect.
- Fix the working directory, accepted outcome, public interface, constraints, non-goals, toolchain, base revision, and complete item set; follow the active Git-agent hook instructions without restating them.
- Start only when every required decision and authorization is settled. After starting, run every stage without manual intervention and stop only for an unresolvable blocker.
- Preserve established project behavior and tools; add no conventional command, option, configuration, service, dependency, discovery, or persistence that the accepted outcome does not require.

## Specify and contract

- Record the smallest cohesive specification with stable item IDs, observable acceptance examples, exact user-visible surfaces, constraints, and non-goals; give each fact one authoritative owner.
- Classify every proposed capability, restriction, protection, limit, compatibility path, or shared boundary as `N/O/D/I/U/J`: external owner, overengineering, duplicated policy, unreachable, uncertain, or justified local responsibility. Only `J` proceeds; resolve `U` from owner, reproducer, immediate failure, violated invariant, and the smallest requirement.
- When the user confirmed the specification and no uncertainty or ambiguity remains, continue without external specification inspection; otherwise run pre-authorized independent inspection, correct confirmed in-scope blockers, and skip findings that invent or broaden the accepted outcome.
- Record only necessary shared ownership, dependency direction, interface shape, data lifecycle, trust enforcement, and failure propagation; leave architecture artifacts unchanged when existing code and contracts already decide them.

## Execute the project

- Use `build-code-skeleton` for the initial compile-safe checkpoint, then `deliver-vertical-slice` for every accepted item, then `final-review` for the complete committed outcome.
- Carry the accepted item IDs, exact owning selectors, non-goals, base revision, and preflight authorizations through every handoff.
- Keep specification and contract decisions outside implementation commits unless the accepted project itself requires those artifacts.
- Do not enter delivery until the next slice can be implemented without inventing a product decision or material shared boundary.

## Completion

- The preflight is complete only when the remaining workflow can run unattended with every required operation already authorized.
- The specification is complete only when all accepted items are testable, lossless, mutually consistent, and classified through the ownership gate.
- Report only an unresolvable conflict, unavailable required mechanism, unsafe unauthorized effect, or exhausted hook-permitted recovery; otherwise continue automatically.
- A successful new-project run ends only after `final-review` passes, fixups are autosquashed, validation passes, and the temporary recovery artifact is removed.
