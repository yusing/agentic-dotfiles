# scriptc native FFI

Contract: scriptc 0.4.5. Source: [version-tagged FFI documentation](https://github.com/vercel-labs/scriptc/blob/v0.4.5/docs/content/docs/ffi.mdx).

Outbound FFI is a link-time C ABI. A JSON manifest names a signature-only TypeScript `declare function`, a C `symbol`, and archives/objects to link. No runtime `dlopen`. The binding applies only to a direct call of that exact declaration.

## Format 1 example

```ts
declare function nativeScale(value: number): number;
console.log(nativeScale(21));
```

```json
{
  "ffi_format": 1,
  "functions": [
    {
      "name": "nativeScale",
      "symbol": "native_scale",
      "params": ["f64"],
      "returns": "f64"
    }
  ],
  "libraries": ["./libnative.a"],
  "system_libraries": []
}
```

```sh
clang -c native.c -o native.o
ar rcs libnative.a native.o
scriptc build main.ts --ffi ffi.json -o app
```

Relative `libraries` paths resolve from the manifest directory. `system_libraries: ["m"]` becomes `-lm`. C++ symbols need `extern "C"`.

## ABI classes

| Class | TypeScript | C | Param | Return |
| --- | --- | --- | --- | --- |
| `f64` | `number` | `double` | yes | yes |
| `bool` | `boolean` | `uint8_t` (nonzero → true) | yes | yes |
| `u8` | `number` | `uint8_t` | yes | yes |
| `u32` | `number` | `uint32_t` (`ToUint32`) | yes | yes |
| `i32` | `number` | `int32_t` (`ToInt32`) | yes | yes |
| `f32` (format 6) | `number` | `float` | yes | yes |
| `i8` / `u16` / `i16` (format 6) | `number` | `int8_t` / `uint16_t` / `int16_t` | yes | yes |
| `i64` / `u64` (format 7) | `bigint` | `int64_t` / `uint64_t` | yes | yes |
| `pointer` (format 7) | `bigint` | `void *` | yes | yes |
| `cstring` | `string` | `const char *` | callback only (formats 3–7) | no |
| `string` | `string` | `const uint8_t *, size_t` (UTF-8) | yes | no |
| `bytes` | `Uint8Array` or `Buffer` | `const uint8_t *, size_t` | yes | no |
| `mutable-bytes` (format 6) | `Uint8Array` or `Buffer` | `uint8_t *, size_t` | outbound only | no |
| `void` | `void` | `void` | no | yes |

TypeScript `number` cannot distinguish integer vs double; the manifest is the ABI authority. Outbound string/byte pointers are borrowed for the call only; native code must not retain or free them. Only `mutable-bytes` permits writes, visible through the original view and aliases. Empty spans may be a null pointer. Format 7 opaque pointer returns carry no inferred lifetime, allocation size, or deallocator; owned pointer and string/byte returns remain unsupported.

## Later formats

- **2** — call-scoped C function-pointer + optional context (`void *`). TypeScript has no context parameter; the compiler supplies it.
- **3** — copy-in `cstring` / `string` / `bytes` callback parameters.
- **4** — `lifetime: "retained"` plus a paired release binding. Release the same function value that was registered.
- **5** — `invoke: "foreign"` on a retained, context-bearing, `void` callback. Native trampoline enqueues to the script event loop; not real-time; value-returning foreign callbacks are refused.
- **6** — `f32`, `i8`, `u16`, `i16`, and outbound writable `mutable-bytes` spans.
- **7** — bigint-backed `i64`, `u64`, and opaque `pointer` values for direct calls and same-thread callbacks, not foreign-thread parameters. Integer inputs retain low 64 bits; pointer inputs retain pointer-width bits. Also adds static `node:ffi` catalogs and Darwin `frameworks`.

`ffi_format` is required. Function entries require `name`, `symbol`, `params`, and `returns`; format 7 allows `library`. Unknown fields and signature mismatches are `SC5xxx`. Later formats retain earlier capabilities. The same manifest can be passed to `scriptc coverage`.

## Static node:ffi catalogs

Format 7's `library` names link-time bindings that a package can request through `ffi.dlopen`; no library is loaded at runtime. Root `callbacks` entries precompile same-thread callback signatures, with a fixed capacity of 1–256 (default 16). Stop native use before unregistering callbacks or closing the library. Catalog calls enforce arity and scalar ranges, and use numbers for the Node API's `bool` alias, unlike direct manifest boolean bindings. See the source example before adapting a package.

## Limits

Native calls are synchronous and must return normally (no C++ unwind / `longjmp` across the boundary). Native code is outside scriptc's exception, refcount, and sanitizer contracts. No variadics, struct-by-value, owned pointer returns, or runtime `dlopen`. Archives must match the build target. Outbound FFI is for executable builds, not `scriptc build --lib`.
