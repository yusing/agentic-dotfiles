---
name: scriptc-compiler
description: scriptc compiler documentation. Use when compiling with scriptc, or when scriptc language, CLI, coverage, FFI, npm, platform, or limitation behavior is in question.
---

# scriptc compiler

scriptc compiles ordinary TypeScript and JavaScript to a native executable. The binary has no Node, V8, or JS engine unless `--dynamic` embeds quickjs-ng for npm packages and `any`. Typecheck is real `tsc` (`es2025`, nearest `tsconfig.json`). A construct with no lowering is an `SC` compile error, never a silent miscompile. Static-tier stdout and exit codes match Node except the numbered divergences below.

Published docs: [scriptc.dev](https://scriptc.dev). This skill holds the working contract. Open a linked page or a file under [references/](references/) only when the question is outside it. `scriptc coverage` / `scriptc build` on the file is more current than any write-up.

## Commands

- `scriptc build <file.ts|.js>` — typecheck, compile. Default `--emit=exe`. Without `-o`, the artifact lands in `.scriptc/` next to the input.
- `scriptc run <file>` — build and run with inherited stdio. **Does not forward extra argv**; `build` then invoke the binary to pass arguments.
- `scriptc coverage <file>` — per-statement static / `--dynamic` / blocker report with `SC` codes. Does not emit a binary. Type errors gate analysis.
- `scriptc cache warm` — prebuild runtime packs for CI or another target.

Frequent flags: `-o <path>`, `--emit ir|c|llvm|asm|obj|exe`, `--dynamic`, `--ffi <manifest.json>`, `--backend c|llvm`, `--sanitize`, `--keep-c` (default) / `--no-keep-c`.

`--emit=ir|c|llvm` need only Node. `exe` needs the platform linker/SDK. `--backend llvm` is default; a native program outside the LLVM tier falls back to C with one stderr line unless `--backend llvm` is pinned (then `SC3001`). `wasm32-wasi` never falls back.

Env: `SCRIPTC_CC=zigcc` and `SCRIPTC_TARGET=<triple>` for cross-compilation; `SCRIPTC_NO_CACHE=1` to skip the cache. Full flags and env: [references/cli.md](references/cli.md).

## Tiers

1. **Static** (default) — native code, no engine.
2. **`--dynamic`** — embedded engine (~620KB) for shipped npm JS and `any`. Values copy across the boundary; a lying type throws a catchable `TypeError`. Without the flag, those sites are compile errors (often `SC2013` / `SC2011`).
3. **Rejected** — compile error. `--dynamic` does not clear blockers.

`any` without `--dynamic` is `SC2011`. Prefer `unknown` and a checked cast, or opt into the engine.

npm packages resolve at build time and are embedded; the executable does not read `node_modules` at runtime. `--npm-static` and `--provenance-sources` are experimental.

## Divergences that change code

- Arrays are dense. Out-of-bounds reads and `pop()` on empty **trap** (abort), they do not yield `undefined`. `process.argv[2] ?? "world"` traps when the arg is missing — check `process.argv.length > 2`.
- Hard traps are not catchable. User `throw`, JSON parse errors, checked casts, and fs/regex errors are catchable.
- `process.argv[0]` is `"scriptc"`; `argv[1]` is the binary path; `argv[2]…` are program args.
- Record width-subtyping and island crossings **copy**; mutations do not alias back.
- `JSON.parse(s) as T` validates at runtime and throws a path-named error on mismatch.
- Uncaught stderr is `Uncaught <value>`, not a Node stack. Exit code and pre-throw stdout still match.

Language fences (loose `==` except nullish/same-primitive, `any` as class fields, unpinned generic function values, …) and the rest of this list: [references/limitations.md](references/limitations.md).

## Node surface

Static on native targets: `fs` (sync and promises), `path`, `process`, `child_process`, `os`, `crypto`, `url`/`URL`, `zlib`, timers and signals, `net` / `http` / `https` / `tls` / `dgram` / `dns` / `readline`.

WASI (`SCRIPTC_TARGET=wasm32-wasi`): no sockets/fetch, **no child processes**, no signals, no `os.networkInterfaces()`, no `fs.watch`, no `--sanitize`, no FFI, no `--lib` (`SC3002`). `scriptc run` preopens cwd as `/` and host `/tmp` as guest `/tmp`.

## Coverage

`scriptc coverage file.ts` counts statements in *your* program, not dependencies.

- `compile statically` — native, no engine.
- `runs with --dynamic` — would need the engine; without `--dynamic` each site is a build error.
- `blockers` — no tier, even with `--dynamic`. Same `SC` codes as `scriptc build`.

`scriptc coverage file.ts --dynamic` asks what a `--dynamic` build would compile. It also lists Node builtins reached by embedded packages and whether each is shimmed.

## FFI

`scriptc build main.ts --ffi ffi.json` binds a **signature-only** `declare function` to a C symbol. The binding is that exact declaration only (no aliases, overloads, or functions with bodies). Format 1 is values: `f64`, `bool`, `u8`/`u32`/`i32`, `string`, `bytes`, `void` returns. No pointer/string/byte returns, no variadics, no structs by value, no `dlopen`, executable builds only (not `--lib`). ABI table, example, and callback formats: [references/ffi.md](references/ffi.md).

## Platforms

| Target | How | Notes |
| --- | --- | --- |
| macOS arm64/x64 | host helper + runtime pack | Full surface, `--dynamic`, `--sanitize` |
| Linux arm64/x86_64 | helper + pack; `…-linux-musl` for musl | Servers, TLS, fetch, `fs.watch`, `child_process`; needs matching libc |
| Windows x64 | MSVC helper + pack | Same surface including `child_process` |
| iOS/Android arm64 | `SCRIPTC_CC=zigcc` + target triple | `--lib` archives only |
| WASI Preview 1 | helper + WASI pack | Full language/`--dynamic`; host-capability limits above |
