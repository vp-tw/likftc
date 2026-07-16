import {
  createIdentityState,
  reconcile,
  type IdentityEntry,
  type IdentityState,
  type LogicalId,
  type ReconcileOptions,
} from "./index.js";
import { untrack, useSignal } from "@qwik.dev/core";

/**
 * Options for deriving a logical ID from each Qwik list item.
 *
 * @experimental Qwik 2 support remains optimizer-only while its runtime is in beta.
 */
export type UseLikftcOptions<Item, Id extends LogicalId> = ReconcileOptions<Item, Id>;

/**
 * Returns transition-safe renderer entries for the current Qwik render.
 *
 * @experimental This API may change in a Likftc minor release until Qwik 2 is stable.
 */
export function useLikftc<Item, Id extends LogicalId>(
  items: readonly Item[],
  options: UseLikftcOptions<Item, Id>,
): readonly IdentityEntry<Item, Id>[] {
  const identityState = useSignal<IdentityState<Id>>(() => createIdentityState<Id>());
  const previousState = untrack(() => identityState.value);
  const result = reconcile(previousState, items, options);

  if (result.state !== previousState) {
    identityState.value = result.state;
  }

  return result.entries;
}
