---
name: juststore-rendering-optimizer
description: "Specialized guidance for designing and refactoring React state with juststore, useForm, useMemoryStore, and createMixedState in frontend codebases. Use when implementing features or reviewing code that relies on juststore and you need to reduce unnecessary re-renders, improve subscription granularity, and keep derived state stable."
---

# Juststore Rendering Optimizer

Use this skill to make `juststore` usage fast, predictable, and easy to maintain.

## Workflow

1. Identify the state owner, hot paths, and churn points.
2. Inventory every reactive read (`use`, `useState`, `useCompute`, `Conditional`, `Render`) and every imperative subscription.
3. Pick the narrowest subscription API and smallest component boundary that satisfies each consumer.
4. Push derived computation to `useCompute` or a stable `derived` state close to the owning path.
5. Isolate bursty input and websocket updates with debounce or local memory stores.
6. Keep writes immutable and path-specific; avoid broad root updates unless intentional.
7. Verify subscription cleanup, derived-state round trips, and component/state boundary alignment.

## Apply Subscription Granularity Rules

- Prefer `store.a.b.c.use()` over root-level `store.use('a')` when only a leaf is needed.
- Use `useState()` when you need `[value, setValue]` for a single field.
- Use `createAtom(id, defaultValue)` for a single shared value that many children read/write.
- Create the atom at the common root/container level and pass the atom object to children; avoid parent `use()` subscription so parent does not re-render on atom changes.
- Treat state proxies as handles: defining a path, `ensureObject()`, `ensureArray()`, or `derived(...)` does not require the containing component to subscribe. Keep reusable handles at module or stable container scope when the store is a singleton.
- Use `Render` when a small render-prop region needs a value and `RenderWithUpdate` when it also needs a setter.
- Use `Conditional` to scope a visibility predicate while preserving the hidden subtree's component state. It uses `useCompute` internally and React `Activity` rather than returning `null`.
- Use `ConditionalRender` when the hidden subtree should be absent and remounted when shown.
- Prefer a scoped conditional component over calling `state.use()` in a large parent solely to choose whether one child is visible.
- Use `keys.use()` or `keys.useCompute(...)` for object-key-driven lists instead of subscribing to full objects.
- Use `useCompute` to keep computed outputs referentially stable and avoid recomputing in parent renders.

## Manage Imperative Subscription Lifecycles

- Never call `state.subscribe(...)` in a React component body. Rendering must not register listeners or perform writes; repeated renders and Strict Mode can accumulate subscriptions and duplicate side effects.
- Register imperative subscriptions in `useEffect`, return every unsubscribe function, and use dependencies that reflect the state handle and captured values.
- Prefer one effect that owns all subscriptions for one reaction and returns a combined cleanup when several paths trigger the same action.
- Keep subscription callbacks narrow and idempotent. Read non-reactive `.value` fields inside the callback only when the reaction needs a current snapshot without another React subscription.
- If a component only needs to render from state, use `use`, `useCompute`, `Render`, or `Conditional`; reserve `subscribe` for effects that must write elsewhere or invoke an external imperative API.

```tsx
useEffect(() => {
  const unsubscribe = state.mode.subscribe(mode => {
    if (mode === 'disabled') state.dependentItems.reset()
  })
  return unsubscribe
}, [state])
```

When the state handle is a module-scope singleton, the dependency list can be empty; state passed through props belongs in the dependency list.

## Design Stable Derived State

- Use `state.derived({ from, to })` for a reversible field-level adapter, not for broad computed objects.
- Define reusable derived state outside render when its source path is stable. Avoid recreating virtual state identities on every render.
- Verify both directions: `from` must expose the intended UI value, and `to` must serialize the intended domain value.
- Use `to` to preserve omission semantics when appropriate, such as mapping a deprecated switch's off value to `undefined` so the old field is removed.
- Use `useCompute` instead when no write mapping is needed.
- Do not confuse a control's `defaultValue` with persisted state. Decide separately whether the domain path should remain absent or be written explicitly.

## Apply Update Rules

- Write to the narrowest path (`state.at(i).field.set(v)`), not the entire collection, when editing one item.
- Use functional updates (`set(prev => ...)`) when next state depends on current state.
- Use `reset()` for delete/default semantics instead of ad-hoc mutation logic.
- Use `rename()` for key renames in dynamic object editors.
- Make cross-field cleanup explicit and lifecycle-safe; for example, reset an obsolete sibling path from an effect subscription or a supported field-change callback, never during render.
- Whole-object or whole-array subscriptions and writes are acceptable only at a real adapter boundary whose child API consumes and replaces the complete collection. Memoize the adapter output from the subscribed value.

## Handle High-Frequency Sources

- Use `useDebounce(delay)` for search/filter input before API calls or expensive filtering.
- Keep temporary UI interaction state in `useMemoryStore` instead of app-wide persistent stores.
- Use `createMixedState(...)` only when combined values are genuinely coupled for rendering decisions.
- Prefer `Atom` over lifting a frequently changing single value into parent React state when many sibling children need that value.

## Anti-Patterns To Reject

- Subscribing a container to an entire object/array when children can subscribe to leaf nodes.
- Subscribing the parent to an atom value and then prop-drilling primitive values to children, which causes cascade re-renders.
- Calling `.subscribe()` or any state write in a component body.
- Calling a leaf's `.use()` in a broad parent only to drive one conditional child when `Conditional` or `ConditionalRender` can own that region.
- Recreating `derived` state adapters in render when the source path is stable.
- Treating `Conditional` and `ConditionalRender` as interchangeable: the former preserves hidden child state; the latter removes the subtree.
- Deriving large arrays/objects inline in render when `useCompute` can memoize by store value equality.
- Emitting full-store replacement updates for incremental websocket events without reason.
- Mixing transient UI state and persisted domain state in the same store path.

## Detailed Reference

- Read `{SKILL_DIR}/references/juststore-rendering-patterns.md` for portable decision guidance and self-contained examples.

## Completion Checklist

- Confirm each component subscribes to the smallest useful path.
- Confirm derived values are computed via `useCompute` or memoized from stable inputs.
- Confirm every imperative `subscribe()` is owned by an effect or external lifecycle and always unsubscribes.
- Confirm no subscription registration or store write occurs during render.
- Confirm each `derived({ from, to })` adapter has correct read, write, reset, and omission behavior.
- Confirm `Conditional` versus `ConditionalRender` matches the required hidden-state lifecycle.
- Confirm high-frequency input/network updates are debounced or isolated.
- Confirm dynamic list/map UIs subscribe by key/index instead of full object snapshots.
- Confirm any whole-collection subscription is required by a whole-collection child API and its transformation is memoized.
