# RFC 0001: List Identity Lifecycle Contract

- Status: Accepted
- Target: Likftc 1.0
- Scope: `@vp-tw/likftc` and every framework adapter

## Problem

Animation libraries can retain a removed DOM instance while its exit transition finishes. If an item with the same logical ID re-enters before that exit completes, a framework key derived directly from the logical ID can bind the entering item to the exiting instance.

Likftc must assign one transition identity to each continuous presence interval. The identity remains stable while the item is present and changes after any observed absence.

The 0.x `get()` and `sync()` API mutates shared state during render and retires identities later in an effect or watcher. That split is not transactional and cannot define reliable behavior for interrupted or repeated renders.

## Terms

- **Logical ID:** Application identity returned by `getId(item)`. It is a finite number or string.
- **Transition key:** An opaque number issued by Likftc and scoped to one adapter instance.
- **Frame:** One ordered list of items supplied in a single reconciliation.
- **Presence interval:** Consecutive committed frames in which a logical ID is present.
- **Enter:** A logical ID is present in the next frame but absent from the previous frame.
- **Retain:** A logical ID is present in both frames.
- **Exit:** A logical ID is absent from the next frame but present in the previous frame.

## Decision

The core is a pure reducer:

```ts
const result = reconcile(previousState, items, { getId });
```

`reconcile` never mutates `previousState`, `items`, or item objects. It returns an immutable next state, ordered entries, and lifecycle events. Framework adapters own state storage and commit timing through their native state primitives.

The public core direction is:

```ts
type LogicalId = string | number;
type TransitionKey = number;

interface IdentityEntry<Item, Id extends LogicalId> {
  readonly item: Item;
  readonly id: Id;
  readonly key: TransitionKey;
  readonly index: number;
}

interface IdentityState<Id extends LogicalId> {
  readonly nextKey: number;
  readonly active: readonly {
    readonly id: Id;
    readonly key: TransitionKey;
  }[];
}

interface ReconcileOptions<Item, Id extends LogicalId> {
  readonly getId: (item: Item) => Id;
}
```

`IdentityState` is nominally branded and can only be created by `createIdentityState()` or returned by
`reconcile()`. Its fields are exposed for diagnostics, not structural construction.

## Required invariants

### Identity

1. A logical ID receives exactly one transition key during one continuous presence interval.
2. Reordering does not change a retained item's transition key.
3. Replacing the item object does not change the key when `getId` returns the same logical ID.
4. Any committed absent frame ends the presence interval.
5. Re-entry after absence always receives a fresh transition key.
6. Keys are unique among all entries in a frame.
7. Keys increase monotonically within one state lineage and are never recycled.
8. Transition keys are opaque and meaningful only within one adapter instance.

### Atomicity and purity

1. One call receives the complete next frame; there is no separate `get`/`sync` ordering contract.
2. Invalid input throws before a next state is observable.
3. Repeated reconciliation from the same state and equivalent frame returns equivalent keys and events.
4. An abandoned reconciliation cannot change the previous state.
5. Framework adapters commit the returned state through native transactional primitives; render-time mutation of a tracker object is forbidden.

### Input validation

1. Duplicate logical IDs in one frame are an error in every build mode.
2. `NaN`, `Infinity`, and `-Infinity` are invalid logical IDs.
3. `0`, `-0`, and empty strings are valid IDs. JavaScript SameValueZero semantics make `0` and `-0` the same ID.
4. If `getId` throws, the error propagates and the previous state remains valid.
5. Key exhaustion at `Number.MAX_SAFE_INTEGER` throws instead of wrapping or reusing a key.

### Memory and environment

1. Core memory is proportional to the currently active frame, not all IDs ever observed.
2. Retired IDs and their keys are absent from the next state's active list.
3. No package reads `window`, `document`, browser storage, or layout state at module scope.
4. Importing every built package in Node must succeed even though rendering and hydration are outside the v1 support scope.

## Lifecycle events

Each reconciliation returns deterministic events for diagnostics, tests, and demos:

- `enter`: logical ID, key, and next index.
- `retain`: logical ID, key, previous index, next index, and whether it moved.
- `exit`: logical ID, retired key, and previous index.

Event ordering is deterministic:

1. `exit` events in previous-frame order.
2. `enter` and `retain` events in next-frame order.

Adapters do not expose these diagnostics by default. The docs demo may consume an internal diagnostic entry point that is excluded from public package exports.

## Reference scenarios

Assume the first key is `0`.

| Previous frames | Next frame | Expected keys | Required events                |
| --------------- | ---------- | ------------- | ------------------------------ |
| none            | `[a, b]`   | `a:0, b:1`    | enter a, enter b               |
| `[a, b]`        | `[a, b]`   | unchanged     | retain a, retain b             |
| `[a, b]`        | `[b, a]`   | unchanged     | retain b moved, retain a moved |
| `[a, b]`        | `[b]`      | `b:1`         | exit a, retain b moved         |
| `[a]`, `[]`     | `[a]`      | `a:1`         | enter a with a fresh key       |
| `[a, b]`        | `[b, c]`   | `b:1, c:2`    | exit a, retain b, enter c      |
| `[0]`           | `[0]`      | unchanged     | retain 0                       |

The executable conformance suite is authoritative if prose and implementation disagree.

## Framework commit requirements

- React stores reducer output in framework state and conditionally adjusts that state during render so React retries before rendering children. Preact follows the same pattern only after native compatibility fixtures pass. Shared mutable refs may not allocate or retire keys during render.
- Vue and Solid reconcile through their reactive ownership model and dispose instance state on unmount.
- Svelte uses Svelte 5-compatible state and must not rely on legacy slot-prop components.
- The experimental Qwik adapter remains client-only, uses component-lifetime state, pins the Qwik 2 beta peer exactly, and documents its isolated upstream declaration exception.
- Angular uses signals and supports zoneless CSR operation.
- The Web adapter owns one controller state per connected consumer and releases it on disconnect.

Every adapter must prove DOM instance identity through the shared browser conformance suite, not merely compare returned key values.

## Removed 0.x behavior

- The split `get()` and `sync()` API is removed.
- A custom raw key generator is removed because arbitrary output can collide with an exiting key and requires unbounded historical storage to validate safely.
- Default random keys are removed in favor of monotonic opaque numeric keys.

The migration guide must identify these breaks and show the adapter-native replacement.

## Acceptance gates

This RFC becomes accepted only when:

1. Property tests cover arbitrary valid frame sequences and all invariants.
2. Invalid-input tests prove atomic failure.
3. An intentionally mutable implementation fails the React Strict Mode test.
4. React, Vue, and Svelte pass the same DOM identity scenarios.
5. Package import and declaration checks pass under TypeScript 7 and TypeScript 6.
