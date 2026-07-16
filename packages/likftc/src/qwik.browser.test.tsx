/** @jsxImportSource @qwik.dev/core */

import { component$, createSignal, render, type Signal } from "@qwik.dev/core";

import {
  runIdentityConformance,
  type ExitingIdentity,
  type IdentityHarness,
} from "../../../test/browser-conformance.js";
import { useLikftc } from "./qwik.js";

interface HarnessProps {
  readonly exiting: Signal<readonly ExitingIdentity[]>;
  readonly items: Signal<readonly string[]>;
}

const Harness = component$<HarnessProps>(({ exiting, items }) => {
  const entries = useLikftc(items.value, { getId: (item) => item });
  const rows = [
    ...exiting.value.map((entry) => ({ ...entry, phase: "exiting" as const })),
    ...entries.map((entry) => ({
      id: entry.id,
      key: entry.key,
      phase: "current" as const,
    })),
  ];

  return (
    <ul>
      {rows.map((row) => (
        <li data-id={row.id} data-identity-key={row.key} data-phase={row.phase} key={row.key}>
          {row.id}
        </li>
      ))}
    </ul>
  );
});

function afterRender(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function createQwikHarness(initialItems: readonly string[]): Promise<IdentityHarness> {
  const container = document.createElement("div");
  document.body.append(container);
  const exiting = createSignal<readonly ExitingIdentity[]>([]);
  const items = createSignal(initialItems);
  const rendered = await render(container, <Harness exiting={exiting} items={items} />);

  return {
    root: container,
    dispose: () => {
      rendered.cleanup();
      container.remove();
    },
    update: async (nextItems, nextExiting = []) => {
      exiting.value = nextExiting;
      items.value = nextItems;
      await afterRender();
    },
  };
}

runIdentityConformance("Qwik (experimental)", createQwikHarness);
