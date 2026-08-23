---
name: deslop
description: Reduce non-test production code without changing behavior or readability and without degrading performance or test outcomes. Use when asked to deslop, shrink, simplify, de-bloat, remove dead code, eliminate overengineering, or minimize a codebase while preserving its contracts.
disable-model-invocation: true
---

# Deslop

Make production code smaller by deleting unjustified logic, not by compressing its
representation or moving complexity elsewhere.

Throughout, the *semantic owner* of a rule is the single definition site that the rule,
conversion, state transition, or error policy belongs to. Everything else that restates
it is a candidate for deletion.

## Establish the boundary

1. Identify the production paths in scope. Exclude tests, fixtures, generated files,
   vendored code, and build artifacts from the size metric.
2. Read the implementation and its tests. Trace relevant callers, consumers, interfaces,
   configuration, wire formats, and failure and cancellation paths.
3. State the behavior invariants concisely before editing. Preserve externally observable
   behavior even where tests do not cover it.
4. Run the focused tests before editing. Record pre-existing failures separately.
5. Record a production-only line count before editing, using a command you can rerun
   verbatim afterward.

Prefer the repository's own source-line counter when it has one. Otherwise count tracked
production files directly, for example:

```sh
git ls-files -z '*.go' \
  | grep -zv -e '_test\.go$' -e '/testdata/' -e '^vendor/' -e '\.gen\.go$' \
  | xargs -0 wc -l | tail -1
```

Adapt the extensions and exclusions to the repository, state them in the report, and use
the identical command for the after measurement. If no pre-edit count is practical, say so
and report net added and deleted non-test lines from the final diff instead — that is a
delta, not a before/after pair, so do not present it as one.

Do not treat passing tests as permission to alter an untested contract.

## Find deletion candidates

Seek evidence in five categories.

**Dead code.** Unreachable functions, types, branches, flags, compatibility paths, and
fallback chains. Stale feature remnants whose callers and active references are gone.
Edge-case handling whose preconditions cannot occur, including fallbacks for fallbacks.

**Test scaffolding in production.** Test-only helpers, seams, fixtures, or dependency
injection that exist in production code solely to serve tests.

**Duplicated rules.** Parallel implementations of the same rule, state transition,
conversion, or error policy. Related data structures that repeat fields and operations
instead of sharing an existing model or using clear composition. Clusters of hard-coded
special cases that express one stable rule. Reinventions of language or standard-library
behavior. Custom implementations of behavior already owned by a mature specialized
external library — but only adopt such a library when it suits the domain and makes the
whole system smaller, clearer, safer, and easier to maintain, never merely to move line
count out of this repository.

**Speculative contract surface.** Configurability, validation, normalization, and error
translation outside the supported contract. Impossible states already excluded by
construction or by an authoritative boundary. Duplicated checks or transformations already
guaranteed by the semantic owner.

**Contract-free indirection.** Abstractions with one real implementation or call site that
obscure direct logic. Wrappers, adapters, caches, and layers that add code without owning
a contract.

Before deleting:

- Prove reachability and ownership; do not infer either from names or a single search hit.
- Account for reflection, registration, serialization, templates, plugins, generated
  consumers, public APIs, and runtime configuration before declaring code dead.
- Verify the exact semantics, error behavior, performance, security posture, maintenance
  quality, and dependency cost of any standard-library or third-party replacement.

When deleting:

- Prefer removing a whole concept and its active support over shortening isolated
  statements.
- Consolidate parallel logic only at its semantic owner.
- Introduce composition or an abstraction only when it makes the shared rule clearer and
  leaves the whole production path smaller and simpler.
- Work in small, independently verifiable reductions.

## Reject fake shrinkage

Never claim progress from:

- weakening, compacting, regenerating, or deleting tests that still guard live behavior;
- minification, line joining, terse renaming, comment stripping, or readability-hostile
  formatting;
- moving logic into tests, configuration, generated code, scripts, dependencies, or
  another layer;
- replacing clear logic with denser cleverness or a more complicated abstraction;
- dropping supported errors, diagnostics, cancellation, validation, or compatibility
  behavior;
- accepting worse runtime, memory use, I/O, startup cost, or build performance;
- changing generated or vendored outputs instead of their authoritative source.

Do not force related structures into inheritance or composition when their contracts
differ. Do not trade duplicated text for coupled control flow when the result is harder to
understand.

For example, collapsing two callers into one helper that they must now both parameterize
is not a reduction:

```go
// Before: 8 lines, two direct paths.
// After:  11 lines, one helper plus two call sites plus a mode flag.
func render(w io.Writer, v Value, compact bool, indent string, escape bool) error
```

Whereas deleting a fallback whose precondition cannot occur is:

```go
// Before
cfg, err := load(path)
if err != nil {
    cfg = defaults() // load() already returns defaults() on any error
}
// After
cfg, _ := load(path)
```

## Apply each reduction

1. Remove the semantic owner of the unjustified behavior and every surface that exists
   only to support it.
2. Delete the tests that covered exactly the behavior you removed; that is part of the
   deletion, not a violation. Never adjust a test that still guards behavior you intend to
   keep.
3. Keep the surrounding idiom, naming, error style, and abstraction level.
4. Run the narrowest relevant test after each coherent change.
5. Exercise real runtime paths for timing, rendering, concurrency, integration, or
   multilayer behavior; static inspection is insufficient.
6. Discard a candidate if behavior, performance, readability, or logical simplicity
   worsens.

Do not modify pre-existing user changes outside the reduction. Do not rewrite tests to
accept the new implementation. Add a minimal characterization test only when necessary to
protect an established but untested contract, and never count that test change as
shrinkage.

## Verify the result

1. Run focused tests and the broadest practical suite, build, lint, or type checks.
2. Compare success, failure, and cancellation behavior against the invariants and
   baseline.
3. Inspect the diff for hidden moves, test weakening, public-contract changes, denser
   code, and performance regressions.
4. Rerun the identical production-only count from the boundary step.
5. List changed runtime paths that remain unexercised and either test them or report them
   explicitly.

Report:

- the production-only before and after measure, including the exact counting command;
- the concepts and non-test lines removed;
- the evidence that each removed path was unnecessary;
- the validation commands and their outcomes;
- pre-existing failures, unverified paths, and material risks.

Prefer a smaller verified reduction over a larger speculative one. Finding no unjustified
logic is a valid outcome: report the unchanged measure and the candidates you rejected.
Never manufacture a reduction to make the number move.

Done: scoped production paths read and traced; invariants stated; every applied reduction
independently verified; checks run with pre-existing failures separated; production-only
measure recomputed with the same command; rejected candidates, unexercised paths, and
remaining risk reported.
