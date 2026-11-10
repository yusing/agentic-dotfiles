# scriptc CLI

Contract: scriptc 0.4.10. Sources: [version-tagged CLI](https://github.com/vercel-labs/scriptc/blob/v0.4.10/docs/content/docs/cli.mdx), [coverage](https://github.com/vercel-labs/scriptc/blob/v0.4.10/docs/content/docs/coverage.mdx), and installed `scriptc --help`. The live website can describe a newer version.

## Build and run

`scriptc build entry.ts` typechecks and compiles. `--emit=exe` is the default; other primary outputs are `ir`, `llvm`, `asm`, and `obj`. These non-executable outputs need only the installed compiler. LLVM is the only backend. Unsupported operations produce `SC` diagnostics with locations and rewrite hints.

Without `-o`, artifacts go under `.scriptc/` beside the entry. `--keep-llvm` (default) retains the generated `.ll`; `--no-keep-llvm` removes it. `--emit-ir` is a deprecated additive IR sidecar for executables. `--print=native-link-info` emits an object and JSON external-link recipe without linking; it requires the exact matching runtime pack for a later link.

`scriptc run entry.ts` builds and executes with inherited stdio, but does not forward program arguments. Build then invoke the executable directly for arguments. On WASI, `run` needs Node.js 24+ and preopens cwd as `/` and the host's temporary directory as guest `/tmp`.

## Coverage and automation

`scriptc coverage entry.ts` analyzes without linking. `--print=diagnostics` emits a versioned JSON document for build or coverage. Coverage gates are `--fail-on=blockers`, `divergences`, and `dynamic`; the last also rejects `SC6101` warnings for likely-hot untyped code, not all checked-value operations.

`--explain-dynamic[=<name>]` identifies native dynamic-tier functions and unsupported constructs that a future dynamic tier could accept. `--tier=static-only` prevents such future demotions; it currently behaves like `auto`, retaining existing checked-value code. `--no-dynamic-tier-warning` suppresses `SC6101` and conflicts with `--fail-on=dynamic`.

`--external-types specifier=file.d.ts` is repeatable and coverage-only. It supplies types for an embedder module; runtime imports remain explicit `SC1010` blockers. Files must end in `.d.ts`, `.d.mts`, or `.d.cts`.

Node islands can load Node.js in-process and run unsupported packages since 0.4.6. `--node-islands=auto|explicit|off`, `--node-island=<package-or-path>`, `--native=<package>` and `--explain-island=<package>` select or inspect boundaries. The installed 0.4.10 help still calls several island flags report-only, while its release notes and coverage docs describe working islands. Check the actual entry and dependency at build and runtime; do not infer native-only startup or package support from help alone. Island gates include `node-islands`, `eager-node-islands`, and `island-gaps`.

`--fail-on=dynamic-slots` also rejects `SC6104` slots; `--fail-on=type-claims` rejects conversions trusting unverified types. `--coverage=reached` skips analysis of unreached code, so totals differ from full coverage. It cannot be combined with `--explain-dynamic`.

`--strict-user-js` reports additional JavaScript compatibility blockers during coverage.

## Optimization and native interfaces

- `--optimization=release` is the default, `-O2`. `dev` uses `-O0` with source debugging and source-position error frames unless stripped; macOS executables also produce `.dSYM`. `speed` trades build time and binary size for runtime optimizations. Measure before selecting it.
- `--strip` removes symbol/debug payload from executable output without changing code optimization.
- `--target-cpu=baseline|x86-64-v2|x86-64-v3|x86-64-v4|native` selects x86-64 program instructions. Higher levels require matching deployment CPUs; `native` is not a portable default. Runtime packs remain baseline.
- Linux PGO: build with `--profile-generate <pattern>` (`%p` expands to PID), run representative inputs, merge using `scriptc merge-profiles -o app.profdata <profiles…>`, then build with `--profile-use app.profdata`. `--sparse` on merge omits never-run functions. Instrumented binaries are slower; use release or speed executable builds. `LLVM_PROFILE_FILE` overrides the output pattern.
- `--detached-exit` opts Linux executables into helper-process teardown after `process.exit()`. Memory and the executable mapping can remain for about 100 ms; account for that before using it in short-lived tools.
- `--ffi <manifest>` binds native C symbols; see [ffi.md](ffi.md).
- `--sanitize` adds ASan and a reference-count audit for host executable builds. It needs a C compiler and LLVM tools, and rejects `--emit=asm|obj`.
- `--lib --profile <profile.json>` builds the profile's entry as a native archive or async-free WASI reactor. No positional entry or `--ffi`; the profile controls emission and optimization.

## Packages

Eligible npm dependencies compile automatically. `--npm-static=<pkg[,pkg…]|auto>` selects untyped direct imports; `pkg...` also selects their dependencies. Unsupported packages fail with diagnostics. `--provenance-sources` experimentally uses attested source, otherwise the published source. There is no `--dynamic` engine fallback.

## Cache and environment

`scriptc cache warm [runtime|tls]` verifies and loads installed precompiled families. Ordinary builds need no warm step.

- `SCRIPTC_CACHE_DIR`: build cache root. Default `$XDG_CACHE_HOME/scriptc/build`, macOS `~/Library/Caches/scriptc/build`, Windows `%LOCALAPPDATA%` plus `scriptc/cache/build`, otherwise `~/.cache/scriptc/build`. Existing POSIX overrides must already be private or caching is bypassed.
- `SCRIPTC_NO_CACHE=1` or an explicitly empty cache directory variable bypasses cache reads/writes. `SCRIPTC_CACHE_MAX_MB` defaults to 4096.
- `SCRIPTC_CC`: C compiler for sanitizer builds; `zigcc` selects zig's `cc`.
- `SCRIPTC_LINKER`: executable linker driver. Default clang on macOS/glibc Linux, zig elsewhere.
- `SCRIPTC_TARGET`: cross-compilation triple. Install the matching-version `@scriptc/runtime-<target>` pack and zig. `SCRIPTC_RUNTIME_PACK` overrides the pack directory.
- `SCRIPTC_CHECKER=tsc-ts|tsgo`: TypeScript 7 checker; both ship with scriptc and produce the same diagnostics/code. Linux and macOS builds use a shared tsc-ts checker server by default outside CI. Set `SCRIPTC_CHECKER_SERVER=0` to disable it or `1` to enable it in CI. It falls back to a per-build checker if unavailable, exits after ten idle minutes, and retires after a build above 2048 MB resident memory (`TSC_TS_LISTEN_MEMORY` changes the limit).

## Declaration repair and compiler tooling

`scriptc types patch <package> <selector> <type> [--range <range>] [--dry-run]` shows matching declarations and writes a version-scoped patch to the nearest package manifest. Start with `--dry-run`; inspect coverage's type-claim row and fix the actual declaration rather than weakening a valid check. `scriptc types list` shows whether patches apply.

`scriptc mcp` exposes compiler commands over stdio, including build and run. The server executes code with its user's permissions; enabling it is separate from installing the compiler.

For compiler work, `--emit-lowered <file>` records the frontend result; `--from-lowered <file>` reuses it only when compiler, source and relevant options still match. Ordinary builds already cache unchanged inputs; do not add a separate lowered-artifact workflow without a need.
