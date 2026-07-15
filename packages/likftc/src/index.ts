/** A stable application identity used to recognize one logical list item. */
export type LogicalId = string | number;

/**
 * An opaque renderer key for one continuous presence interval.
 *
 * Values are scoped to one Likftc state lineage. Do not compare or combine keys
 * from different list instances.
 */
export type TransitionKey = number;

interface ActiveIdentity<Id extends LogicalId> {
  readonly id: Id;
  readonly key: TransitionKey;
}

declare const identityStateBrand: unique symbol;

/**
 * Immutable reconciliation state created by {@link createIdentityState}.
 *
 * The private brand prevents callers from constructing state structurally.
 * Pass the value back to {@link reconcile}; its fields are diagnostic only.
 */
export interface IdentityState<Id extends LogicalId> {
  readonly [identityStateBrand]: Id;
  readonly active: readonly ActiveIdentity<Id>[];
  readonly nextKey: TransitionKey;
}

/** One current item paired with its renderer transition identity. */
export interface IdentityEntry<Item, Id extends LogicalId> {
  readonly id: Id;
  readonly index: number;
  readonly item: Item;
  readonly key: TransitionKey;
}

/** Describes a logical item entering the current frame. */
export interface EnterEvent<Id extends LogicalId> {
  readonly id: Id;
  readonly key: TransitionKey;
  readonly nextIndex: number;
  readonly type: "enter";
}

/** Describes a logical item leaving the current frame. */
export interface ExitEvent<Id extends LogicalId> {
  readonly id: Id;
  readonly key: TransitionKey;
  readonly previousIndex: number;
  readonly type: "exit";
}

/** Describes a logical item retained from the previous frame. */
export interface RetainEvent<Id extends LogicalId> {
  readonly id: Id;
  readonly key: TransitionKey;
  readonly moved: boolean;
  readonly nextIndex: number;
  readonly previousIndex: number;
  readonly type: "retain";
}

/** A deterministic lifecycle event emitted by one reconciliation. */
export type LifecycleEvent<Id extends LogicalId> = EnterEvent<Id> | ExitEvent<Id> | RetainEvent<Id>;

/** Options used to derive logical identity from each item. */
export interface ReconcileOptions<Item, Id extends LogicalId> {
  readonly getId: (item: Item) => Id;
}

/** Immutable entries, diagnostics, and next state produced by reconciliation. */
export interface ReconcileResult<Item, Id extends LogicalId> {
  readonly entries: readonly IdentityEntry<Item, Id>[];
  readonly events: readonly LifecycleEvent<Id>[];
  readonly state: IdentityState<Id>;
}

/** Thrown when one frame contains the same logical ID more than once. */
export class DuplicateLogicalIdError extends Error {
  readonly duplicateIndex: number;
  readonly firstIndex: number;
  readonly id: LogicalId;

  constructor(id: LogicalId, firstIndex: number, duplicateIndex: number) {
    super(
      `Duplicate logical ID ${describeValue(id)} at indexes ${firstIndex} and ${duplicateIndex}.`,
    );
    this.name = "DuplicateLogicalIdError";
    this.id = id;
    this.firstIndex = firstIndex;
    this.duplicateIndex = duplicateIndex;
  }
}

/** Thrown when `getId` returns a value outside the supported logical-ID domain. */
export class InvalidLogicalIdError extends TypeError {
  readonly index: number;
  readonly value: unknown;

  constructor(value: unknown, index: number) {
    super(
      `Logical ID at index ${index} must be a string or finite number; received ${describeValue(value)}.`,
    );
    this.name = "InvalidLogicalIdError";
    this.value = value;
    this.index = index;
  }
}

/** Thrown before the monotonic transition-key space can be exhausted. */
export class IdentityExhaustedError extends RangeError {
  constructor() {
    super("Transition key space is exhausted for this identity state.");
    this.name = "IdentityExhaustedError";
  }
}

interface PreviousIdentity<Id extends LogicalId> {
  readonly identity: ActiveIdentity<Id>;
  readonly index: number;
}

const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

/** Creates an empty, instance-scoped identity state. */
export function createIdentityState<Id extends LogicalId>(): IdentityState<Id> {
  return createState([], 0);
}

/**
 * Reconciles one complete ordered frame without mutating prior state or items.
 *
 * A retained logical ID keeps its key. Any observed absence retires that key,
 * so a later re-entry receives a fresh one.
 */
