# v2 behavior versus v1

v2 is stricter and closer to RFC 8259 / RFC 7493. Apply these defaults unless a named option or struct tag overrides them.

## Encode

| Topic | v2 default | v1 default |
| --- | --- | --- |
| `nil` slice | `[]` | `null` |
| `nil` map | `{}` | `null` |
| map key order | unspecified | sorted |
| HTML / JS bytes in strings | unescaped | `\u003c`, `\u003e`, `\u0026`, `\u2028`, `\u2029` |
| `[N]byte` | base64 string | JSON array of numbers |
| `time.Time` | RFC 3339 with nanoseconds | RFC 3339Nano, looser parse |
| `time.Duration` | error | nanosecond JSON number |
| `omitempty` | omit empty JSON (`null`, `""`, `{}`, `[]`) | omit empty Go value (`false`, `0`, `nil`, empty slice/map/string) |
| invalid UTF-8 | error | replacement character |
| pointer-receiver `MarshalJSON` | always called | only if the value is addressable |
| `MarshalJSON` on map keys | eligible | ignored |

Empty structs with no JSON-representable fields error at runtime. Malformed `json` tags error at runtime.

## Decode

| Topic | v2 default | v1 default |
| --- | --- | --- |
| struct field names | case-sensitive exact match | case-insensitive |
| unknown members | ignored | ignored (`Decoder.DisallowUnknownFields` to reject) |
| duplicate object names | error | last/merge wins |
| invalid UTF-8 | error | replacement character |
| JSON `null` into a value | zero the value | inconsistent keep-or-zero |
| Go array length | must match JSON array length | any length |
| `any` JSON number | `float64` | `float64` (`UseNumber` → `json.Number`) |
| merge into existing values | merge JSON objects; replace other kinds | broader in-place merge |

`RejectUnknownMembers(true)` is the v2 equivalent of `DisallowUnknownFields`.

## Struct tags

v2 and v1 share `json:"name,opt"`. v2 adds or tightens:

- `omitzero` — omit a zero Go value (`IsZero()` when present).
- `omitempty` — omit empty JSON, not empty Go (see table).
- `string` — stringify JSON numbers only, not bools or strings.
- `case:ignore` / `case:strict` — per-field name matching.
- `embed` — promote nested JSON object members.

A field tagged `json:"-"` stays ignored. Unexported fields may only use `json:"-"`.

## Observable output

When stdout, files, hashes, or golden tests depend on bytes:

- HTML in strings will appear unescaped unless `jsontext.EscapeForHTML(true)`.
- `nil` slices become `[]` unless `json.FormatNilSliceAsNull(true)`.
- Map key order can change unless `json.Deterministic(true)`.
- Zero `int`/`bool` with `omitempty` is present in v2 (`0` / `false`). Prefer `omitzero` when the field should stay absent.
