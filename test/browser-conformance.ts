import { afterEach, describe, expect, it } from "vitest";

export interface ExitingIdentity {
  readonly id: string;
  readonly key: number;
}

export interface IdentityHarness {
  readonly root: ParentNode;
  readonly dispose: () => Promise<void> | void;
  readonly update: (
    items: readonly string[],
    exiting?: readonly ExitingIdentity[],
  ) => Promise<void> | void;
}

export type IdentityHarnessFactory = (
  initialItems: readonly string[],
) => Promise<IdentityHarness> | IdentityHarness;

export function runIdentityConformance(
  adapterName: string,
  createHarness: IdentityHarnessFactory,
): void {
  describe(`${adapterName} identity conformance`, () => {
    const activeHarnesses = new Set<IdentityHarness>();

    afterEach(async () => {
      for (const harness of [...activeHarnesses].reverse()) {
        await harness.dispose();
      }
      activeHarnesses.clear();
    });

    async function mount(initialItems: readonly string[]): Promise<IdentityHarness> {
      const harness = await createHarness(initialItems);
      activeHarnesses.add(harness);
      return harness;
    }

    async function dispose(harness: IdentityHarness): Promise<void> {
      activeHarnesses.delete(harness);
      await harness.dispose();
    }

    it("preserves DOM identity throughout continuous presence", async () => {
      const harness = await mount(["a"]);
      const initial = currentRow(harness, "a");

      await harness.update(["a"]);

      expect(currentRow(harness, "a")).toBe(initial);
      expect(keyOf(initial)).toBe(0);
    });

    it("preserves DOM identity and keys across reorder", async () => {
      const harness = await mount(["a", "b"]);
      const initialA = currentRow(harness, "a");
      const initialB = currentRow(harness, "b");
      const keyA = keyOf(initialA);
      const keyB = keyOf(initialB);

      await harness.update(["b", "a"]);

      expect(currentRow(harness, "a")).toBe(initialA);
      expect(currentRow(harness, "b")).toBe(initialB);
      expect(keyOf(currentRow(harness, "a"))).toBe(keyA);
      expect(keyOf(currentRow(harness, "b"))).toBe(keyB);
    });

    it("keeps an exiting row and creates a fresh row on re-entry", async () => {
      const harness = await mount(["a"]);
      const initial = currentRow(harness, "a");
      const initialKey = keyOf(initial);
      const exiting = [{ id: "a", key: initialKey }] as const;

      await harness.update([], exiting);
      expect(exitingRow(harness, "a")).toBe(initial);

      await harness.update(["a"], exiting);
      const entering = currentRow(harness, "a");

      expect(rows(harness)).toHaveLength(2);
      expect(exitingRow(harness, "a")).toBe(initial);
      expect(entering).not.toBe(initial);
      expect(keyOf(entering)).not.toBe(initialKey);
    });

    it("resets identity state when a list instance remounts", async () => {
      const first = await mount(["a"]);
      expect(keyOf(currentRow(first, "a"))).toBe(0);
      await dispose(first);

      const second = await mount(["a"]);
      expect(keyOf(currentRow(second, "a"))).toBe(0);
    });

    it("isolates identity state between concurrent list instances", async () => {
      const first = await mount(["a"]);
      const second = await mount(["a"]);

      await first.update([]);
      await first.update(["a"]);

      expect(keyOf(currentRow(first, "a"))).toBe(1);
      expect(keyOf(currentRow(second, "a"))).toBe(0);
    });
  });
}

function rows(harness: IdentityHarness): readonly HTMLLIElement[] {
  return [...harness.root.querySelectorAll<HTMLLIElement>("li[data-phase]")];
}

function rowByPhase(
  harness: IdentityHarness,
  id: string,
  phase: "current" | "exiting",
): HTMLLIElement {
  const row = rows(harness).find(
    (candidate) => candidate.dataset["id"] === id && candidate.dataset["phase"] === phase,
  );
  if (row === undefined) {
    throw new Error(`Expected ${phase} row for ${id}.`);
  }
  return row;
}

function currentRow(harness: IdentityHarness, id: string): HTMLLIElement {
  return rowByPhase(harness, id, "current");
}

function exitingRow(harness: IdentityHarness, id: string): HTMLLIElement {
  return rowByPhase(harness, id, "exiting");
}

function keyOf(row: HTMLLIElement): number {
  const key = Number(row.dataset["identityKey"]);
  if (!Number.isSafeInteger(key)) {
    throw new Error("Expected a safe integer identity key.");
  }
  return key;
}
