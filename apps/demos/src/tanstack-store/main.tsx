/** @jsxImportSource react */

import { useLikftc } from "@vp-tw/likftc/react";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { StrictMode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import { mountFrameworkDemo, type DemoFrameState, type DemoRuntime } from "../shared/demo.js";
import { ReactStatePanels } from "../shared/react-state-panels.js";

function Runtime({ store }: { readonly store: Store<DemoFrameState> }) {
  const frame = useSelector(store);
  const entries = useLikftc(frame.items, { getId: (item) => item.id });
  return <ReactStatePanels entries={entries} frame={frame} label="@TANSTACK/STORE" />;
}

await mountFrameworkDemo("TanStack Store + React", (target, initialState): DemoRuntime => {
  const store = new Store(initialState);
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
    update: (frame) => flushSync(() => store.setState(() => frame)),
  };
});
