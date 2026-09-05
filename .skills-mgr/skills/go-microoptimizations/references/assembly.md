# Assembly evidence

Read when a hot-path hypothesis concerns instruction or branch shape, register pressure, stack
churn, or when reporting assembly measurements. Keep the same Go version, GOOS, GOARCH, and symbol
for both measurements. Create a task-scoped directory with `mktemp -d` outside the repository;
substitute its exact path for `<metrics-dir>` below.

```sh
skills-mgr run go-microoptimizations/scripts/go_asm_metrics.py . \
  --symbol 'pkg.Func' --json-output "<metrics-dir>/before.json"

skills-mgr run go-microoptimizations/scripts/go_asm_metrics.py . \
  --symbol 'pkg.Func' --baseline "<metrics-dir>/before.json" \
  --json-output "<metrics-dir>/after.json"
```

Record `instruction_count`, `branch_count`, `stack_churn_detected`, and `stack_op_count`.
Remove the temporary measurements after their evidence has been reported or preserved in the
requested result. The helper measures assembly, not runtime or allocation improvement.

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
