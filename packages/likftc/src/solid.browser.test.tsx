import { createSignal, For, type JSX } from "solid-js";
import { render } from "solid-js/web";

import {
  runIdentityConformance,
  type ExitingIdentity,
  type IdentityHarness,
} from "../../../test/browser-conformance.js";
import { createLikftc } from "./solid.js";

interface HarnessProps {
  readonly exiting: readonly ExitingIdentity[];
  readonly items: readonly string[];
}

interface RowProps {
  readonly id: string;
  readonly identityKey: number;
  readonly phase: "current" | "exiting";
}

function Row(props: RowProps): JSX.Element {
  return (
    <li data-id={props.id} data-identity-key={props.identityKey} data-phase={props.phase}>
      {props.id}
    </li>
  );
}

function Harness(props: HarnessProps): JSX.Element {
  const controller = createLikftc(() => props.items, { getId: (item) => item });
  const currentKeys = () => controller.keys();
  const visibleKeys = () => [...props.exiting.map((entry) => entry.key), ...currentKeys()];

  return (
    <ul>
      <For each={visibleKeys()}>
        {(key) => {
          const entry = controller.entry(key);
          const exitingEntry = () => props.exiting.find((candidate) => candidate.key === key);
          return (
            <Row
              id={entry()?.id ?? exitingEntry()?.id ?? "missing"}
              identityKey={key}
              phase={currentKeys().includes(key) ? "current" : "exiting"}
            />
          );
        }}
      </For>
    </ul>
  );
}

function createSolidHarness(initialItems: readonly string[]): IdentityHarness {
  const container = document.createElement("div");
  document.body.append(container);
  const [items, setItems] = createSignal(initialItems);
  const [exiting, setExiting] = createSignal<readonly ExitingIdentity[]>([]);
  const dispose = render(() => <Harness exiting={exiting()} items={items()} />, container);

  return {
    root: container,
    dispose: () => {
      dispose();
      container.remove();
    },
    update: (nextItems, nextExiting = []) => {
      setExiting(nextExiting);
      setItems(nextItems);
    },
  };
}

runIdentityConformance("Solid", createSolidHarness);
