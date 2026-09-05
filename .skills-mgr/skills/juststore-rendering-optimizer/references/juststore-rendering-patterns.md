# Juststore Rendering Patterns

Use these portable patterns to choose subscription and component boundaries. Adapt the placeholder state paths to the active project instead of assuming a particular store shape.

## Decision Table

| Need | Prefer | Avoid |
| --- | --- | --- |
| Render one leaf value | `state.leaf.use()` in the smallest component | Subscribing to its parent object |
| Render a derived scalar | `state.leaf.useCompute(fn)` | Recomputing from a root subscription |
| Render a state value and setter in one small region | `RenderWithUpdate` | Lifting the value into a broad parent |
| Show/hide while preserving child state | `Conditional` | Parent `use()` plus inline JSX branching |
| Remove/remount a hidden subtree | `ConditionalRender` | `Conditional` when retained state is unwanted |
| React to a state change with a write or external effect | `subscribe` inside `useEffect` with cleanup | `subscribe` in the component body |
| Adapt a field bidirectionally | Stable `derived({ from, to })` | Duplicated conversion in render and change handlers |
| Render a dynamic object's keys | `keys.use()` or `keys.useCompute(...)` | Subscribing to every object value |
| Adapt an entire collection for a whole-value child API | Narrow collection `use()` plus `useMemo` | Root-store subscription or unmemoized mapping |

## Scope Conditional Rendering

A broad component subscription makes every change re-render unrelated controls:

```tsx
function ConnectionPanel() {
  const mode = connectionSettings.mode.use()

  return (
    <Panel>
      <UnrelatedControls />
      {mode !== 'disabled' && <EndpointList state={connectionSettings.endpoints} />}
    </Panel>
  )
}
```

Delegate the visibility subscription to the smallest reactive region:

```tsx
<Conditional
  state={connectionSettings.mode}
  on={mode => mode != null && mode !== 'disabled'}
>
  <EndpointList state={connectionSettings.endpoints.ensureArray()} />
</Conditional>
```

`Conditional` calls `useCompute` internally and uses React `Activity`; it hides the subtree while preserving its component state. Use `ConditionalRender` instead when hiding must remove and later remount the subtree.

## Own Imperative Subscriptions

Never register an imperative subscription during render:

```tsx
function ConnectionPanel() {
  connectionSettings.mode.subscribe(mode => {
    if (mode === 'disabled') connectionSettings.endpoints.reset()
  })
  // ...
}
```

This registers a listener during render and discards its unsubscribe function. Each re-render can add another listener; React Strict Mode makes render-phase registration even less predictable.

Own the reaction with an effect and return the unsubscribe function:

```tsx
useEffect(() => {
  const unsubscribe = connectionSettings.mode.subscribe(mode => {
    if (mode === 'disabled') {
      connectionSettings.endpoints.reset()
    }
  })
  return unsubscribe
}, [])
```

The empty dependency list is appropriate only when `connectionSettings` is a module-scope handle into a singleton store. If a state handle comes from props or another component-local owner, include it and every other captured value in the dependency list. When one reaction needs several subscriptions, create them in one effect and return a cleanup that unsubscribes all of them.

## Derived State for Compatibility Fields

A deprecated switch can use a field-level bidirectional adapter:

```tsx
const legacyEnabled = settings.deprecated_feature.derived({
  from: value => value,
  to: value => (value ? value : undefined),
})
```

This is preferable to subscribing a parent and manually rewriting the configuration object:

- The derived handle is defined once at module scope.
- Reads remain scoped to the underlying leaf.
- Writes map `false` to `undefined`, removing the deprecated field instead of serializing stale compatibility configuration.
- `reset()` continues to operate on the source field.

For every derived adapter, verify `from`, `to`, and reset/omission behavior. Use `useCompute` instead when consumers never write through the derived value.

## Key-Only and Whole-Collection Boundaries

A selector that only needs entry names should subscribe to keys:

```tsx
const itemNames = catalog.items.keys.use()
```

This avoids re-rendering when an item's internal content changes but its key set does not.

A whole-collection subscription is justified when a child adapter accepts and replaces the complete collection. Memoize any conversion from that one collection subscription:

```tsx
const rules = settings.rules.ensureObject().use()
const workingValue = useMemo(
  () => Object.values(rules).map(normalizeRule),
  [rules],
)

return <RuleListEditor value={workingValue} onChange={settings.rules.set} />
```

Do not generalize this into a root-object subscription. If the child editor gains path-level state support, move the boundary down to keys and individual entries.

## Stable Handles Versus Reactive Reads

These module-scope declarations create reusable path handles; they do not themselves subscribe a React component:

```tsx
const settings = appStore.settingsObject
const connectionSettings = settings.connection.ensureObject()
```

Reactive work begins when code calls `use`, `useState`, `useCompute`, renders a juststore reactive utility, or invokes `subscribe`. Keep stable path and derived handles outside render when they target a singleton store. Keep form-instance or prop-derived handles within the owning component and include them in effect dependencies.

## Field updates and shared values

- Use `useState()` for a single field's value/setter pair and `Render` for a small read-only region.
- Create `createAtom(id, defaultValue)` at the common root/container when sibling children need
  one shared value. Pass the handle, not a parent-subscribed primitive.
- Write to the narrowest path, such as `state.at(i).field.set(v)`. Use functional updates when
  the next value depends on the current one, `reset()` for delete/default semantics, and
  `rename()` for dynamic object keys.
- Cross-field cleanup belongs in an effect subscription or supported change callback, not render.
- A control's `defaultValue` does not decide whether the persisted domain path is absent or
  explicitly written; preserve that contract separately.

## High-frequency sources

Use `useDebounce(delay)` for search/filter work when delayed processing is acceptable.
Keep temporary interaction state in `useMemoryStore` rather than app-wide persistence. Use
`createMixedState(...)` only for values genuinely coupled in rendering decisions. Prefer an atom
to a frequently changing parent value shared by siblings. Avoid full-store replacement for
incremental events unless a whole-value contract requires it.
