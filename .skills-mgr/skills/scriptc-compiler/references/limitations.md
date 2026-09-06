# scriptc limitations

Source: [scriptc.dev/limitations](https://scriptc.dev/limitations). Honesty is the product: compile error or numbered divergence, never silent. `scriptc coverage` on the file is the live answer.

## Compile fences (common)

- Loose `==`/`!=` only for number-number, string-string, boolean-boolean, and `== null` / `!= null`. Otherwise use `===`.
- `break`/`continue` across `finally`, and `return`/`break`/`continue` out of a `finally` body, are fenced. Ordinary `return` through `finally` compiles.
- Generics monomorphize when the target is static. Fenced: generic functions declared inside another function, generic class expressions, generic classes whose base depends on their own type parameters, generic methods needing dynamic dispatch.
- Generic function values must be a never-reassigned binding pinned to a concrete signature at use. `const g = Math.floor` is rejected — call builtins directly.
- Record shapes are exact structs. Extra fields: `SC2002`. A strict field-subset flow copies the record.
- Narrow unions before per-arm operations (`u.length` on `string | string[]`). Tuple inference from `Promise.all([…])` fences tuple methods — type as `T[]` first.
- `undefined`/`null` compile as values and union arms. Optional fields and optional/default/rest parameters compile.
- Map keys and Set elements are strings and numbers.
- `any` without `--dynamic`: `SC2011`. `any`/`unknown` ride locals, parameters, and returns — not class fields, array elements, or union arms (record/tuple fields may hold `unknown`).
- Operations on `unknown` beyond truthiness, `typeof`, property access, `+`, `switch`, `throw` need a checked cast.
- Reaching declared-but-unlowered stdlib is `SC2020` with supported alternatives in the hint.

scriptc's type world differs in places (`JSON.parse` returns `unknown`, `pop()` returns `T`, Promise reject is `Error`). A program clean under project `tsc` can still hit per-site fences; that is not a bare irreproducible type error.

## Further divergences

- `Object.keys`/`values`/`entries` and `JSON.stringify` use declaration order, not insertion order.
- Strings are stored UTF-8; `.length` and methods are UTF-16-exact except `<`/`>` (code-point order) and surrogate-splitting (U+FFFD).
- Date: bounded parse grammar; local getters use the OS timezone database.
- Memory is reference-counted. Cycles that cross the static/island boundary are uncollectable.
- `sort`/`toSorted` comparator call sequences differ (stable insertion sort vs V8 TimSort); consistent comparators still match results. `localeCompare` is code units, not ICU.
- Runtime errors carry `message` and Node `code`, not `errno`/`syscall`/`path`.

## Dynamic tier

Island is quickjs-ng, not V8. Island Node builtins are shims. Static fibers drain before island jobs, so `await` racing a package promise can interleave differently than Node. Top-level `await` in embedded ESM packages is unsupported (it does compile in your own ESM and in `--npm-static` packages).

## WASI

Full language and `--dynamic` through LLVM. Preview 1 has no sockets, child processes, signals, `os.networkInterfaces()`, or `fs.watch` — those fail with `SC3002` before link. No `--sanitize`, FFI, or `--lib`. Filesystem is host preopens.
