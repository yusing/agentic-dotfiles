---
name: deslop
description: Remove unjustified production-code complexity while preserving behavior, readability, and performance.
disable-model-invocation: true
---

# Deslop

Remove unjustified production-code complexity while preserving supported behavior,
readability, and performance. Simplify the system itself: denser code or moving
complexity into another file or dependency is not a reduction.

## What to look for

- Dead code, impossible branches, and stale feature support.
- Duplicate rules or transformations that belong at one authoritative owner.
- Speculative configuration, validation, or error translation outside the supported contract.
- Wrappers, caches, abstractions, and test-only production surfaces with no current purpose.

Establish why a candidate is unnecessary from its callers and contracts. Account for
indirect consumers such as registration, reflection, and public APIs before declaring
code dead. Passing tests alone does not establish that an untested behavior is disposable.

Remove the unjustified concept and its supporting surfaces. Keep coverage for live
behavior and validate the affected contracts under standing task guidance.

Report what became simpler, the evidence for removal, validation, and material remaining
limitations. Use production-only before/after counts when requested or useful, with the
same scope and counting method. No justified reduction is a valid result.
