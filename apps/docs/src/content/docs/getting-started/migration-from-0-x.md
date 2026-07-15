---
title: Migrate from 0.x
description: Replace the split key lifecycle with one atomic, framework-native reconciliation step.
---

Version 1 replaces the 0.x package family and its manual `get()` / `sync()` lifecycle with `@vp-tw/likftc`. The new adapters reconcile the complete ordered frame before rendering, so a failed update cannot partially allocate or retire identities.

## Package and lifecycle changes

| 0.x                                                                 | Version 1                                                         |
| ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `@likftc/core`, `@likftc/react`, `@likftc/vue`, or `@likftc/svelte` | `@vp-tw/likftc` with a framework subpath                          |
| Call `sync(items)` after an update, then call `get(id)` per row     | Pass the complete item array once and render the returned entries |
| Pass a custom random or sequential key generator                    | Keys are opaque, monotonic numbers owned by the adapter           |
| Use primitive IDs as the input list                                 | Pass your items and derive each logical ID with `getId`           |

The custom generator was removed because arbitrary output can collide with an identity that is still exiting. Default random keys were removed so identity allocation is deterministic and testable.

## React example

```tsx
import { useLikftc } from "@vp-tw/likftc/react";

const entries = useLikftc(items, { getId: (item) => item.id });

return entries.map((entry) => <Row key={entry.key} item={entry.item} />);
```

Vue receives a computed ref from `@vp-tw/likftc/vue`, Svelte receives a readable store from `@vp-tw/likftc/svelte`, and Solid receives a reactive key controller from `@vp-tw/likftc/solid`. Each framework guide shows the complete native integration.

## Framework-neutral example

```ts
import { createLikftc } from "@vp-tw/likftc/web";

const controller = createLikftc({ getId: (item) => item.id });
const entries = controller.update(items);
```

Keep one controller per mounted consumer. Discard it when that consumer disconnects so a later mount begins a new identity lifecycle.
