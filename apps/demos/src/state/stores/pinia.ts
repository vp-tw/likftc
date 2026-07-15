import { defineStore } from "pinia";
import { shallowRef } from "vue";

import type { DemoFrameState } from "../../shared/demo.js";

const emptyFrame: DemoFrameState = { enteringIds: [], items: [], retainedExits: [] };

export const useDemoStore = defineStore("likftc-demo", () => {
  const frame = shallowRef<DemoFrameState>(emptyFrame);
  const setFrame = (nextFrame: DemoFrameState): void => {
    frame.value = nextFrame;
  };
  return { frame, setFrame };
});
