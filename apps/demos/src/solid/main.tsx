import { createLikftc } from "@vp-tw/likftc/solid";
import { For, createSignal, type Accessor } from "solid-js";
import { render } from "solid-js/web";

import {
  createAfterRows,
  createBeforeRows,
  describeRow,
  mountFrameworkDemo,
  type DemoFrameState,
  type DemoRenderedRow,
  type DemoRuntime,
} from "../shared/demo.js";

function requireRow(rows: readonly DemoRenderedRow[], key: number | string): DemoRenderedRow {
  const row = rows.find((candidate) => candidate.key === key);
  if (row === undefined) throw new Error(`Missing Solid demo row ${key}`);
  return row;
}

function Row(props: { readonly row: Accessor<DemoRenderedRow> }) {
  return (
    <li
      class="runtime-row"
      data-collision={String(props.row().kind === "collision")}
      data-id={props.row().item.id}
      data-key={props.row().keyText}
      data-kind={props.row().kind}
      data-phase={props.row().kind === "exiting" ? "exiting" : "current"}
      data-slot={String(props.row().slot)}
    >
      <b>{props.row().item.id.toUpperCase()}</b>
      <span>{props.row().item.label}</span>
      <code>{props.row().keyText}</code>
      <em>{describeRow(props.row().kind)}</em>
    </li>
  );
}

await mountFrameworkDemo("Solid", (target, initialState): DemoRuntime => {
  const [frame, setFrame] = createSignal<DemoFrameState>(initialState);
  const dispose = render(() => {
    const list = createLikftc(() => frame().items, { getId: (item) => item.id });
    const beforeRows = () => createBeforeRows(frame());
    const afterRows = () =>
      createAfterRows(
        frame(),
        list.keys().map((key) => {
          const entry = list.entry(key)();
          if (entry === undefined) throw new Error(`Missing Solid entry ${key}`);
          return entry;
        }),
      );
    return (
      <div class="runtime-grid">
        <article class="runtime-panel">
          <small>WITHOUT</small>
          <h3>Logical ID key</h3>
          <ol data-list="before">
            <For each={beforeRows().map((row) => row.key)}>
              {(key) => <Row row={() => requireRow(beforeRows(), key)} />}
            </For>
          </ol>
        </article>
        <article class="runtime-panel">
          <small>WITH @LIKFTC/SOLID</small>
          <h3>Presence identity</h3>
          <ol data-list="after">
            <For each={afterRows().map((row) => row.key)}>
              {(key) => <Row row={() => requireRow(afterRows(), key)} />}
            </For>
          </ol>
        </article>
      </div>
    );
  }, target);
  return {
    destroy: dispose,
    update: (nextState) => {
      setFrame(nextState);
    },
  };
});
