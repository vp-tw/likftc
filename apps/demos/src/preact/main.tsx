/** @jsxImportSource preact */

import { useLikftc } from "@vp-tw/likftc/preact";
import { render } from "preact";

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
  );
}

function Panel({
  rows,
  corrected,
}: {
  readonly corrected: boolean;
  readonly rows: readonly DemoRenderedRow[];
}) {
  return (
    <article class="runtime-panel">
      <small>{corrected ? "WITH @LIKFTC/PREACT" : "WITHOUT"}</small>
      <h3>{corrected ? "Presence identity" : "Logical ID key"}</h3>
      <ol data-list={corrected ? "after" : "before"}>
        {rows.map((row) => (
          <Row key={row.key} row={row} />
        ))}
      </ol>
    </article>
  );
}

function Runtime({ state }: { readonly state: DemoFrameState }) {
  const entries = useLikftc(state.items, { getId: (item) => item.id });
  return (
    <div class="runtime-grid">
      <Panel corrected={false} rows={createBeforeRows(state)} />
      <Panel corrected rows={createAfterRows(state, entries)} />
    </div>
  );
}

await mountFrameworkDemo("Preact", (target, initialState): DemoRuntime => {
  const update = (state: DemoFrameState): void => render(<Runtime state={state} />, target);
  update(initialState);
  return {
    destroy: () => render(null, target),
    update,
  };
});
