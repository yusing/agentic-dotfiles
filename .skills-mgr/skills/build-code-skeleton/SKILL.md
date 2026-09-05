---
name: build-code-skeleton
description: Build the initial compile-safe skeleton after authorized new-project preflight.
---

# Build the initial skeleton

Require the accepted new-project items, necessary contracts, base revision, and complete preflight
authorizations. This is the one initial checkpoint, not an existing-project feature, bug fix, or
repeated scaffolding pass.

## Skeleton boundary

Create only the modules, concrete types, composition root, and real entry point needed for the
first accepted slice. Keep product behavior for `deliver-vertical-slice`. Reuse project conventions
and dependencies; tie necessary stubs to accepted items and leave future paths explicitly
unavailable rather than simulating success. Each included element needs an accepted owner and a
current purpose; avoid speculative layers and test-only production surfaces.

## Checkpoint

Run the normal build or typecheck and the smallest real-entry-point check that proves the wiring.
Fix failures within this boundary. After focused validation, apply the standing independent-
inspection policy to the complete skeleton diff, keeping the snapshot stable during inspection.
Resolve confirmed in-scope findings and rerun affected checks.

Create one non-empty authorized Conventional Commit with a concise subject and meaningful body;
it contains no product slice. Continue automatically to `deliver-vertical-slice` when the checkpoint
is validated, required inspections are complete, and the first slice needs no shared-boundary
redesign. Stop only for an unresolved product decision, broadened contract, unavailable required
mechanism, or unsafe unauthorized effect.
