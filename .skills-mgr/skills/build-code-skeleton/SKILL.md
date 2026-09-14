---
name: build-code-skeleton
description: Build the initial compile-safe skeleton after authorized new-project preflight.
---

# Build the initial skeleton

Create an initial checkpoint when an authorized staged `new-project` workflow benefits
from proving shared wiring separately. Use its accepted capabilities, contracts, base
revision, and existing recovery record.

Wire the real entry point and only the modules and types needed for the first slice.
Keep product behavior for `deliver-vertical-slice`; necessary stubs should be visibly
unavailable rather than simulate success.

The checkpoint must build or typecheck and run through its real entry point far enough
to demonstrate the wiring. Apply standing validation and independent-inspection guidance.

Create one authorized Conventional Commit for the skeleton and record the checkpoint and
validation in the existing recovery record. Continue automatically to `deliver-vertical-slice`
with that record and the original base revision.
