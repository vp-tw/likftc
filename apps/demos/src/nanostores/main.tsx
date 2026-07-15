/** @jsxImportSource react */

import { useLikftc } from "@vp-tw/likftc/react";
import { useStore } from "@nanostores/react";
import { atom, type WritableAtom } from "nanostores";
import { StrictMode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import { mountFrameworkDemo, type DemoFrameState, type DemoRuntime } from "../shared/demo.js";
import { ReactStatePanels } from "../shared/react-state-panels.js";

function Runtime({ frameStore }: { readonly frameStore: WritableAtom<DemoFrameState> }) {
  const frame = useStore(frameStore);
  const entries = useLikftc(frame.items, { getId: (item) => item.id });
  return <ReactStatePanels entries={entries} frame={frame} label="NANOSTORES" />;
}

await mountFrameworkDemo("Nanostores + React", (target, initialState): DemoRuntime => {
  const frameStore = atom(initialState);
  const root = createRoot(target);
  flushSync(() =>
    root.render(
      <StrictMode>
        <Runtime frameStore={frameStore} />
      </StrictMode>,
    ),
  );
  return {
    destroy: () => flushSync(() => root.unmount()),
    update: (frame) => flushSync(() => frameStore.set(frame)),
  };
});
