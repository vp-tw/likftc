import {
  createIdentityState,
  reconcile,
  type IdentityEntry,
  type LogicalId,
  type ReconcileOptions,
  type ReconcileResult,
  type TransitionKey,
} from "./index.js";
import { createMemo, type Accessor } from "solid-js";

/** Options for deriving a logical ID from each Solid list item. */
export type CreateLikftcOptions<Item, Id extends LogicalId> = ReconcileOptions<Item, Id>;

/** A keyed view designed for Solid's keyed `<For>` rendering pattern. */
export interface LikftcController<Item, Id extends LogicalId> {
  /** Returns renderer entries for the current frame. */
  readonly entries: Accessor<readonly IdentityEntry<Item, Id>[]>;
  /** Retains the latest entry while a keyed row finishes its exit transition. */
  readonly entry: (key: TransitionKey) => Accessor<IdentityEntry<Item, Id> | undefined>;
  /** Returns transition keys for the current frame. */
  readonly keys: Accessor<readonly TransitionKey[]>;
}

/** Creates a reactive transition-identity controller for a Solid list. */
export function createLikftc<Item, Id extends LogicalId>(
  items: Accessor<readonly Item[]>,
  options: CreateLikftcOptions<Item, Id>,
): LikftcController<Item, Id> {
  const initialSnapshot = reconcile(createIdentityState<Id>(), [] as readonly Item[], options);
  const snapshot = createMemo<ReconcileResult<Item, Id>>(
    (previous) => reconcile(previous.state, items(), options),
    initialSnapshot,
  );
  const entries = createMemo(() => snapshot().entries);
  const keys = createMemo(() => entries().map((entry) => entry.key));

  return Object.freeze({
    entries,
    entry: (key: TransitionKey) =>
      createMemo<IdentityEntry<Item, Id> | undefined>((previous) => {
        const current = entries().find((entry) => entry.key === key);
        return current ?? previous;
      }),
    keys,
  });
}
