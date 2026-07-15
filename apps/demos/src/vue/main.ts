import { createApp, nextTick, shallowRef } from "vue";

import { mountFrameworkDemo, type DemoFrameState, type DemoRuntime } from "../shared/demo.js";
import Runtime from "./Runtime.vue";

await mountFrameworkDemo("Vue", (target, initialState): DemoRuntime => {
  const frame = shallowRef<DemoFrameState>(initialState);
  const app = createApp(Runtime, { frame });
  app.mount(target);
  return {
    destroy: () => app.unmount(),
    update: async (nextState) => {
      frame.value = nextState;
      await nextTick();
    },
  };
});
