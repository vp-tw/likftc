# ADR 0003: Render-Transactional React and Preact Adapters

- Status: Accepted after browser conformance tests
- Date: 2026-07-13

## Context

List keys are rendering data. The 0.x adapter stores a mutable tracker in `useRef`, allocates keys during render, and retires them later in an effect. React explicitly warns against reading or writing render-relevant refs during rendering, and Strict Mode repeats pure calculations to expose mutation.

Updating identity only in an effect is also too late: children render once with stale keys before the effect runs.

## Decision

The adapter calls the pure core reducer on every render using the current framework state snapshot.

```ts
const [identityState, setIdentityState] = useState(createIdentityState);
const result = reconcile(identityState, items, options);

if (result.state !== identityState) {
  setIdentityState(result.state);
}

return result.entries;
```

The reducer returns the identical state object when the ordered logical-ID frame is unchanged. Therefore the setter is conditional and converges after one immediate retry.

React documents this narrow render-time state adjustment pattern: React discards the current output and retries the component before rendering its children. The reducer and initializer must remain pure because Strict Mode can invoke them twice.

Preact uses the same shape only after current and minimum-version fixtures prove convergence without `preact/compat`. If native Preact behavior differs, the Preact adapter may use a framework-specific owner component, but it may not fall back to shared render-time mutation.

## Rejected alternatives

- A mutable `useRef` tracker: render-relevant mutation is invisible to the scheduler and unsafe under repeated rendering.
- Effect-only synchronization: keys are stale for one child render and re-entry can reuse an exiting identity.
- Global key allocation: leaks state across component instances, complicates teardown, and makes tests order-dependent.
- `useMemo` as storage: memoization is a performance hint, not a lifecycle store.

## Verification

- Strict Mode double-render test with no duplicate allocations.
- Abandoned transition followed by a different frame.
- Rapid `[a] -> [] -> [a]` updates before exit cleanup.
- Remount resets instance-scoped key state without touching another list.
- Preact native hook fixture with no React compatibility alias.

## Sources

- [React `useState`: storing information from previous renders](https://react.dev/reference/react/useState#storing-information-from-previous-renders)
- [React: keeping components pure](https://react.dev/learn/keeping-components-pure)
- [React `useRef` caveats](https://react.dev/reference/react/useRef#caveats)
