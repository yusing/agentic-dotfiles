# scriptc CLI

Source: [scriptc.dev/cli](https://scriptc.dev/cli).

## build

Typechecks with the real TypeScript compiler, then compiles. A construct with no lowering is an `SC` error plus a code frame and usually a rewrite hint.

`--emit` selects the one primary artifact: `ir`, `c`, `llvm`, `asm`, `obj`, or `exe` (default). `ir`/`c`/`llvm` need only Node. `asm`/`obj` use the bundled LLVM helper on supported hosts (no installed C compiler). `--print=native-link-info` builds an object and prints the external link recipe as JSON (no link). `--emit-ir` is a deprecated additive IR sidecar for executables; use `--emit=ir` when IR is the primary output.

`--from-c` treats the input as C or `.ll` (toolchain debugging). `--keep-c` (default) leaves the generated `.ll` or `.c` next to the executable; `--no-keep-c` deletes it.

## run

`build` then execute with inherited stdio. Does **not** forward extra CLI arguments to the program. For `wasm32-wasi`, Node's WASI host preopens cwd as `/` and host `/tmp` as guest `/tmp`.

## coverage

No binary. Static view vs `--dynamic` view. `--external-types specifier=file.d.ts` is coverage-only: types for analysis, runtime imports stay `SC1010` blockers. Repeatable. Files end in `.d.ts` / `.d.mts` / `.d.cts`.

## cache warm

Prebuild `runtime`, `tls`, and/or `dynamic` packs. macOS 15+ arm64 already ships the release runtime pack.

## Other flags

- `--dynamic` — embed the engine (~620KB) for npm JS and `any`.
- `--ffi <file>` — native C ABI manifest; see [ffi.md](ffi.md).
- `--backend c|llvm` — `llvm` default. Native fallback to C unless `--backend llvm` is pinned (`SC3001`). WASI never falls back.
- `--npm-static <pkg[,pkg…]|auto>` — experimental static compile of named npm packages.
- `--provenance-sources` — experimental; compile attested package source.
- `--sanitize` — ASan + refcount audit. Host-build lane. Rejected with `--emit=asm|obj`.

## Environment

- `SCRIPTC_CACHE_DIR` — cache root. Default `$XDG_CACHE_HOME/scriptc/build`, else `~/.cache/scriptc/build` (macOS: `~/Library/Caches/scriptc/build`). POSIX override must already be private or caching is skipped.
- `SCRIPTC_NO_CACHE=1` — bypass cache. Empty `SCRIPTC_CACHE_DIR` does the same.
- `SCRIPTC_CACHE_MAX_MB` — default 4096.
- `SCRIPTC_CC` — C compiler for explicit C, sanitizer, LLVM-fallback, and cross. `zigcc` selects zig's clang and sysroots.
- `SCRIPTC_LINKER` — platform linker driver for ordinary LLVM-tier executables.
- `SCRIPTC_TARGET` — triple, e.g. `aarch64-linux-gnu.2.36`, `x86_64-windows-gnu`, `wasm32-wasi`, `aarch64-linux-musl`.
