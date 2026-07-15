import { computed, linkedSignal, type Signal } from "@angular/core";
import {
  createIdentityState,
  reconcile,
  type IdentityEntry,
  type LogicalId,
  type ReconcileOptions,
  type ReconcileResult,
} from "./index.js";

/** Options for deriving a logical ID from each Angular list item. */
export type CreateLikftcOptions<Item, Id extends LogicalId> = ReconcileOptions<Item, Id>;

/** Creates an Angular signal of transition-safe renderer entries. */
export function createLikftc<Item, Id extends LogicalId>(
  items: Signal<readonly Item[]>,
  options: CreateLikftcOptions<Item, Id>,
): Signal<readonly IdentityEntry<Item, Id>[]> {
  const initialState = createIdentityState<Id>();
  const snapshot = linkedSignal<readonly Item[], ReconcileResult<Item, Id>>({
    source: items,
    computation: (nextItems, previous) =>
      reconcile(previous?.value.state ?? initialState, nextItems, options),
  });

  return computed(() => snapshot().entries);
}
