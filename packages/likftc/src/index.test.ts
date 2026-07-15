import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  DuplicateLogicalIdError,
  IdentityExhaustedError,
  InvalidLogicalIdError,
  createIdentityState,
  reconcile,
  type IdentityState,
  type LogicalId,
} from "./index.js";

const byString = {
  getId: (value: string): string => value,
} as const;
const byNumber = {
  getId: (value: number): number => value,
} as const;
const byLogicalId = {
  getId: (value: LogicalId): LogicalId => value,
} as const;

describe("createIdentityState", () => {
  it("creates an empty frozen state", () => {
    const state = createIdentityState<string>();

    expect(state).toEqual({ active: [], nextKey: 0 });
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.active)).toBe(true);
  });
});

describe("reconcile", () => {
  it("assigns stable keys to one continuous presence interval", () => {
    const initial = createIdentityState<string>();
    const first = reconcile(initial, ["a", "b"], byString);
    const second = reconcile(first.state, ["a", "b"], byString);

    expect(first.entries).toEqual([
      { id: "a", index: 0, item: "a", key: 0 },
      { id: "b", index: 1, item: "b", key: 1 },
    ]);
    expect(second.entries).toEqual(first.entries);
    expect(second.state).toBe(first.state);
    expect(second.events).toEqual([
      {
        id: "a",
        key: 0,
        moved: false,
        nextIndex: 0,
        previousIndex: 0,
        type: "retain",
      },
      {
        id: "b",
        key: 1,
        moved: false,
        nextIndex: 1,
        previousIndex: 1,
        type: "retain",
      },
    ]);
  });

  it("retains keys across reorder and reports deterministic events", () => {
    const first = reconcile(createIdentityState<string>(), ["a", "b"], byString);
    const reordered = reconcile(first.state, ["b", "a"], byString);

    expect(reordered.entries.map(({ id, key }) => ({ id, key }))).toEqual([
      { id: "b", key: 1 },
      { id: "a", key: 0 },
    ]);
    expect(reordered.events).toEqual([
      {
        id: "b",
        key: 1,
        moved: true,
        nextIndex: 0,
        previousIndex: 1,
        type: "retain",
      },
      {
        id: "a",
        key: 0,
        moved: true,
        nextIndex: 1,
        previousIndex: 0,
        type: "retain",
      },
    ]);
  });

  it("issues a fresh key after any observed absence", () => {
    const present = reconcile(createIdentityState<string>(), ["a"], byString);
    const absent = reconcile(present.state, [], byString);
    const reentered = reconcile(absent.state, ["a"], byString);

    expect(present.entries[0]?.key).toBe(0);
    expect(absent.events).toEqual([{ id: "a", key: 0, previousIndex: 0, type: "exit" }]);
    expect(reentered.entries[0]?.key).toBe(1);
  });

  it("emits exits in previous order before next-frame events", () => {
    const previous = reconcile(createIdentityState<string>(), ["a", "b", "c"], byString);
    const next = reconcile(previous.state, ["c", "d"], byString);

    expect(next.events).toEqual([
      { id: "a", key: 0, previousIndex: 0, type: "exit" },
      { id: "b", key: 1, previousIndex: 1, type: "exit" },
      {
        id: "c",
        key: 2,
        moved: true,
        nextIndex: 0,
        previousIndex: 2,
        type: "retain",
      },
      { id: "d", key: 3, nextIndex: 1, type: "enter" },
    ]);
  });

  it("uses current items without retaining prior item objects", () => {
    const firstItem = { id: "a", label: "first" };
    const nextItem = { id: "a", label: "next" };
    const options = { getId: (item: { id: string }) => item.id };
    const first = reconcile(createIdentityState<string>(), [firstItem], options);
    const next = reconcile(first.state, [nextItem], options);

    expect(next.state).toBe(first.state);
    expect(next.entries[0]?.item).toBe(nextItem);
    expect(next.entries[0]?.key).toBe(first.entries[0]?.key);
  });

  it.each([0, -0, ""])("accepts the valid falsey logical ID %p", (id) => {
    const result = reconcile(createIdentityState<string | number>(), [id], byLogicalId);

    expect(result.entries[0]?.id).toBe(id);
    expect(result.entries[0]?.key).toBe(0);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects the invalid numeric logical ID %p atomically",
    (id) => {
      const previous = reconcile(createIdentityState<string | number>(), ["safe"], byLogicalId);

      expect(() => reconcile(previous.state, [id], byLogicalId)).toThrow(InvalidLogicalIdError);
      expect(previous.state).toEqual({
        active: [{ id: "safe", key: 0 }],
        nextKey: 1,
      });
    },
  );

  it.each([true, null, undefined, {}])("rejects the non-string, non-number logical ID %p", (id) => {
    expect(() =>
      reconcile(createIdentityState<LogicalId>(), [id], {
        getId: () => id as LogicalId,
      }),
    ).toThrow(InvalidLogicalIdError);
  });

  it("rejects duplicate logical IDs atomically", () => {
    const previous = reconcile(createIdentityState<string>(), ["safe"], byString);

    expect(() => reconcile(previous.state, ["a", "a"], byString)).toThrow(DuplicateLogicalIdError);
    expect(previous.state.active).toEqual([{ id: "safe", key: 0 }]);
  });

  it("treats 0 and -0 as duplicate IDs", () => {
    expect(() => reconcile(createIdentityState<number>(), [0, -0], byNumber)).toThrow(
      DuplicateLogicalIdError,
    );
  });

  it("propagates getId errors without changing prior state", () => {
    const previous = reconcile(createIdentityState<string>(), ["safe"], byString);
    const error = new Error("getId failed");

    expect(() =>
      reconcile(previous.state, ["unsafe"], {
        getId: () => {
          throw error;
        },
      }),
    ).toThrow(error);
    expect(previous.state.active).toEqual([{ id: "safe", key: 0 }]);
  });

  it("rejects an array-like input that changes while being reconciled", () => {
    let reads = 0;
    const unstableItems = {
      entries: () => (++reads === 1 ? ["a"] : ["a", "b"]).entries(),
    } as unknown as readonly string[];

    expect(() => reconcile(createIdentityState<string>(), unstableItems, byString)).toThrow(
      "Missing logical ID at validated index 1.",
    );
  });

  it("throws before a transition key can exceed the safe range", () => {
    // This deliberately corrupt state is limited to the exhaustion boundary test.
    const exhausted = Object.freeze({
      active: Object.freeze([]),
      nextKey: Number.MAX_SAFE_INTEGER,
    }) as unknown as IdentityState<string>;

    expect(() => reconcile(exhausted, ["a"], byString)).toThrow(IdentityExhaustedError);
  });

  it("freezes all returned state, entries, and events", () => {
    const result = reconcile(createIdentityState<string>(), ["a"], byString);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.state)).toBe(true);
    expect(Object.isFrozen(result.state.active)).toBe(true);
    expect(Object.isFrozen(result.state.active[0])).toBe(true);
    expect(Object.isFrozen(result.entries)).toBe(true);
    expect(Object.isFrozen(result.entries[0])).toBe(true);
    expect(Object.isFrozen(result.events)).toBe(true);
    expect(Object.isFrozen(result.events[0])).toBe(true);
  });

  it("preserves all lifecycle invariants across arbitrary frame sequences", () => {
    fc.assert(
      fc.property(
        fc.array(fc.uniqueArray(fc.integer({ max: 12, min: -12 })), {
          maxLength: 40,
        }),
        (frames) => {
          let state = createIdentityState<number>();
          const mostRecentKey = new Map<number, number>();

          for (const frame of frames) {
            const previousKeys = new Map(state.active.map(({ id, key }) => [id, key] as const));
            const result = reconcile(state, frame, byNumber);
            const frameKeys = result.entries.map(({ key }) => key);

            expect(new Set(frameKeys).size).toBe(frameKeys.length);
            expect(result.state.active).toHaveLength(frame.length);

            for (const entry of result.entries) {
              const previousKey = previousKeys.get(entry.id);
              if (previousKey === undefined) {
                const historicalKey = mostRecentKey.get(entry.id);
                if (historicalKey !== undefined) {
                  expect(entry.key).toBeGreaterThan(historicalKey);
                }
              } else {
                expect(entry.key).toBe(previousKey);
              }
              mostRecentKey.set(entry.id, entry.key);
            }

            state = result.state;
          }
        },
      ),
      { numRuns: 500 },
    );
  });
});
