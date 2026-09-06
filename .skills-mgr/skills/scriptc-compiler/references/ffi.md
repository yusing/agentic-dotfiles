# scriptc native FFI

Source: [scriptc.dev/ffi](https://scriptc.dev/ffi).

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
| `cstring` | `string` | `const char *` | callback only (formats 3–4) | no |
| `string` | `string` | `const uint8_t *, size_t` (UTF-8) | yes | no |
| `bytes` | `Uint8Array` or `Buffer` | `const uint8_t *, size_t` | yes | no |
| `void` | `void` | `void` | no | yes |

TypeScript `number` cannot distinguish integer vs double — the manifest is the ABI authority. Outbound string/byte pointers are borrowed for the call only; native code must not retain them. Empty spans may be a null pointer. No pointer/string/byte **returns** in current formats.

## Later formats

- **2** — call-scoped C function-pointer + optional context (`void *`). TypeScript has no context parameter; the compiler supplies it.
- **3** — copy-in `cstring` / `string` / `bytes` callback parameters.
- **4** — `lifetime: "retained"` plus a paired release binding. Release the same function value that was registered.
- **5** — `invoke: "foreign"` on a retained, context-bearing, `void` callback. Native trampoline enqueues to the script event loop; not real-time; value-returning foreign callbacks are refused.

`ffi_format` on the manifest is required. Every function entry has exactly `name`, `symbol`, `params`, `returns`. Unknown fields and signature mismatches are `SC5xxx`. The same manifest can be passed to `scriptc coverage`.

## Limits

Native calls are synchronous and must return normally (no C++ unwind / `longjmp` across the boundary). Native code is outside scriptc's exception, refcount, and sanitizer contracts. No variadics, struct-by-value, owned pointer returns, or runtime `dlopen`. Archives must match the build target. Outbound FFI is for executable builds, not `scriptc build --lib`.
