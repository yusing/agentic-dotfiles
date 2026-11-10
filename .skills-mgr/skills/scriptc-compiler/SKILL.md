---
name: scriptc-compiler
description: scriptc compiler documentation. Use when compiling with scriptc, or when scriptc language, CLI, coverage, FFI, npm, platform, or limitation behavior is in question.
---

# scriptc compiler

scriptc compiles TypeScript and JavaScript to native code. Native-only programs embed no JavaScript engine; programs using Node islands load Node.js in-process for those modules. This contract targets scriptc 0.4.10. Type checking uses TypeScript 7, `es2025`, scriptc's ambient declarations, and the nearest `tsconfig.json`. Unsupported TypeScript operations produce `SC` diagnostics; some unsupported JavaScript operations defer the error until execution.

Published docs: [scriptc.dev](https://scriptc.dev/docs). References link the version-tagged sources because the website can describe newer releases. Load a reference only for details outside this body. Check the installed `--version`, `--help`, and `coverage` / `build` on the actual entry file before relying on a capability.

## Commands

- `scriptc build <file.ts|.js>` — typecheck, compile. Default `--emit=exe`. Without `-o`, the artifact lands in `.scriptc/` next to the input.
- `scriptc run <file>` — build and run with inherited stdio. **Does not forward extra argv**; `build` then invoke the binary to pass arguments.
- `scriptc coverage <file>` — per-statement native / dynamic-tier / blocker report with `SC` codes. Does not emit a binary. Type errors gate analysis.
- `scriptc cache warm [runtime|tls]` — verify and load installed precompiled runtime families; ordinary builds need no warm step.
- `scriptc merge-profiles -o app.profdata <profiles…>` — merge instrumentation profiles for a subsequent `--profile-use` build.
- `scriptc types patch <package> <selector> <type> --dry-run` and `types list` inspect declaration patches before recording them in the nearest package manifest.
- `scriptc mcp` serves compiler commands over stdio; it also permits compiling and executing code.

Frequent flags: `-o <path>`, `--emit ir|llvm|asm|obj|exe`, `--ffi <manifest.json>`, `--optimization release|dev|speed`, `--strip`, `--sanitize`, `--keep-llvm` (default) / `--no-keep-llvm`. LLVM is the only backend; C emission and `--dynamic` are removed.

`coverage` and `--emit=ir|llvm|asm|obj` need only the installed compiler. `exe` needs a linker and platform SDK/sysroot. npm installation and `run` on WASI need Node.js 24 or later.

Cross-compilation uses `SCRIPTC_TARGET=<triple>`, zig, and a matching-version target runtime pack. `SCRIPTC_CC` selects the sanitizer compiler, not the cross-link target. Full flags and env: [references/cli.md](references/cli.md).

## Native compilation and packages

Typed operations use native layouts. Supported `any`, untyped JavaScript, and runtime-typed values use native checked storage, called the **dynamic tier**; it is not an embedded engine. Prefer concrete types in hot loops. `--explain-dynamic` locates dynamic operations; `SC6101` warns about likely-hot untyped functions. `--tier=static-only` prevents future demotions of unsupported constructs, but currently behaves like `auto` and does not eliminate existing checked-value code.

npm dependencies compile natively at build time when eligible. Packages with their own declarations or DefinitelyTyped types are selected automatically; `--npm-static=<pkg>` can select an untyped direct dependency, and `pkg...` selects its dependency closure. Unsupported packages produce diagnostics. `--provenance-sources` is experimental. Since 0.4.6, Node islands can run packages the compiler cannot lower by loading Node.js in-process. Keep latency-sensitive hooks native-only. The 0.4.10 help still labels island flags report-only, contrary to release notes and coverage documentation; verify the actual package build and execution rather than trusting either summary. In native-compiled code, `eval`, `Function`, and `vm` cannot execute JavaScript source at runtime.

## Divergences that change code

- Array holes, missing reads, and empty `pop()` / `shift()` have Node-like support, but statically typed out-of-range accesses can still hard-trap. Keep bounds checks at uncertain indexes; verify the concrete entry before removing them.
- Hard traps are not catchable. User `throw`, JSON parse errors, checked casts, and fs/regex errors are catchable.
- `process.argv[0]` is `"scriptc"`; `argv[1]` is the binary path; `argv[2]…` are program args.
- Record conversions between different field shapes can **copy**; mutations need not alias back. Checked storage preserves identity for supported records, arrays, classes, and native handles.
- `JSON.parse(s) as T` validates at runtime and throws a path-named error on mismatch.
- Uncaught stderr starts with `Uncaught <value>`, not Node's source excerpt. Error frames are retained when a release program reads `stack`, or for throwing functions in unstripped `dev` builds, which also include source positions. Exit code and pre-throw stdout still match.

Language fences, property-order warnings, and further runtime differences: [references/limitations.md](references/limitations.md).

## Node surface

Native targets support subsets of `fs` (sync and promises), `path`, `process`, `child_process`, `os`, `crypto`, `url`/`URL`, `zlib`, timers and signals, `net` / `http` / `https` / `tls` / `dgram` / `dns` / `readline`, streams, and workers. Support is API- and overload-specific; use coverage before replacing a workaround. `spawnSync` now accepts typed `input` and `cwd` options, removing the need for stdin temp files or parent `chdir`. Verify optional values through a compiled run; concrete defaults avoid checked-conversion failures at this boundary.

WASI (`SCRIPTC_TARGET=wasm32-wasi`): no sockets/fetch, child processes, signals, `os.networkInterfaces()`, `fs.watch`, `--sanitize`, or native FFI. Library mode emits an async-free Wasm reactor. `scriptc run` preopens cwd as `/` and the host's temporary directory as guest `/tmp`.

## Coverage

`scriptc coverage file.ts` reports native compilation, dynamic-tier statements, blockers, and Node divergences; dependency details are listed separately.

- `--fail-on=blockers` fails for reachable build blockers; `divergences` also fails for Node differences, and `dynamic` also fails for `SC6101` hot-code warnings.
- `--fail-on=dynamic-slots` rejects dynamic slots (`SC6104`); `--fail-on=type-claims` rejects conversions that trust unverifiable declarations or assertions. Inspect a claim before patching its type.
- `--coverage=reached` skips unreached code for large programs; its totals cannot be compared with full coverage and it conflicts with `--explain-dynamic`.
- `--print=diagnostics` emits versioned JSON suitable for automation.

Coverage is analysis, not runtime acceptance. Compile and exercise the real consumer after a migration.

## FFI

`scriptc build main.ts --ffi ffi.json` binds a **signature-only** `declare function` to a C symbol. Format 1 supports basic scalar and borrowed span parameters. Formats 2–5 add callbacks; 6 adds scalar widths and writable spans; 7 adds bigint-backed 64-bit values, opaque pointers, and a static `node:ffi` catalog. No variadics, structs by value, owned pointer/string/byte returns, or runtime library loading. Executable builds only. ABI and ownership details: [references/ffi.md](references/ffi.md).

## Platforms

| Target | How | Notes |
| --- | --- | --- |
| macOS arm64/x64 | compiler + runtime pack + clang/SDK | Compiler host needs macOS 15+; executables target 14+ |
| Linux arm64/x86_64 | compiler + pack + clang or zig | glibc 2.34+ or musl; musl executables link statically |
| Windows x64 | compiler + runtime pack + zig | Supported Node API subset including child processes |
| iOS/Android arm64 | target triple + runtime pack | `--lib` archives only; iOS requires a macOS host |
| WASI Preview 1 | zig + WASI pack | Host-capability limits above; `run` needs Node 24+ |
