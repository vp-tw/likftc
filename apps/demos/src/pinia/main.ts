import { createPinia, disposePinia } from "pinia";
import { createApp, nextTick } from "vue";

import { mountFrameworkDemo, type DemoRuntime } from "../shared/demo.js";
import { useDemoStore } from "../state/stores/pinia.js";
import Runtime from "./Runtime.vue";

await mountFrameworkDemo("Pinia + Vue", (target, initialState): DemoRuntime => {
  const pinia = createPinia();
  const app = createApp(Runtime);
  app.use(pinia);
  const store = useDemoStore(pinia);
  store.setFrame(initialState);
  app.mount(target);
  return {
    destroy: () => {
      app.unmount();
      disposePinia(pinia);
    },
    update: async (frame) => {
      store.setFrame(frame);
      await nextTick();
    },
  };
});
