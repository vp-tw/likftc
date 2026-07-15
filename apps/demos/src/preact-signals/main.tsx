/** @jsxImportSource preact */

import { useLikftc } from "@vp-tw/likftc/preact";
import { signal, type Signal } from "@preact/signals";
import { render } from "preact";

import { mountFrameworkDemo, type DemoFrameState, type DemoRuntime } from "../shared/demo.js";
import { PreactStatePanels } from "../shared/preact-state-panels.js";

function Runtime({ frameSignal }: { readonly frameSignal: Signal<DemoFrameState> }) {
  const frame = frameSignal.value;
  const entries = useLikftc(frame.items, { getId: (item) => item.id });
  return <PreactStatePanels entries={entries} frame={frame} />;
}

await mountFrameworkDemo("Preact Signals + Preact", (target, initialState): DemoRuntime => {
  const frameSignal = signal(initialState);
  render(<Runtime frameSignal={frameSignal} />, target);
  return {
    destroy: () => render(null, target),
    update: (frame) => {
      frameSignal.value = frame;
    },
  };
});
