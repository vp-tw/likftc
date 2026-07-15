import {
  createIdentityState,
  reconcile,
  type IdentityEntry,
  type LogicalId,
  type ReconcileOptions,
} from "./index.js";

/** Options for deriving a logical ID from each framework-neutral list item. */
export type CreateLikftcOptions<Item, Id extends LogicalId> = ReconcileOptions<Item, Id>;

/** Framework-neutral controller that owns one identity lifecycle. */
export interface LikftcController<Item, Id extends LogicalId> {
  /** Atomically reconciles one complete ordered frame and returns renderer entries. */
  readonly update: (items: readonly Item[]) => readonly IdentityEntry<Item, Id>[];
}

/** Creates an instance-scoped, framework-neutral identity controller. */
export function createLikftc<Item, Id extends LogicalId>(
  options: CreateLikftcOptions<Item, Id>,
): LikftcController<Item, Id> {
  let state = createIdentityState<Id>();

  return Object.freeze({
    update: (items: readonly Item[]) => {
      const result = reconcile(state, items, options);
      state = result.state;
      return result.entries;
    },
  });
}
