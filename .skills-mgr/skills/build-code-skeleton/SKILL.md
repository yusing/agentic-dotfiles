---
name: build-code-skeleton
description: Build the one initial compile-safe skeleton for an authorized new-project workflow. Use only after new-project preflight; do not use for an existing-project feature, bug fix, diagnosis, question, or repeated scaffolding.
---

# Build the initial skeleton

## Boundary

- Require the accepted new-project item set, necessary contracts, base revision, and complete preflight authorizations; treat any missing prerequisite discovered after automation starts as an unresolvable blocker.
- Create only the initial modules, concrete types, composition root, and real entry point needed for the first accepted slice; add no product behavior, speculative layer, fake success, alternate route, or test-only production surface.
- Apply the active ownership and complexity gate to each boundary or scaffold element; keep only what an accepted item needs, without dropping that item.

## Build and validate

- Reuse project conventions and dependencies, keep unavoidable future paths explicitly unavailable, and tie each necessary stub to an accepted item.
- Run the normal build or typecheck and the smallest real-entry-point execution check that proves current wiring.
- Resolve every failure within the accepted skeleton boundary automatically; stop only when correction would require a new product decision, broadened contract, unavailable mechanism, or unsafe unauthorized effect.
- Keep product behavior for `deliver-vertical-slice`; the skeleton checkpoint establishes structure only once.

## Inspect and commit

- After focused validation and before committing, apply the standing independent-inspection policy to the complete skeleton diff. When inspection is needed, use its selected native review roles and required frontend coverage; keep the inspected snapshot stable until they finish.
- Validate returned items against accepted requirements and contracts, fix confirmed in-scope findings, and skip invalid or overengineered scope-broadening items. Request native review follow-ups only for corrections or unresolved findings that need inspection.
- Rerun affected checks, then create one non-empty authorized Conventional Commit with a concise subject and meaningful body containing no product slice.
- Continue automatically to `deliver-vertical-slice` only after the validated skeleton commit exists.

## Completion

- The checkpoint builds or typechecks, its real entry point proves wiring, and the first slice needs no redesign of a current shared boundary.
- Every included element is used now, has an accepted owner, and passed the `N/O/D/I/U/J` gate as `J`.
- Required inspections, validation, and the authorized commit must finish before delivery begins.
- Report only an unresolvable blocker; otherwise complete the checkpoint and continue.
