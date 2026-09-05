---
name: js-ts-best-practices
description: Apply local JavaScript and TypeScript conventions when changing or reviewing code.
---

# JS/TS

## Rules

- Type inputs, outputs, shared shapes, and exported APIs. Let obvious locals infer.
- Reuse existing utilities and patterns before adding helpers or indirection.
- Keep control flow flat: early returns, optional chaining, nullish coalescing,
  focused functions.
- Prefer precise unions and domain types over loose strings, `any`, casts, or
  duplicated inline shapes.
- Build interpolated strings with template literals.
- Literal text operation: prefer string APIs. Pattern matching: use regex.
  Global literal replacement may use `replaceAll` when target runtime supports it.
- Add JSDoc only when names and types cannot express contract, invariant, side
  effect, or compatibility constraint.
