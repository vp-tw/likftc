---
title: Frames and identities
description: The core identity model behind every Likftc adapter.
---

A frame is one complete ordered list. `reconcile()` compares it with the last committed frame and returns immutable entries, lifecycle events, and the next state.

```ts
import { createIdentityState, reconcile } from "@vp-tw/likftc";

const state = createIdentityState<string>();
const result = reconcile(state, items, { getId: (item) => item.id });
```

## Rules

- IDs are finite numbers or strings. `0`, `-0`, and the empty string are valid.
- Duplicate IDs reject the frame atomically. `0` and `-0` are duplicates under JavaScript's `SameValueZero` semantics.
- Keys are monotonic numbers scoped to one adapter instance.
- Core state stores only active IDs and keys. It does not retain item objects after they leave.
- Exit events are emitted before events for the next active frame, making logs deterministic.

## Re-entry is not retention

If `a` appears in frame 1, is absent in frame 2, and appears in frame 3, frame 3 is a new visual presence. Reusing the original key would let an exiting DOM node and an entering DOM node collide.
