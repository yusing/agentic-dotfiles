# encoding/json/v2 interface

Go 1.27 enables `encoding/json/v2` by default (`JSONv2` is a baseline experiment). Import the packages; do not set `GOEXPERIMENT`.

## Semantic functions

All take optional `...json.Options`. Later options override earlier ones. `jsontext.Options` may be mixed in.

| Call | Input / output | Newline |
| --- | --- | --- |
| `json.Marshal(v, opts...)` | Go value → `[]byte` | none |
| `json.Unmarshal(data, v, opts...)` | `[]byte` → pointer | n/a; exactly one JSON value plus whitespace |
| `json.MarshalWrite(w, v, opts...)` | Go value → `io.Writer` | none |
| `json.UnmarshalRead(r, v, opts...)` | `io.Reader` → pointer | n/a; consumes the reader to EOF as one value |
| `json.MarshalEncode(enc, v, opts...)` | Go value → `*jsontext.Encoder` | encoder's top-level newline |
| `json.UnmarshalDecode(dec, v, opts...)` | `*jsontext.Decoder` → pointer | n/a; one value from the stream |

There is no `MarshalIndent`, `MarshalString`, `Valid`, `NewEncoder`, or `NewDecoder` on v2.

```go
data, err := json.Marshal(v, jsontext.WithIndent("  "))
ok := jsontext.Value(data).IsValid()
err = json.MarshalEncode(jsontext.NewEncoder(w), v) // value + newline
```

## jsontext streaming

`jsontext.NewEncoder(w, opts...)` writes a stream of top-level JSON values, each terminated with a newline.
`jsontext.NewDecoder(r, opts...)` reads a stream of top-level JSON values separated by whitespace.

`jsontext.Value` is raw JSON (`[]byte`). Methods: `IsValid`, `Indent`, `Kind`.

## Options on `encoding/json/v2`

| Option | Effect |
| --- | --- |
| `Deterministic(true)` | Stable bytes; map keys sorted |
| `RejectUnknownMembers(true)` | Unknown struct object names fail |
| `MatchCaseInsensitiveNames(true)` | Name match ignores case, `-`, and `_` unless v1 delimiter option is on |
| `FormatNilSliceAsNull(true)` | `nil` slice → `null` |
| `FormatNilMapAsNull(true)` | `nil` map → `null` |
| `OmitZeroStructFields(true)` | Omit zero struct fields (`omitzero` on every field) |
| `StringifyNumbers(true)` | Numbers as JSON strings |
| `WithMarshalers` / `WithUnmarshalers` | Per-type overrides |
| `DefaultOptionsV2()` | Explicit v2 defaults |

`json.JoinOptions` / `json.GetOption` compose and inspect options.

Unknown-member errors wrap `json.ErrUnknownName` in `*json.SemanticError`. Match with `errors.Is`. Do not match the full `Error()` string (`cannot` vs `unable to` is Hyrum-proofed). Extra input after one value reports `after top-level value`.

## Options on `encoding/json/jsontext`

| Option | Effect |
| --- | --- |
| `WithIndent(s)` | Multiline indent; implies multiline (`"  "` is the common case) |
| `WithIndentPrefix(s)` | Prefix each indented line |
| `Multiline(true)` | Multiline with default indent `"\t"` |
| `EscapeForHTML(true)` | Escape `<`, `>`, `&` |
| `EscapeForJS(true)` | Escape U+2028 / U+2029 |
| `AllowDuplicateNames(true)` | Permit duplicate object names |
| `AllowInvalidUTF8(true)` | Replace invalid UTF-8 instead of failing |
| `SpaceAfterColon` / `SpaceAfterComma` | Whitespace around separators |

## Options on `encoding/json` (v1)

Pass these into v2 calls. Use only the named difference.

| Option | Typical use |
| --- | --- |
| `DefaultOptionsV1()` | Full v1 semantics |
| `FormatDurationAsNano(true)` | `time.Duration` as nanosecond JSON number |
| `OmitEmptyWithLegacySemantics(true)` | v1 `omitempty` (empty Go value) |
| `MatchCaseSensitiveDelimiter(true)` | Case-insensitive match is `EqualFold` only |

v1 `Decoder.UseNumber` is not a public v2 option.

## Numbers in `any`

Register an unmarshaler on `*any`. That sets `fromAny` and skips the optimized `any` path, so nested object and array numbers are covered too.

```go
var useNumber = json.WithUnmarshalers(json.UnmarshalFromFunc(func(dec *jsontext.Decoder, v *any) error {
	if dec.PeekKind() != '0' {
		return errors.ErrUnsupported
	}
	raw, err := dec.ReadValue()
	if err != nil {
		return err
	}
	*v = jsonv1.Number(raw)
	return nil
}))

err := json.Unmarshal(data, &value, useNumber)
```

`jsonv1.Number` implements v2 `MarshalJSONTo` and encodes as a JSON number.
