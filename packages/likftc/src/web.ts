import {
  createIdentityState,
  reconcile,
  type IdentityState,
  type LogicalId,
  type ReconcileOptions,
  type ReconcileResult,
} from "./index.js";

/** Options for deriving a logical ID from each framework-neutral list item. */
export type CreateLikftcOptions<Item, Id extends LogicalId> = ReconcileOptions<Item, Id>;

/** Low-level controller exposing both renderer entries and reconciliation diagnostics. */
export interface LikftcController<Item, Id extends LogicalId> {
  /** Returns the immutable state committed by the most recent successful update. */
  readonly state: () => IdentityState<Id>;
  /** Atomically reconciles and commits one complete ordered frame. */
  readonly update: (items: readonly Item[]) => ReconcileResult<Item, Id>;
}

/** Creates an instance-scoped, framework-neutral identity controller. */
export function createLikftc<Item, Id extends LogicalId>(
  options: CreateLikftcOptions<Item, Id>,
): LikftcController<Item, Id> {
  let state = createIdentityState<Id>();

  return Object.freeze({
    state: () => state,
    update: (items: readonly Item[]) => {
      const result = reconcile(state, items, options);
      state = result.state;
      return result;
    },
  });
}
