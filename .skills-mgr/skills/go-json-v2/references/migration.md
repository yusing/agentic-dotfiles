# Migration

Go 1.27 implements v1 `encoding/json` on top of v2. `jsonv1.Marshal(v)` is `json.Marshal(v, jsonv1.DefaultOptionsV1())`. Call sites compile after an import change; bytes and errors often do not.

Prefer v2 defaults. Add one option when a test, on-disk file, or interop contract names the old behavior. Take `jsonv1.DefaultOptionsV1()` only when the whole v1 set is required.

## From `encoding/json`

| Old | New |
| --- | --- |
| `json.Marshal(v)` | `json.Marshal(v)` with v2 import |
| `json.Unmarshal(b, &v)` | `json.Unmarshal(b, &v)` |
| `json.MarshalIndent(v, "", "  ")` | `json.Marshal(v, jsontext.WithIndent("  "))` |
| `json.NewEncoder(w).Encode(v)` | `json.MarshalEncode(jsontext.NewEncoder(w), v)` |
| `json.NewDecoder(r).Decode(&v)` | `json.UnmarshalRead(r, &v)` or `json.Unmarshal(data, &v)` |
| `enc.SetEscapeHTML(false)` | v2 default |
| `enc.SetIndent("", "  ")` | `jsontext.WithIndent("  ")` on marshal |
| `dec.DisallowUnknownFields()` | `json.RejectUnknownMembers(true)` |
| `dec.UseNumber()` | `WithUnmarshalers` on `*any` ([api.md](api.md#numbers-in-any)) |
| `json.Valid(b)` | `jsontext.Value(b).IsValid()` |
| trailing-value `Decode` loop | `Unmarshal` / `UnmarshalRead` (one value); leftover input errors with `after top-level value` |

`json.Number` stays on the v1 package.

Check [behavior.md](behavior.md) for `omitempty`, nil slices/maps, case matching, `time.Duration`, and duplicate names.
Check [api.md](api.md) for unknown-member and trailing-value errors.

## From Sonic

Map Sonic APIs onto v2. Do not keep a Sonic-shaped wrapper.

| Old | New |
| --- | --- |
| `sonic.Marshal` / `Unmarshal` | `json.Marshal` / `Unmarshal` |
| `sonic.MarshalString(v)` | `data, err := json.Marshal(v)` then `string(data)` |
| `sonic.UnmarshalString(s, &v)` | `json.Unmarshal([]byte(s), &v)` |
| `sonic.MarshalIndent(v, "", "  ")` | `json.Marshal(v, jsontext.WithIndent("  "))` |
| `sonic.Valid(b)` | `jsontext.Value(b).IsValid()` |
| `sonic.ConfigStd.Marshal*` | `json.Marshal` plus the v1-like options the call actually needed |
| `sonic.ConfigDefault.Marshal*` / `NewEncoder` | v2 defaults; `MarshalEncode` if a newline is required |
| `ConfigStd.NewDecoder` + `DisallowUnknownFields` | `json.Unmarshal(..., json.RejectUnknownMembers(true))` |
| `Config{UseNumber: true}` | [numbers in `any`](api.md#numbers-in-any) |

`ConfigStd` is the v1-compatible Sonic profile (HTML escape, sorted maps, case-insensitive names, nil → `null`). Replace each of those with a named v2/v1 option only where a contract still needs it. `ConfigDefault` is already close to v2 (no HTML escape, unsorted maps).

Duplicate-key and invalid-UTF-8 inputs that Sonic accepted will fail in v2 unless `jsontext.AllowDuplicateNames(true)` or `jsontext.AllowInvalidUTF8(true)`.
