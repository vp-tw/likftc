import { effect, signal } from "alien-signals";

import type { StateDemoDefinition } from "../../shared/state-demo.js";

const definition = {
  createSource: (initialState) => {
    const frame = signal(initialState);
    return {
      dispose: () => undefined,
      read: () => frame(),
      subscribe: (listener) =>
        effect(() => {
          frame();
          listener();
        }),
      write: (state) => frame(state),
    };
  },
  label: "Alien Signals",
  packageName: "ALIEN-SIGNALS",
} satisfies StateDemoDefinition;

export default definition;
