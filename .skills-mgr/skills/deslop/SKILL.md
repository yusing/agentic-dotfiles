---
name: deslop
description: Remove unjustified production-code complexity while preserving behavior, readability, and performance.
disable-model-invocation: true
---

# Deslop

Reduce production code by deleting unjustified logic, not by compressing its representation or
moving complexity elsewhere. The semantic owner is the definition site that owns a rule,
conversion, transition, or error policy; copies elsewhere are deletion candidates.

## Boundary and baseline

Identify the scoped production paths and behavior invariants. Trace relevant implementation,
tests, callers, interfaces, configuration, wire formats, failures, and cancellation. Passing tests
does not authorize changing an untested contract.

Record focused baseline checks and pre-existing failures. Record a production-only line count,
excluding tests, fixtures, generated/vendor code, and build artifacts. Use the repository counter
when available; otherwise count tracked production files with explicit exclusions. Reuse the
identical command afterward. If no baseline count is practical, report the non-test diff delta
as a delta, not a before/after pair.

## Candidates and evidence

- Dead code, impossible branches, and stale feature support with no remaining callers.
- Test-only helpers, fixtures, or injection surfaces in production.
- Duplicated rules or transformations already owned by a shared model, standard library,
  suitable dependency, or authoritative boundary.
- Speculative configurability, normalization, validation, or error translation outside the
  supported contract.
- Wrappers, caches, and abstractions without a contract or necessary resource to own.

Before declaring code dead, account for reflection, registration, serialization, templates,
plugins, generated consumers, public APIs, and runtime configuration. Verify a replacement's
semantics, errors, performance, security, maintenance, and dependency cost. A dependency is useful
only when it simplifies the whole system, not merely the repository's line count.

Remove whole unjustified concepts and their supporting surfaces; consolidate rules at their owner.
Use composition only when it clarifies a shared contract without coupling different policies.

## Preserve real simplicity

A reduction cannot come from minification, terse names, comment stripping, denser cleverness,
weaker live tests, or moving logic into another file, language, configuration, generated output,
or dependency. Preserve readability, supported errors, diagnostics, cancellation, validation,
compatibility, and runtime/build performance. Edit authoritative sources, not generated outputs.

Work in coherent, independently verifiable reductions. Remove tests only when they cover exactly
the removed unjustified behavior; retain every test protecting live behavior. Add characterization
coverage only for an established untested contract, never to inflate the size result. Keep unrelated
user changes intact.

Check affected behavior after each reduction. Exercise runtime paths when timing, rendering,
concurrency, integration, or multiple layers can change the outcome. Discard a candidate when
behavior, performance, readability, or logical simplicity worsens.

## Completion

Finish when applied reductions are verified, the final diff contains no hidden moves or weakened
contracts, and the same production-only measure is recomputed. Broaden validation only for a
required project gate or concrete unresolved risk; report changed paths that remain unexercised.

Report the exact counting command and measures, removed concepts and non-test lines, evidence that
they were unnecessary, checks and outcomes, rejected candidates, and remaining risks or baseline
failures. No justified reduction is a valid result; do not manufacture one to move the count.
