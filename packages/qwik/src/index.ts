import {
  createIdentityState,
  reconcile,
  type IdentityEntry,
  type IdentityState,
  type LogicalId,
  type ReconcileOptions,
} from "@vp-tw/likftc";
import { useSignal } from "@qwik.dev/core";

/** Options for deriving a logical ID from each Qwik list item. */
export type UseLikftcOptions<Item, Id extends LogicalId> = ReconcileOptions<Item, Id>;

/** Returns transition-safe renderer entries for the current Qwik render. */
export function useLikftc<Item, Id extends LogicalId>(
  items: readonly Item[],
  options: UseLikftcOptions<Item, Id>,
): readonly IdentityEntry<Item, Id>[] {
  const identityState = useSignal<IdentityState<Id>>(() => createIdentityState<Id>());
  const result = reconcile(identityState.value, items, options);

  if (result.state !== identityState.value) {
    identityState.value = result.state;
  }

  return result.entries;
}
