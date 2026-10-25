---
name: deslop
description: Remove unjustified complexity from implementations and tests while preserving behavior, meaningful coverage, readability, and performance.
disable-model-invocation: true
---

# Deslop

Remove unjustified complexity from implementations and tests while preserving supported
behavior, meaningful coverage, readability, and performance. Simplify the system itself:
denser code or moving complexity into another file or dependency is not a reduction.

## What to look for

- Dead code, impossible branches, and stale feature support.
- Duplicate rules or transformations that belong at one authoritative owner.
- Speculative configuration, validation, or error translation outside the supported contract.
- Wrappers, caches, abstractions, and test-only production surfaces with no current purpose.
- Tests that duplicate coverage or assert their own setup rather than live behavior.
- Brittle implementation-detail assertions and unnecessary mocks, fixtures, or test-helper layers.

Establish why a candidate is unnecessary from its callers and contracts. Account for
indirect consumers such as registration, reflection, and public APIs before declaring
code dead. Passing tests alone does not establish that an untested behavior is disposable.
For tests, identify the contract or failure mode each protects before merging or removing cases.

Remove the unjustified concept and its supporting surfaces. Preserve distinct coverage for
live behavior; simplify setup and assertions without weakening regression detection.
Validate the affected contracts under standing task guidance.

Report what became simpler, the evidence for removal, validation, and material remaining
limitations. When counts are requested or useful, report implementation and test counts
separately, using the same before/after scope and counting method. No justified reduction
is a valid result.
