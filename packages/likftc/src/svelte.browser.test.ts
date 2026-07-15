import { mount, tick, unmount } from "svelte";

import { runIdentityConformance, type IdentityHarness } from "../../../test/browser-conformance.js";
import TestHarness from "./SvelteTestHarness.svelte";

async function createSvelteHarness(initialItems: readonly string[]): Promise<IdentityHarness> {
  const container = document.createElement("div");
  document.body.append(container);
  const harness = mount(TestHarness, { target: container });
  harness["setFrame"](initialItems);
  await tick();

  return {
    root: container,
    dispose: async () => {
      await unmount(harness);
      container.remove();
    },
    update: async (items, exiting = []) => {
      harness["setFrame"](items, exiting);
      await tick();
    },
  };
}

runIdentityConformance("Svelte", createSvelteHarness);
