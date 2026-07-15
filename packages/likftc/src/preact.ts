import {
  createIdentityState,
  reconcile,
  type IdentityEntry,
  type IdentityState,
  type LogicalId,
  type ReconcileOptions,
} from "./index.js";
import { useMemo, useState } from "preact/hooks";

/** Options for deriving a logical ID from each Preact list item. */
export type UseLikftcOptions<Item, Id extends LogicalId> = ReconcileOptions<Item, Id>;

/**
 * Returns renderer entries whose keys survive one continuous presence interval.
 *
 * Call this hook during render and use each entry's `key` as the Preact key.
 */
export function useLikftc<Item, Id extends LogicalId>(
  items: readonly Item[],
  options: UseLikftcOptions<Item, Id>,
): readonly IdentityEntry<Item, Id>[] {
  const [identityState, setIdentityState] = useState<IdentityState<Id>>(() =>
    createIdentityState<Id>(),
  );
  const result = useMemo(
    () => reconcile(identityState, items, options),
    [identityState, items, options.getId],
  );

  if (result.state !== identityState) {
    setIdentityState(result.state);
  }

  return result.entries;
}
