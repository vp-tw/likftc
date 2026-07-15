import { act, startTransition, useId } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";

import {
  runIdentityConformance,
  type ExitingIdentity,
  type IdentityHarness,
} from "../../../test/browser-conformance.js";
import { useLikftc } from "./react.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

interface HarnessProps {
  readonly exiting?: readonly ExitingIdentity[];
  readonly items: readonly string[];
}

interface RowProps {
  readonly id: string;
  readonly identityKey: number;
  readonly phase: "current" | "exiting";
}

function Row({ id, identityKey, phase }: RowProps): React.JSX.Element {
  const instanceId = useId();

  return (
    <li
      data-id={id}
      data-identity-key={identityKey}
      data-instance-id={instanceId}
      data-phase={phase}
    >
      {id}
    </li>
  );
}

function Harness({ exiting = [], items }: HarnessProps): React.JSX.Element {
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

function createReactHarness(initialItems: readonly string[]): IdentityHarness {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  const update = (items: readonly string[], exiting: readonly ExitingIdentity[] = []): void => {
    act(() => root.render(<Harness exiting={exiting} items={items} />));
  };
  update(initialItems);

  return {
    root: container,
    dispose: () => {
      act(() => root.unmount());
      container.remove();
    },
    update,
  };
}

runIdentityConformance("React", createReactHarness);

it("skips reconciliation on unrelated React renders", () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const items = ["a", "b"] as const;
  const getId = vi.fn((item: string) => item);

  function StableHarness({ label }: { readonly label: string }): React.JSX.Element {
    const entries = useLikftc(items, { getId });
    return <output>{`${label}:${entries.length}`}</output>;
  }

  try {
    act(() => root.render(<StableHarness label="first" />));
    const readsAfterIdentitySettles = getId.mock.calls.length;

    act(() => root.render(<StableHarness label="second" />));

    expect(container.textContent).toBe("second:2");
    expect(getId).toHaveBeenCalledTimes(readsAfterIdentitySettles);
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});

it("does not leak identity changes from an interrupted React transition", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  try {
    act(() => root.render(<Harness items={["a"]} />));
    const initial = container.querySelector<HTMLLIElement>('li[data-phase="current"]');

    await act(async () => {
      startTransition(() => root.render(<Harness items={["b"]} />));
      flushSync(() => root.render(<Harness items={["a"]} />));
      await Promise.resolve();
    });

    expect(container.querySelector<HTMLLIElement>('li[data-phase="current"]')).toBe(initial);
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});
