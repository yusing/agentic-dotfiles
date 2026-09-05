---
name: go-microoptimizations
description: Measure and optimize a bounded Go hot path on amd64 without changing its contracts.
disable-model-invocation: true
---

# Go Microoptimizations

Keep the work bounded to a production hot path with a concrete performance question. Identify its
callers and realistic input shape: size, hit/miss mix, encoding, allocations, and profile evidence.
Correctness and caller relevance outrank a smaller instruction count.

## Measurement loop

Capture focused correctness checks and a baseline for the claimed runtime or allocation effect.
Use the same symbol, Go version, GOOS, GOARCH, and workload before and after. For example:

```sh
rtk go test ./pkg -run '^$' -bench '^BenchmarkFunc$' -benchmem -count=8
```

Read [references/assembly.md](references/assembly.md) when assembly shape is part of the hypothesis
or requested result. Apply a coherent change, check behavior, and compare the relevant evidence.
Prefer `benchstat` when available. Keep improvements only without material regression; restore
only this task's rejected edits, preserving unrelated work.

## Decision order

Correctness > caller relevance > benchmark/allocation evidence > assembly shape
> readability cost.

- Assembly win loses when relevant benchmark regresses.
- Benchmark win may justify larger assembly when benchmark matches production.
- Allocation claim needs `-benchmem` or clear escape/allocation evidence.
- Capacity change affects append behavior; treat as API risk unless proven
  private.

## Benchmark bar

- Sub-20ns path: at least `-count=8`; compare ranges, not single run.
- Include hit, miss, common caller, and affected edges.
- Use `-benchmem` where allocation possible.
- Relevant cases improve; unrelated cases avoid material regression.

## Candidates

Good: proven hot tiny helper, repeated ASCII classification, loop allocation,
string/rune conversion, builder missing no-change path or `Grow`, known one-byte
separator, bit primitive mapping to `math/bits`.

Poor: no production caller/profile, broad parser rewrite, generic replacement for
optimized stdlib, parity-sensitive behavior, neutral/worse benchmark with only
instruction-count win.

## Behavior traps

- Invalid UTF-8: string range emits `utf8.RuneError`; byte loop preserves bytes.
- `strings.IndexAny` uses runes; `IndexByte` uses byte.
- Substring may retain large backing string.
- Preserve nil versus empty, order, duplicates, and externally visible capacity.
- Unsafe no-copy view: read-only, immutable source, obvious lifetime.
- Hidden goroutine or changed ownership needs explicit contract.

## Useful patterns

- Prefer `math/bits` intrinsics over hand-rolled scans/counts.
- Proven ASCII one-byte separator: `strings.IndexByte`.
- No-change fast path before allocation when behavior stays exact.
- Known output bound: `strings.Builder.Grow`.
- High expected uniqueness: consider preallocated map/set.
- Add helper only for real duplicate hot logic or clearer unsafe/bit invariant.

## Correctness coverage

No existing test: add focused test in test file. Cover affected edges. Byte/string
rewrite needs relevant ASCII boundary, Unicode, and invalid-UTF-8 cases.

## Report

For kept change: file/function, preserved behavior, before/after environment and
any requested assembly metrics, benchmark ranges, tests, tradeoff/risk. For rejected attempt:
reason; source remains restored.
