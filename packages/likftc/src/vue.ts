import {
  createIdentityState,
  reconcile,
  type IdentityEntry,
  type LogicalId,
  type ReconcileOptions,
  type ReconcileResult,
} from "./index.js";
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from "vue";

/** Options for deriving a logical ID from each Vue list item. */
export type UseLikftcOptions<Item, Id extends LogicalId> = ReconcileOptions<Item, Id>;

/** Creates a computed list of transition-safe renderer entries. */
export function useLikftc<Item, Id extends LogicalId>(
  items: MaybeRefOrGetter<readonly Item[]>,
  options: UseLikftcOptions<Item, Id>,
): ComputedRef<readonly IdentityEntry<Item, Id>[]> {
  const initialState = createIdentityState<Id>();
  const snapshot = computed<ReconcileResult<Item, Id>>((previous) =>
    reconcile(previous?.state ?? initialState, toValue(items), options),
  );

  return computed(() => snapshot.value.entries);
}
