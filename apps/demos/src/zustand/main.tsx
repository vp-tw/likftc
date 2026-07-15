/** @jsxImportSource react */

import { useLikftc } from "@vp-tw/likftc/react";
import { StrictMode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { createStore, type StoreApi } from "zustand/vanilla";
import { useStore } from "zustand";

import {
  createAfterRows,
  createBeforeRows,
  describeRow,
  mountFrameworkDemo,
  type DemoFrameState,
  type DemoRenderedRow,
  type DemoRuntime,
} from "../shared/demo.js";

interface DemoStore {
  readonly frame: DemoFrameState;
}

function Row({ row }: { readonly row: DemoRenderedRow }) {
  return (
    <li
      className="runtime-row"
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
  );
}

function Panel({
  corrected,
  rows,
}: {
  readonly corrected: boolean;
  readonly rows: readonly DemoRenderedRow[];
}) {
  return (
    <article className="runtime-panel">
      <small>{corrected ? "WITH LIKFTC + ZUSTAND" : "WITHOUT + ZUSTAND"}</small>
      <h3>{corrected ? "Presence identity" : "Logical ID key"}</h3>
      <ol data-list={corrected ? "after" : "before"}>
        {rows.map((row) => (
          <Row key={row.key} row={row} />
        ))}
      </ol>
    </article>
  );
}

function Runtime({ store }: { readonly store: StoreApi<DemoStore> }) {
  const frame = useStore(store, (state) => state.frame);
  const entries = useLikftc(frame.items, { getId: (item) => item.id });
  return (
    <div className="runtime-grid">
      <Panel corrected={false} rows={createBeforeRows(frame)} />
      <Panel corrected rows={createAfterRows(frame, entries)} />
    </div>
  );
}

await mountFrameworkDemo("Zustand + React", (target, initialState): DemoRuntime => {
  const store = createStore<DemoStore>(() => ({ frame: initialState }));
  const root = createRoot(target);
  flushSync(() =>
    root.render(
      <StrictMode>
        <Runtime store={store} />
      </StrictMode>,
    ),
  );
  return {
    destroy: () => flushSync(() => root.unmount()),
    update: (frame) => flushSync(() => store.setState({ frame })),
  };
});
