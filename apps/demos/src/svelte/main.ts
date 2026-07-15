import { mount, tick, unmount } from "svelte";
import { writable } from "svelte/store";

import { mountFrameworkDemo, type DemoFrameState, type DemoRuntime } from "../shared/demo.js";
import Runtime from "./Runtime.svelte";

await mountFrameworkDemo("Svelte", (target, initialState): DemoRuntime => {
  const frame = writable<DemoFrameState>(initialState);
  const component = mount(Runtime, { props: { frame }, target });
  return {
    destroy: () => unmount(component),
    update: async (nextState) => {
      frame.set(nextState);
      await tick();
    },
  };
});
