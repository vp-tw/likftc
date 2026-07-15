/** @jsxImportSource @qwik.dev/core */

import { useLikftc } from "@vp-tw/likftc-qwik";
import { component$, createSignal, render, type Signal } from "@qwik.dev/core";

import {
  createAfterRows,
  createBeforeRows,
  describeRow,
  mountFrameworkDemo,
  type DemoFrameState,
  type DemoRenderedRow,
  type DemoRuntime,
} from "../shared/demo.js";

interface RuntimeProps {
  readonly frame: Signal<DemoFrameState>;
}

const Row = component$<{ readonly row: DemoRenderedRow }>(({ row }) => (
  <li
    class="runtime-row"
    data-collision={String(row.kind === "collision")}
    data-id={row.item.id}
    data-key={row.keyText}
    data-kind={row.kind}
    data-phase={row.kind === "exiting" ? "exiting" : "current"}
    data-slot={String(row.slot)}
  >
    <b>{row.item.id.toUpperCase()}</b>
    <span>{row.item.label}</span>
    <code>{row.keyText}</code>
    <em>{describeRow(row.kind)}</em>
  </li>
));

const Panel = component$<{
  readonly corrected: boolean;
  readonly rows: readonly DemoRenderedRow[];
}>(({ corrected, rows }) => (
  <article class="runtime-panel">
    <small>{corrected ? "WITH @LIKFTC/QWIK" : "WITHOUT"}</small>
    <h3>{corrected ? "Presence identity" : "Logical ID key"}</h3>
    <ol data-list={corrected ? "after" : "before"}>
      {rows.map((row) => (
        <Row key={row.key} row={row} />
      ))}
    </ol>
  </article>
));

const Runtime = component$<RuntimeProps>(({ frame }) => {
  const entries = useLikftc(frame.value.items, { getId: (item) => item.id });
  return (
    <div class="runtime-grid">
      <Panel corrected={false} rows={createBeforeRows(frame.value)} />
      <Panel corrected rows={createAfterRows(frame.value, entries)} />
    </div>
  );
});

function hasRenderedFrame(root: ParentNode, state: DemoFrameState): boolean {
  const renderedIds = Array.from(
    root.querySelectorAll<HTMLElement>(
      '[data-list="before"] > [data-kind]:not([data-kind="exiting"])',
    ),
  ).map((row) => row.dataset["id"]);
  return (
    renderedIds.length === state.items.length &&
    renderedIds.every((id, index) => id === state.items[index]?.id)
  );
}

function waitForRenderedFrame(root: ParentNode, state: DemoFrameState): Promise<void> {
  if (hasRenderedFrame(root, state)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      observer.disconnect();
      reject(new Error("Qwik did not commit the requested demo frame"));
    }, 1_000);
    const observer = new MutationObserver(() => {
      if (!hasRenderedFrame(root, state)) return;
      window.clearTimeout(timeoutId);
      observer.disconnect();
      resolve();
    });
    observer.observe(root, {
      attributeFilter: ["data-id", "data-kind"],
      attributes: true,
      childList: true,
      subtree: true,
    });
  });
}

await mountFrameworkDemo("Qwik", async (target, initialState): Promise<DemoRuntime> => {
  const frame = createSignal(initialState);
  const root = document.createElement("div");
  target.append(root);
  const result = await render(root, <Runtime frame={frame} />);
  return {
    destroy: () => {
      result.cleanup();
      root.remove();
    },
    update: async (nextState) => {
      frame.value = nextState;
      await waitForRenderedFrame(root, nextState);
    },
  };
});
