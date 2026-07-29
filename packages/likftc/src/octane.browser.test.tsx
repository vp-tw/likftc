/** @jsxImportSource octane */

import { act, createRoot, setIsOctaneActEnvironment } from "octane";
import { expect, it, vi } from "vitest";

import {
  runIdentityConformance,
  type ExitingIdentity,
  type IdentityHarness,
} from "../../../test/browser-conformance.js";
import { useLikftc } from "./octane.js";

setIsOctaneActEnvironment(true);

interface HarnessProps {
  readonly exiting?: readonly ExitingIdentity[];
  readonly items: readonly string[];
}

interface RowProps {
  readonly id: string;
  readonly identityKey: number;
  readonly phase: "current" | "exiting";
}

function Row({ id, identityKey, phase }: RowProps) {
  return (
    <li data-id={id} data-identity-key={identityKey} data-phase={phase}>
      {id}
    </li>
  );
}

function Harness({ exiting = [], items }: HarnessProps) {
  const entries = useLikftc(items, { getId: (item) => item });
  const visibleRows: readonly RowProps[] = [
    ...exiting.map((item) => ({ ...item, identityKey: item.key, phase: "exiting" as const })),
    ...entries.map((entry) => ({
      id: entry.id,
      identityKey: entry.key,
      phase: "current" as const,
    })),
  ];

  return (
    <ul>
      {visibleRows.map((row) => (
        <Row {...row} key={row.identityKey} />
      ))}
    </ul>
  );
}

async function createOctaneHarness(initialItems: readonly string[]): Promise<IdentityHarness> {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  const update = async (
    items: readonly string[],
    exiting: readonly ExitingIdentity[] = [],
  ): Promise<void> => {
    await act(() => root.render(<Harness exiting={exiting} items={items} />));
  };
  await update(initialItems);

  return {
    root: container,
    dispose: async () => {
      await act(() => root.unmount());
      container.remove();
    },
    update,
  };
}

runIdentityConformance("Octane 0.1.17", createOctaneHarness);

it("skips reconciliation on unrelated Octane renders", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const items = ["a", "b"] as const;
  const getId = vi.fn((item: string) => item);

  function StableHarness({ label }: { readonly label: string }) {
    const entries = useLikftc(items, { getId });
    return <output>{`${label}:${entries.length}`}</output>;
  }

  try {
    await act(() => root.render(<StableHarness label="first" />));
    const readsAfterIdentitySettles = getId.mock.calls.length;

    await act(() => root.render(<StableHarness label="second" />));

    expect(container.textContent).toBe("second:2");
    expect(getId).toHaveBeenCalledTimes(readsAfterIdentitySettles);
  } finally {
    await act(() => root.unmount());
    container.remove();
  }
});

it("reconciles when the Octane getId strategy changes", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const items = [{ alias: "alpha", id: "a" }] as const;
  const byId = (item: (typeof items)[number]): string => item.id;
  const byAlias = (item: (typeof items)[number]): string => item.alias;

  function StrategyHarness({ getId }: { readonly getId: typeof byId }) {
    const entries = useLikftc(items, { getId });
    return <output data-key={entries[0]?.key} />;
  }

  try {
    await act(() => root.render(<StrategyHarness getId={byId} />));
    expect(container.querySelector("output")?.dataset["key"]).toBe("0");

    await act(() => root.render(<StrategyHarness getId={byAlias} />));

    expect(container.querySelector("output")?.dataset["key"]).toBe("1");
  } finally {
    await act(() => root.unmount());
    container.remove();
  }
});
