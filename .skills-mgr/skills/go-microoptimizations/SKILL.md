---
name: go-microoptimizations
description: Optimize bounded Go hot paths on amd64 using call-site evidence, correctness tests, benchmarks, allocation data, assembly metrics, branch shape, register use, stack churn, CMOV, branchless transforms, and math/bits.
disable-model-invocation: true
---

# Go Microoptimizations

Local, measured, reversible. Correctness first; nanoseconds must pay readability
and maintenance cost.

## Workflow

### Scope

Pick one function/method symbol. Find production callers and correctness test.
Record real shape: input sizes, hit/miss ratio, ASCII/Unicode, allocation
pressure, literal separators/search sets, profile evidence.

### Baseline

Capture with same Go version, `GOOS`, `GOARCH`, and symbol used later:

```sh
python3 \
  "${HOME}/.agents/skills/go-microoptimizations/scripts/go_asm_metrics.py" . \
  --symbol 'pkg.Func' \
  --json-output /tmp/pkg.Func.before.json
```

Record `instruction_count`, `branch_count`, `stack_churn_detected`,
`stack_op_count`.

Runtime/allocation claim needs baseline benchmark matching caller shape:

```sh
rtk go test ./pkg -run '^$' -bench '^BenchmarkFunc$' -benchmem -count=8
```

### Change

Audit behavior traps and metrics. Apply one small change. Run focused correctness
tests.

### Compare

Compare assembly:

```sh
python3 \
  "${HOME}/.agents/skills/go-microoptimizations/scripts/go_asm_metrics.py" . \
  --symbol 'pkg.Func' \
  --baseline /tmp/pkg.Func.before.json \
  --json-output /tmp/pkg.Func.after.json
```

Rerun matching benchmarks. Prefer `benchstat` when available. Keep change only
when relevant evidence wins without material regression. Restore rejected
attempt.

Done: behavior covered; before/after environment matches; assembly and claimed
runtime/allocation effects measured; rejected source restored.

## Decision order

Correctness > caller relevance > benchmark/allocation evidence > assembly shape
> readability cost.

- Assembly win loses when relevant benchmark regresses.
- Benchmark win may justify larger assembly when benchmark matches production.
- Allocation claim needs `-benchmem` or clear escape/allocation evidence.
- Capacity change affects append behavior; treat as API risk unless proven
  private.

## Metrics

- Tiny no-frame leaf with `instruction_count > 8`: inspect compound conditions,
  conversions, intermediates.
- Mathematical/bit primitive with `branch_count > 0`: inspect masks, shifts,
  boolean-to-mask transforms, `CMOV*`, `SET*`, `AND`, `OR`, `XOR`, arithmetic
  versus `J*`. Predictable branch may still win; benchmark decides.
- `stack_churn_detected = true`: inspect spills, frame, address-taking, closure,
  defer, register retention.
- Standalone symbol can mislead when caller inlining dominates. Measure
  instantiated generic symbol or caller when possible.
- Compare same symbol and toolchain: instruction counts include prologue and
  stack-growth checks, so absolute counts are not universal targets.

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
assembly metrics, benchmark ranges, tests, tradeoff/risk. For rejected attempt:
reason; source remains restored.