export function reconcile<Item, Id extends LogicalId>(
  previousState: IdentityState<Id>,
  items: readonly Item[],
  options: ReconcileOptions<Item, NoInfer<Id>>,
): ReconcileResult<Item, Id> {
  const { ids, indexById } = collectIds(items, options);
  const previousById = indexPreviousState(previousState);
  const frameChanged = hasFrameChanged(previousState.active, ids);

  if (!frameChanged) {
    return createUnchangedResult(previousState, previousById, items, ids);
  }

  let newIdentityCount = 0;
  for (const id of ids) {
    if (!previousById.has(id)) newIdentityCount += 1;
  }
  if (newIdentityCount > MAX_SAFE_INTEGER - previousState.nextKey) {
    throw new IdentityExhaustedError();
  }

  const events: LifecycleEvent<Id>[] = [];

  for (const [previousIndex, identity] of previousState.active.entries()) {
    if (!indexById.has(identity.id)) {
      events.push(
        Object.freeze({
          id: identity.id,
          key: identity.key,
          previousIndex,
          type: "exit" as const,
        }),
      );
    }
  }

  let nextKey = previousState.nextKey;
  const active: ActiveIdentity<Id>[] = [];
  const entries: IdentityEntry<Item, Id>[] = [];

  for (const [nextIndex, item] of items.entries()) {
    const id = ids[nextIndex];
    if (id === undefined) {
      throw new RangeError(`Missing logical ID at validated index ${nextIndex}.`);
    }
    const previous = previousById.get(id);
    const key = previous?.identity.key ?? nextKey++;
    const identity = Object.freeze({ id, key });

    active.push(identity);
    entries.push(Object.freeze({ id, index: nextIndex, item, key }));

    if (previous === undefined) {
      events.push(Object.freeze({ id, key, nextIndex, type: "enter" as const }));
    } else {
      events.push(
        Object.freeze({
          id,
          key,
          moved: previous.index !== nextIndex,
          nextIndex,
          previousIndex: previous.index,
          type: "retain" as const,
        }),
      );
    }
  }

  const state = createState(active, nextKey);

  return Object.freeze({
    entries: Object.freeze(entries),
    events: Object.freeze(events),
    state,
  });
}

function createState<Id extends LogicalId>(
  active: readonly ActiveIdentity<Id>[],
  nextKey: TransitionKey,
): IdentityState<Id> {
  const value = Object.freeze({ active: Object.freeze(active), nextKey });

  // WHY: the brand is compile-time-only and can be created only by this factory.
  // SCOPE: one immutable state construction boundary.
  // SAFETY: every state field is validated or generated before this call.
  return value as IdentityState<Id>;
}

function collectIds<Item, Id extends LogicalId>(
  items: readonly Item[],
  options: ReconcileOptions<Item, Id>,
): { readonly ids: readonly Id[]; readonly indexById: ReadonlyMap<Id, number> } {
  const ids: Id[] = [];
  const indexById = new Map<Id, number>();

  for (const [index, item] of items.entries()) {
    const id = options.getId(item);
    assertLogicalId(id, index);

    if (indexById.has(id)) {
      const firstIndex = indexById.get(id);
      if (firstIndex === undefined) {
        throw new RangeError("Duplicate ID index lookup failed.");
      }
      throw new DuplicateLogicalIdError(id, firstIndex, index);
    }

    indexById.set(id, index);
    ids.push(id);
  }

  return { ids, indexById };
}

function assertLogicalId(value: unknown, index: number): asserts value is LogicalId {
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    (typeof value === "number" && !Number.isFinite(value))
  ) {
    throw new InvalidLogicalIdError(value, index);
  }
}

function indexPreviousState<Id extends LogicalId>(
  state: IdentityState<Id>,
): ReadonlyMap<Id, PreviousIdentity<Id>> {
  const indexById = new Map<Id, PreviousIdentity<Id>>();
  for (const [index, identity] of state.active.entries()) {
    indexById.set(identity.id, { identity, index });
  }
  return indexById;
}

function hasFrameChanged<Id extends LogicalId>(
  active: readonly ActiveIdentity<Id>[],
  ids: readonly Id[],
): boolean {
  if (active.length !== ids.length) {
    return true;
  }

  return active.some((identity, index) => identity.id !== ids[index]);
}

function createUnchangedResult<Item, Id extends LogicalId>(
  state: IdentityState<Id>,
  previousById: ReadonlyMap<Id, PreviousIdentity<Id>>,
  items: readonly Item[],
  ids: readonly Id[],
): ReconcileResult<Item, Id> {
  const entries: IdentityEntry<Item, Id>[] = [];
  const events: RetainEvent<Id>[] = [];

  for (const [index, item] of items.entries()) {
    const id = ids[index];
    if (id === undefined) {
      throw new RangeError(`Missing logical ID at validated index ${index}.`);
    }
    const previous = previousById.get(id);
    if (previous === undefined) {
      throw new RangeError(`Invalid unchanged frame at index ${index}.`);
    }

    entries.push(Object.freeze({ id, index, item, key: previous.identity.key }));
    events.push(
      Object.freeze({
        id,
        key: previous.identity.key,
        moved: false,
        nextIndex: index,
        previousIndex: index,
        type: "retain" as const,
      }),
    );
  }

  return Object.freeze({
    entries: Object.freeze(entries),
    events: Object.freeze(events),
    state,
  });
}

function describeValue(value: unknown): string {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" && Object.is(value, -0)) {
    return "-0";
  }
  return String(value);
}
