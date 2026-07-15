/** @jsxImportSource preact */

import { render, type JSX } from "preact";
import { act } from "preact/test-utils";
import { expect, it, vi } from "vitest";

import {
  runIdentityConformance,
  type ExitingIdentity,
  type IdentityHarness,
} from "../../../test/browser-conformance.js";
import { useLikftc } from "./preact.js";

interface HarnessProps {
  readonly exiting?: readonly ExitingIdentity[];
  readonly items: readonly string[];
}

interface RowProps {
  readonly id: string;
  readonly identityKey: number;
  readonly phase: "current" | "exiting";
}

function Row({ id, identityKey, phase }: RowProps): JSX.Element {
  return (
    <li data-id={id} data-identity-key={identityKey} data-phase={phase}>
      {id}
    </li>
  );
}

function Harness({ exiting = [], items }: HarnessProps): JSX.Element {
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

function createPreactHarness(initialItems: readonly string[]): IdentityHarness {
  const container = document.createElement("div");
  document.body.append(container);

  const update = (items: readonly string[], exiting: readonly ExitingIdentity[] = []): void => {
    act(() => render(<Harness exiting={exiting} items={items} />, container));
  };
  update(initialItems);

  return {
    root: container,
    dispose: () => {
      act(() => render(null, container));
      container.remove();
    },
    update,
  };
}

runIdentityConformance("Preact", createPreactHarness);

it("skips reconciliation on unrelated Preact renders", () => {
  const container = document.createElement("div");
  document.body.append(container);
  const items = ["a", "b"] as const;
  const getId = vi.fn((item: string) => item);

  function StableHarness({ label }: { readonly label: string }): JSX.Element {
    const entries = useLikftc(items, { getId });
    return <output>{`${label}:${entries.length}`}</output>;
  }

  try {
    act(() => render(<StableHarness label="first" />, container));
    const readsAfterIdentitySettles = getId.mock.calls.length;

    act(() => render(<StableHarness label="second" />, container));

    expect(container.textContent).toBe("second:2");
    expect(getId).toHaveBeenCalledTimes(readsAfterIdentitySettles);
  } finally {
    act(() => render(null, container));
    container.remove();
  }
});
