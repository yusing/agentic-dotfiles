---
name: js-ts-best-practices
description: Write, refactor, or review JavaScript and TypeScript with clear names, exact boundary types, low boilerplate, simple control flow, and maintainable string handling.
---

# JS/TS

## Rules

- Names expose intent. Types expose contracts. Comments explain hidden reasons.
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
- Optimize for tracing, readability, and maintenance. Cleverness loses.

## Patterns

```ts
const url = `/users/${userId}/posts/${postId}`;
const normalized = value.replaceAll("_", "-");

function getEmail(user?: User): string | null {
  return user?.profile?.email ?? null;
}

type UserPayload = {
  id: string;
  name: string;
};

function createUser(input: UserPayload) {}
function updateUser(input: UserPayload) {}
```

Before using `replaceAll`, confirm configured ECMAScript target/runtime supports
it.
