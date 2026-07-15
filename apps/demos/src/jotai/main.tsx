/** @jsxImportSource react */

import { useLikftc } from "@vp-tw/likftc/react";
import { atom, createStore, Provider, useAtomValue, type Atom } from "jotai";
import { StrictMode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import {
  createAfterRows,
  createBeforeRows,
  describeRow,
  mountFrameworkDemo,
  type DemoFrameState,
  type DemoRenderedRow,
  type DemoRuntime,
} from "../shared/demo.js";

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
      <small>{corrected ? "WITH LIKFTC + JOTAI" : "WITHOUT + JOTAI"}</small>
      <h3>{corrected ? "Presence identity" : "Logical ID key"}</h3>
      <ol data-list={corrected ? "after" : "before"}>
        {rows.map((row) => (
          <Row key={row.key} row={row} />
        ))}
      </ol>
    </article>
  );
}

function Runtime({ frameAtom }: { readonly frameAtom: Atom<DemoFrameState> }) {
  const frame = useAtomValue(frameAtom);
  const entries = useLikftc(frame.items, { getId: (item) => item.id });
  return (
    <div className="runtime-grid">
      <Panel corrected={false} rows={createBeforeRows(frame)} />
      <Panel corrected rows={createAfterRows(frame, entries)} />
    </div>
  );
}

await mountFrameworkDemo("Jotai + React", (target, initialState): DemoRuntime => {
  const frameAtom = atom(initialState);
  const store = createStore();
  const root = createRoot(target);
  flushSync(() =>
    root.render(
      <StrictMode>
        <Provider store={store}>
          <Runtime frameAtom={frameAtom} />
        </Provider>
      </StrictMode>,
    ),
  );
  return {
    destroy: () => flushSync(() => root.unmount()),
    update: (frame) => flushSync(() => store.set(frameAtom, frame)),
  };
});
