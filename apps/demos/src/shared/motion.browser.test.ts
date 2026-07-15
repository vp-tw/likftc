import { afterEach, describe, expect, it } from "vitest";

import { animateDemoRows, cancelDemoRowAnimations, type DemoMotionTiming } from "./motion.js";

const longTiming: DemoMotionTiming = {
  enterDurationMs: 60_000,
  exitDurationMs: 60_000,
  flipDurationMs: 60_000,
  frameIntervalMs: 1_000,
};

afterEach(() => {
  for (const animation of document.getAnimations()) animation.cancel();
  document.body.replaceChildren();
});

describe("demo motion isolation", () => {
  it("keeps another demo's animation tracking when one demo is cancelled", () => {
    const firstRoot = document.createElement("section");
    const secondRoot = document.createElement("section");
    secondRoot.innerHTML = `
      <ol data-list="after">
        <li data-key="presence-b" data-kind="exiting"><small>Exiting</small></li>
      </ol>
    `;
    document.body.append(firstRoot, secondRoot);

    const exitingRow = secondRoot.querySelector<HTMLElement>("[data-key]");
    expect(exitingRow).not.toBeNull();
    if (exitingRow === null) return;

    animateDemoRows(secondRoot, new Map(), longTiming);
    expect(exitingRow.getAnimations()).toHaveLength(1);

    cancelDemoRowAnimations(firstRoot);
    animateDemoRows(secondRoot, new Map(), longTiming);

    expect(exitingRow.getAnimations()).toHaveLength(1);
  });
});
