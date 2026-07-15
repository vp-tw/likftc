/** @jsxImportSource react */

import {
  createAfterRows,
  createBeforeRows,
  describeRow,
  type DemoFrameState,
  type DemoItem,
  type DemoRenderedRow,
} from "./demo.js";

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
  label,
  rows,
}: {
  readonly corrected: boolean;
  readonly label: string;
  readonly rows: readonly DemoRenderedRow[];
}) {
  return (
    <article className="runtime-panel">
      <small>{corrected ? `WITH LIKFTC + ${label}` : `WITHOUT + ${label}`}</small>
      <h3>{corrected ? "Presence identity" : "Logical ID key"}</h3>
      <ol data-list={corrected ? "after" : "before"}>
        {rows.map((row) => (
          <Row key={row.key} row={row} />
        ))}
      </ol>
    </article>
  );
}

export function ReactStatePanels({
  entries,
  frame,
  label,
}: {
  readonly entries: readonly { readonly item: DemoItem; readonly key: number }[];
  readonly frame: DemoFrameState;
  readonly label: string;
}) {
  return (
    <div className="runtime-grid">
      <Panel corrected={false} label={label} rows={createBeforeRows(frame)} />
      <Panel corrected label={label} rows={createAfterRows(frame, entries)} />
    </div>
  );
}
