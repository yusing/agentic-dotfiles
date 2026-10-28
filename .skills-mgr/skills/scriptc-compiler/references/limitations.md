# scriptc limitations

Contract: scriptc 0.4.5. Sources: [version-tagged limitations](https://github.com/vercel-labs/scriptc/blob/v0.4.5/docs/content/docs/limitations.mdx) and its [included sections](https://github.com/vercel-labs/scriptc/tree/v0.4.5/docs/content/limitations). Use `scriptc coverage` and a compiled reproduction for the concrete entry; support is operation-specific.

## Compile fences

- Loose equality between represented primitives supports coercions. Object-to-primitive `==` / `!=` is unsupported; convert explicitly.
- Generic functions nested inside another function, generic class expressions, and generic methods requiring dynamic dispatch are unsupported. Generic function values need a concrete signature and immutable binding. Generic bases compile when each specialization has a concrete layout.
- Record shapes use exact native layouts. Extra fields can produce `SC2002`; accepted conversions to different shapes can copy.
- Narrow unions before operations that need incompatible layouts. Some widening and function/data unions remain unsupported; same-representation class methods and some shared field/array operations compile.
- Supported `any` operations use native checked values without an engine flag. `unknown` still needs a checked cast for operations beyond truthiness, `typeof`, property access, `+`, `switch`, and `throw`.
- Untyped locals, parameters, and returns compile; records and tuples may hold `unknown`. JavaScript instance fields and TypeScript `unknown` / `object` instance fields have checked storage. Explicit TypeScript `any` class fields and some untyped array/union/static-field representations remain unsupported.
- Builtin function values are API-specific: supported path/os functions and selected fs/util functions can be passed as values; other builtins remain call-only. Use the diagnostic rather than generalizing from one builtin.
- Declared-but-unlowered APIs produce `SC2020`. Passing project `tsc` does not prove scriptc lowering support. scriptc's declarations include `JSON.parse: unknown` and Promise reject reasons typed as `Error`.

## Runtime differences

- Supported array holes, missing reads, empty `pop()` / `shift()`, and missing dictionary keys return `undefined`. A missing value stored where `undefined` cannot fit throws `TypeError`; statically typed out-of-range ordinary array reads can still hard-trap. Preserve bounds checks unless the actual compiled path proves they are unnecessary. Hard traps cannot be caught; supported parsing, cast, filesystem, regex, and user-thrown errors can.
- `JSON.parse(s) as T` and conversions from checked values validate at runtime. Invalid shapes throw a path-specific error. Non-null assertions extracting a non-nullable value can also throw. Node's TypeScript assertions do not perform these checks.
- Converting records between field shapes can copy. Supported records, arrays, classes, and handles retain identity through checked storage. `SC6001` flags observable copy differences.
- Key enumeration follows source creation order where tracked. `SC6002` flags cases where only declaration order can be retained, including untracked spreads or too many possible orders. Checked JSON records retain extra keys; copying to another record layout can discard them.
- Strings use UTF-16 semantics, including relational comparisons and lone surrogates. String-pattern split/replace does not match half a surrogate pair; encoded output substitutes U+FFFD for lone surrogates.
- `sort` / `toSorted` use stable natural merge sort; explicit comparator call order may differ from Node. `localeCompare` supports default root collation for Latin-script text and falls back to code-point order outside it; locales/options are unsupported (`SC6003` warns for relevant literals).
- `process.argv[0]` is `"scriptc"`, `argv[1]` is the executable path. Uncaught errors print `Uncaught <value>` without Node stack frames. Runtime errors expose typed `message` and `code`; additional Node error properties are available through an untyped view.
- Memory is reference-counted. Do not infer garbage-collector behavior from Node.

## Packages and runtime evaluation

All compiled application and package code is native. `--dynamic` and the embedded quickjs-ng engine were removed in 0.3. Unsupported packages need changes or replacement; report-only Node-island diagnostics do not supply a fallback.

Runtime source evaluation (`eval`, `Function`) throws a catchable `EvalError`; `vm` is refused. Build-time evaluation is a separate experimental facility. npm native addons require supported static bindings or replacement, not ordinary dynamic loading.

## WASI

WASI Preview 1 lacks sockets/fetch, process spawning, signals, network interfaces, and filesystem notifications. These and unsupported host-specific os calls fail before linking with `SC3002`. No sanitizer or native FFI. Library mode emits an async-free reactor. Filesystem access is limited to host preopens; `scriptc run` maps cwd to `/` and the host's temporary directory to `/tmp`.
