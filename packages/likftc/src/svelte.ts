import {
  createIdentityState,
  reconcile,
  type IdentityEntry,
  type LogicalId,
  type ReconcileOptions,
} from "./index.js";
import { readable, type Readable } from "svelte/store";

/** Options for deriving a logical ID from each Svelte list item. */
export type CreateLikftcOptions<Item, Id extends LogicalId> = ReconcileOptions<Item, Id>;

/** Creates a readable store of transition-safe renderer entries. */
export function createLikftc<Item, Id extends LogicalId>(
  items: Readable<readonly Item[]>,
  options: CreateLikftcOptions<Item, Id>,
): Readable<readonly IdentityEntry<Item, Id>[]> {
  const initialState = createIdentityState<Id>();
  const initialEntries: readonly IdentityEntry<Item, Id>[] = Object.freeze([]);

  return readable(initialEntries, (set) => {
    let state = initialState;

    return items.subscribe((nextItems) => {
      const result = reconcile(state, nextItems, options);
      state = result.state;
      set(result.entries);
    });
  });
}
