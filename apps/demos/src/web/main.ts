import { createLikftc } from "@vp-tw/likftc/web";

import {
  createAfterRows,
  createBeforeRows,
  describeRow,
  mountFrameworkDemo,
  type DemoFrameState,
  type DemoItem,
  type DemoRenderedRow,
  type DemoRuntime,
} from "../shared/demo.js";

function createPanel(corrected: boolean): {
  readonly list: HTMLOListElement;
  readonly panel: HTMLElement;
} {
  const panel = document.createElement("article");
  panel.className = "runtime-panel";
  const label = document.createElement("small");
  label.textContent = corrected ? "WITH @LIKFTC/WEB" : "WITHOUT";
  const title = document.createElement("h3");
  title.textContent = corrected ? "Presence identity" : "Logical ID key";
  const list = document.createElement("ol");
  list.dataset["list"] = corrected ? "after" : "before";
  panel.append(label, title, list);
  return { list, panel };
}

function requireChild<ElementType extends Element>(row: ParentNode, selector: string): ElementType {
  const child = row.querySelector<ElementType>(selector);
  if (child === null) throw new Error(`Missing Web Components demo child ${selector}`);
  return child;
}

function createRow(): HTMLLIElement {
  const row = document.createElement("li");
  row.className = "runtime-row";
  row.innerHTML = "<b></b><span></span><code></code><em></em>";
  return row;
}

function updateRow(element: HTMLLIElement, row: DemoRenderedRow): void {
  element.dataset["collision"] = String(row.kind === "collision");
  element.dataset["id"] = row.item.id;
  element.dataset["key"] = row.keyText;
  element.dataset["kind"] = row.kind;
  element.dataset["phase"] = row.kind === "exiting" ? "exiting" : "current";
  element.dataset["slot"] = String(row.slot);
  requireChild<HTMLElement>(element, "b").textContent = row.item.id.toUpperCase();
  requireChild<HTMLElement>(element, "span").textContent = row.item.label;
  requireChild<HTMLElement>(element, "code").textContent = row.keyText;
  requireChild<HTMLElement>(element, "em").textContent = describeRow(row.kind);
}

function syncRows(
  list: HTMLOListElement,
  elements: Map<number | string, HTMLLIElement>,
  rows: readonly DemoRenderedRow[],
): void {
  const activeKeys = new Set(rows.map((row) => row.key));
  for (const [key, element] of elements) {
    if (!activeKeys.has(key)) {
      element.remove();
      elements.delete(key);
    }
  }
  for (const row of rows) {
    const element = elements.get(row.key) ?? createRow();
    elements.set(row.key, element);
    updateRow(element, row);
    list.append(element);
  }
}

await mountFrameworkDemo("Web Components", (target, initialState): DemoRuntime => {
  const grid = document.createElement("div");
  grid.className = "runtime-grid";
  const before = createPanel(false);
  const after = createPanel(true);
  grid.append(before.panel, after.panel);
  target.append(grid);

  const controller = createLikftc<DemoItem, string>({ getId: (item) => item.id });
  const beforeRows = new Map<number | string, HTMLLIElement>();
  const afterRows = new Map<number | string, HTMLLIElement>();
  const update = (state: DemoFrameState): void => {
    syncRows(before.list, beforeRows, createBeforeRows(state));
    const entries = controller.update(state.items);
    syncRows(after.list, afterRows, createAfterRows(state, entries));
  };
  update(initialState);
  return {
    destroy: () => grid.remove(),
    update,
  };
});
