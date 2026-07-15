/** @jsxImportSource react */

import { useLikftc } from "@vp-tw/likftc/react";
import { useSelector } from "@xstate/react";
import { StrictMode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { createActor, fromTransition, type ActorRefFrom } from "xstate";

import { mountFrameworkDemo, type DemoFrameState, type DemoRuntime } from "../shared/demo.js";
import { ReactStatePanels } from "../shared/react-state-panels.js";

type FrameEvent = { readonly frame: DemoFrameState; readonly type: "frame.changed" };

function Runtime({ actor }: { readonly actor: ActorRefFrom<ReturnType<typeof createFrameLogic>> }) {
  const frame = useSelector(actor, (snapshot) => snapshot.context);
  const entries = useLikftc(frame.items, { getId: (item) => item.id });
  return <ReactStatePanels entries={entries} frame={frame} label="XSTATE" />;
}

function createFrameLogic(initialState: DemoFrameState) {
  return fromTransition((_state: DemoFrameState, event: FrameEvent) => event.frame, initialState);
}

await mountFrameworkDemo("XState + React", (target, initialState): DemoRuntime => {
  const actor = createActor(createFrameLogic(initialState));
  actor.start();
  const root = createRoot(target);
  flushSync(() =>
    root.render(
      <StrictMode>
        <Runtime actor={actor} />
      </StrictMode>,
    ),
  );
  return {
    destroy: () => {
      flushSync(() => root.unmount());
      actor.stop();
    },
    update: (frame) => flushSync(() => actor.send({ frame, type: "frame.changed" })),
  };
});
