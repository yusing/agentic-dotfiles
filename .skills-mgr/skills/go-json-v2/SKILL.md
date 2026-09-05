---
name: go-json-v2
description: Use encoding/json/v2 for new or migrated JSON in Go 1.27+.
---

# Go JSON v2

Use `encoding/json/v2` for new and migrated JSON on Go 1.27+.

Read [references/api.md](references/api.md) for functions and options.
Read [references/behavior.md](references/behavior.md) before changing JSON bytes a caller or test can see.
Read [references/migration.md](references/migration.md) when replacing `encoding/json` or `github.com/bytedance/sonic`.

## Imports

```go
jsonv1 "encoding/json"
"encoding/json/jsontext"
json "encoding/json/v2"
```

Import v2 as `json`. Import `jsontext` for indent, streaming, and validity. Import v1 for `jsonv1.Number` or the v1 compatibility options required by a named contract.

## Rules

- Call `json.Marshal` / `json.Unmarshal` on `[]byte`. Turn a string with `string(data)` or `[]byte(text)`.
- Pass a pointer to `Marshal` when the value is already addressable.
- Keep a trailing newline only where `Encoder.Encode` used to write one: `json.MarshalEncode(jsontext.NewEncoder(w), v)`.
- Reject unknown object members with `json.RejectUnknownMembers(true)` and `errors.Is(err, json.ErrUnknownName)`.
- Opt into one named difference (`json.Deterministic(true)`, `json.MatchCaseInsensitiveNames(true)`, `jsonv1.FormatDurationAsNano(true)`) instead of `jsonv1.DefaultOptionsV1()`, unless a named contract needs full v1 semantics.
- Preserve JSON numbers in `any` with `json.WithUnmarshalers` over `*any` as in [references/api.md](references/api.md#numbers-in-any).
