---
name: go-microoptimizations
description: Measure and optimize a bounded Go hot path on amd64 without changing its contracts.
disable-model-invocation: true
---

# Go microoptimizations

Optimize one production hot path with a concrete performance question. Establish its callers,
realistic sizes/hit-miss mix/encoding, and available profile evidence. Correctness and production
relevance outrank instruction count.

## Measurement

Capture focused correctness and runtime/allocation baselines for the same symbol, Go version,
GOOS, GOARCH, and workload before and after:

```sh
rtk go test ./pkg -run '^$' -bench '^BenchmarkFunc$' -benchmem -count=8
```

For sub-20ns paths use at least eight runs and compare ranges; prefer `benchstat` when available.
Include relevant common, hit/miss, and affected-edge cases, with `-benchmem` for allocation claims.
Read [assembly.md](references/assembly.md) only for an assembly hypothesis or requested metric.

Keep changes only without material relevant regressions. Runtime evidence can justify larger
assembly; an assembly win cannot justify a runtime loss. Restore only this task's rejected edits.

## Candidates and traps

Consider proven hot helpers, repeated ASCII classification, loop allocation, no-change fast paths,
known output bounds for `strings.Builder.Grow`, and `math/bits` intrinsics. A helper needs shared
hot logic or a clearer unsafe/bit invariant. Avoid broad parser rewrites, unsupported stdlib
replacements, and instruction-count wins without a production caller and benchmark benefit.

Preserve:

- Invalid UTF-8 semantics: string range emits `utf8.RuneError`; byte loops preserve bytes.
- Rune versus byte search: `strings.IndexAny` and `strings.IndexByte` differ.
- Nil/empty, order, duplicates, externally visible capacity, and backing-string retention.
- Ownership/lifetimes for read-only unsafe views; hidden goroutines need a real contract.

Validate affected behavior with existing checks or a focused test in a test file. Byte/string
rewrites need relevant ASCII, Unicode, and invalid-UTF-8 cases, not an unrelated matrix.

Report the function, preserved contract, environment, benchmark ranges, requested assembly metrics,
checks, and tradeoffs. For rejected attempts, give the reason and confirm task edits were restored.
