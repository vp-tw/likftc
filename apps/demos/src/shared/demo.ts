import demoStyles from "./style.css?inline";
import numberFlowStyles from "./number-flow.css?inline";

import {
  animateDemoRows,
  cancelDemoRowAnimations,
  createDemoMotionTiming,
  demoMotionTiming,
  demoTimingControlRanges,
  prepareRowAnimationUpdate,
  type DemoMotionTiming,
} from "./motion.js";
import { cancelNumberFlowAnimations, setNumberFlowValue } from "./number-flow.js";
import {
  createFrameState,
  demoFrames as frames,
  findFrameDelta,
  readDemoTransitionKey,
  type DemoFrameDefinition,
  type DemoFrameState,
  type DemoItem,
  type DemoRetainedExit,
} from "./scenario.js";

export {
  createAfterRows,
  createBeforeRows,
  describeRow,
  type DemoFrameState,
  type DemoItem,
  type DemoRenderedRow,
  type DemoRetainedExit,
  type DemoRowKind,
} from "./scenario.js";

export interface DemoRuntime {
  destroy(): Promise<void> | void;
  update(state: DemoFrameState): Promise<void> | void;
}

export type DemoRuntimeFactory = (
  target: HTMLElement,
  state: DemoFrameState,
) => Promise<DemoRuntime> | DemoRuntime;

function requireElement<ElementType extends Element>(
  root: ParentNode,
  selector: string,
): ElementType {
  const element = root.querySelector<ElementType>(selector);
  if (element === null) throw new Error(`Missing demo element: ${selector}`);
  return element;
}

function captureRetainedExit(
  root: ParentNode,
  item: DemoItem,
  slot: number,
  expiresAt: number,
): DemoRetainedExit {
  const row = Array.from(
    root.querySelectorAll<HTMLElement>('[data-list="after"] [data-phase="current"]'),
  ).find((candidate) => candidate.dataset["id"] === item.id);
  if (row === undefined) throw new Error(`Missing current row for ${item.id}`);
  const key = readDemoTransitionKey(row.dataset["key"]);
  return { expiresAt, item, key, slot };
}

const rowInstances = new WeakMap<Element, number>();
let nextRowInstance = 1;

function stampRowInstances(root: ParentNode): void {
  for (const row of root.querySelectorAll<HTMLElement>("[data-list] [data-key]")) {
    let instance = rowInstances.get(row);
    if (instance === undefined) {
      instance = nextRowInstance++;
      rowInstances.set(row, instance);
    }
    row.dataset["instance"] = String(instance);
  }
}

export async function mountFrameworkDemo(
  framework: string,
  createRuntime: DemoRuntimeFactory,
): Promise<void> {
  const host = requireElement<HTMLElement>(document, "[data-likftc-demo]");
  const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  const initialDefinition = frames[0];
  if (initialDefinition === undefined) throw new Error("Demo requires at least one frame");
  root.innerHTML = `
    <style>${demoStyles}\n${numberFlowStyles}</style>
    <section
      class="runtime-demo"
      aria-label="${framework} before-and-after list identity demo"
      data-frame-interval-ms="${demoMotionTiming.frameIntervalMs}"
      data-flip-duration-ms="${demoMotionTiming.flipDurationMs}"
      data-exit-duration-ms="${demoMotionTiming.exitDurationMs}"
    >
      <header class="demo-header">
        <p><span>LIVE</span> ${framework.toUpperCase()} RUNTIME</p>
        <h2>State updates keep interrupting the FLIP.</h2>
        <dl class="demo-timing" aria-label="Demo animation timing">
          <div><dt>State update</dt><dd data-timing-summary="frame">${demoMotionTiming.frameIntervalMs}ms</dd></div>
          <div><dt>FLIP move</dt><dd data-timing-summary="flip">${demoMotionTiming.flipDurationMs}ms</dd></div>
          <div><dt>Exit fade</dt><dd data-timing-summary="exit">${demoMotionTiming.exitDurationMs}ms</dd></div>
        </dl>
      </header>
      <div class="demo-toolbar" aria-label="Demo controls">
        <div class="frame-controls">
          <button type="button" data-action="previous" aria-label="Previous frame">←</button>
          <button type="button" data-action="next">Next frame →</button>
          <button type="button" data-action="play" aria-pressed="false">Play loop</button>
          <button type="button" data-action="reset">Reset</button>
        </div>
        <fieldset>
          <legend>Motion</legend>
          <button type="button" data-motion="system" aria-pressed="true">System</button>
          <button type="button" data-motion="reduced" aria-pressed="false">Reduced</button>
          <button type="button" data-motion="full" aria-pressed="false">Full</button>
        </fieldset>
        <div class="frame-caption" data-frame-caption>
          <div class="frame-caption-copy" data-frame-caption-copy aria-hidden="true">
            <span class="frame-caption-index" data-frame-caption-index>Frame 1 / ${frames.length}</span>
            <span class="frame-caption-text" data-frame-caption-text>${initialDefinition.description}</span>
          </div>
          <output class="frame-status-live" data-status aria-live="polite">
            Frame 1 of ${frames.length}: ${initialDefinition.description}
          </output>
        </div>
      </div>
      <fieldset class="demo-timing-controls">
        <legend>Playback timing</legend>
        <label for="demo-state-interval">
          <span>State interval</span>
          <output for="demo-state-interval" data-timing-output="frame">${demoMotionTiming.frameIntervalMs}ms</output>
          <input
            id="demo-state-interval"
            type="range"
            min="${demoTimingControlRanges.frameIntervalMs.min}"
            max="${demoTimingControlRanges.frameIntervalMs.max}"
            step="${demoTimingControlRanges.frameIntervalMs.step}"
            value="${demoMotionTiming.frameIntervalMs}"
            aria-label="State interval"
            data-timing-control="frame"
          />
        </label>
        <label for="demo-motion-duration">
          <span>Motion duration</span>
          <output for="demo-motion-duration" data-timing-output="motion">${demoMotionTiming.flipDurationMs}ms</output>
          <input
            id="demo-motion-duration"
            type="range"
            min="${demoTimingControlRanges.motionDurationMs.min}"
            max="${demoTimingControlRanges.motionDurationMs.max}"
            step="${demoTimingControlRanges.motionDurationMs.step}"
            value="${demoMotionTiming.flipDurationMs}"
            aria-label="Motion duration"
            data-timing-control="motion"
          />
        </label>
        <p data-timing-guidance aria-live="polite"></p>
      </fieldset>
      <div data-runtime></div>
      <p class="demo-diagnostic" data-diagnostic></p>
    </section>
  `;

  const demo = requireElement<HTMLElement>(root, ".runtime-demo");
  const runtimeTarget = requireElement<HTMLElement>(root, "[data-runtime]");
  const status = requireElement<HTMLOutputElement>(root, "[data-status]");
  const captionCopy = requireElement<HTMLElement>(root, "[data-frame-caption-copy]");
  const captionIndex = requireElement<HTMLElement>(root, "[data-frame-caption-index]");
  const captionText = requireElement<HTMLElement>(root, "[data-frame-caption-text]");
  const diagnostic = requireElement<HTMLParagraphElement>(root, "[data-diagnostic]");
  const playButton = requireElement<HTMLButtonElement>(root, '[data-action="play"]');
  const frameIntervalInput = requireElement<HTMLInputElement>(
    root,
    '[data-timing-control="frame"]',
  );
  const motionDurationInput = requireElement<HTMLInputElement>(
    root,
    '[data-timing-control="motion"]',
  );
  const frameIntervalOutput = requireElement<HTMLOutputElement>(
    root,
    '[data-timing-output="frame"]',
  );
  const motionDurationOutput = requireElement<HTMLOutputElement>(
    root,
    '[data-timing-output="motion"]',
  );
  const frameIntervalSummary = requireElement<HTMLElement>(root, '[data-timing-summary="frame"]');
  const flipDurationSummary = requireElement<HTMLElement>(root, '[data-timing-summary="flip"]');
  const exitDurationSummary = requireElement<HTMLElement>(root, '[data-timing-summary="exit"]');
  const timingGuidance = requireElement<HTMLParagraphElement>(root, "[data-timing-guidance]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let motion: "full" | "reduced" | "system" = "system";
  let timing: DemoMotionTiming = demoMotionTiming;
  let frameIndex = 0;
  let runtime = await createRuntime(runtimeTarget, createFrameState(initialDefinition));
  stampRowInstances(runtimeTarget);
  let retainedExits: readonly DemoRetainedExit[] = [];
  let enteringIds: readonly string[] = [];
  let updateQueue = Promise.resolve();
  let exitCleanupTimer: number | undefined;
  let playbackTimer: number | undefined;
  let isPlaying = false;

  function motionIsEnabled(): boolean {
    return motion === "full" || (motion === "system" && !reducedMotion.matches);
  }

  function cancelRuntimeAnimations(): void {
    cancelDemoRowAnimations(runtimeTarget);
    cancelNumberFlowAnimations(root);
  }

  function updateTimingUi(): void {
    frameIntervalInput.value = String(timing.frameIntervalMs);
    motionDurationInput.value = String(timing.flipDurationMs);
    const shouldAnimate = motionIsEnabled();
    setNumberFlowValue(frameIntervalOutput, timing.frameIntervalMs, shouldAnimate);
    setNumberFlowValue(motionDurationOutput, timing.flipDurationMs, shouldAnimate);
    setNumberFlowValue(frameIntervalSummary, timing.frameIntervalMs, shouldAnimate);
    setNumberFlowValue(flipDurationSummary, timing.flipDurationMs, shouldAnimate);
    setNumberFlowValue(exitDurationSummary, timing.exitDurationMs, shouldAnimate);
    demo.dataset["frameIntervalMs"] = String(timing.frameIntervalMs);
    demo.dataset["flipDurationMs"] = String(timing.flipDurationMs);
    demo.dataset["exitDurationMs"] = String(timing.exitDurationMs);

    const overlap = timing.flipDurationMs / timing.frameIntervalMs;
    const demonstratesCollision = overlap > 1;
    timingGuidance.dataset["state"] = demonstratesCollision ? "ready" : "warning";
    timingGuidance.textContent = demonstratesCollision
      ? `Motion spans ${overlap.toFixed(1)} state updates. Changes apply on the next frame.`
      : "Motion ends before the next state update. Increase its duration to expose the key collision.";
  }

  function updateTimingFromControls(): void {
    timing = createDemoMotionTiming(
      frameIntervalInput.valueAsNumber,
      motionDurationInput.valueAsNumber,
    );
    updateTimingUi();
    updateDiagnostics();
    updatePlaybackControl();
    if (isPlaying && playbackTimer !== undefined) {
      window.clearTimeout(playbackTimer);
      playbackTimer = undefined;
      schedulePlayback();
    }
  }

  function updatePlaybackControl(): void {
    const canPlay = motionIsEnabled();
    playButton.disabled = !canPlay;
    playButton.textContent = isPlaying ? "Pause loop" : "Play loop";
    playButton.setAttribute("aria-pressed", String(isPlaying));
    playButton.title = canPlay
      ? `Continuously update the list every ${timing.frameIntervalMs}ms`
      : "Choose Full motion to enable continuous playback";
    status.setAttribute("aria-live", isPlaying ? "off" : "polite");
    demo.dataset["playback"] = isPlaying ? "playing" : "paused";
  }

  function stopPlayback(): void {
    if (playbackTimer !== undefined) window.clearTimeout(playbackTimer);
    playbackTimer = undefined;
    isPlaying = false;
    updatePlaybackControl();
  }

  function clearExitCleanupTimer(): void {
    if (exitCleanupTimer !== undefined) window.clearTimeout(exitCleanupTimer);
    exitCleanupTimer = undefined;
  }

  function currentFrameState(): DemoFrameState {
    const frame = frames[frameIndex];
    if (frame === undefined) throw new Error(`Missing current demo frame ${frameIndex}`);
    return createFrameState(frame, retainedExits, enteringIds);
  }

  function scheduleExitCleanup(): void {
    clearExitCleanupTimer();
    const nextExpiry = retainedExits.reduce<number | undefined>(
      (earliest, exit) =>
        earliest === undefined ? exit.expiresAt : Math.min(earliest, exit.expiresAt),
      undefined,
    );
    if (nextExpiry === undefined) return;
    exitCleanupTimer = window.setTimeout(
      () => {
        exitCleanupTimer = undefined;
        enqueueUpdate(async () => {
          const now = performance.now();
          const activeExits = retainedExits.filter((exit) => exit.expiresAt > now);
          if (activeExits.length !== retainedExits.length) {
            retainedExits = activeExits;
            await runtime.update(currentFrameState());
            stampRowInstances(runtimeTarget);
            updateDiagnostics();
          }
          scheduleExitCleanup();
        });
      },
      Math.max(0, nextExpiry - performance.now()),
    );
  }

  function updateDiagnostics(): void {
    const frame = frames[frameIndex];
    if (frame === undefined) return;
    const nextFrameIndex = String(frameIndex);
    const frameChanged = status.dataset["frameIndex"] !== nextFrameIndex;
    const hadPreviousFrame = status.dataset["frameIndex"] !== undefined;
    captionIndex.textContent = `Frame ${frameIndex + 1} / ${frames.length}`;
    captionText.textContent = frame.description;
    status.value = `Frame ${frameIndex + 1} of ${frames.length}: ${frame.description}`;
    status.dataset["frameIndex"] = nextFrameIndex;
    if (frameChanged && hadPreviousFrame && motionIsEnabled()) {
      for (const animation of captionCopy.getAnimations()) animation.cancel();
      captionCopy.animate([{ transform: "translateY(0.35rem)" }, { transform: "translateY(0)" }], {
        duration: 220,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      });
    }
    demo.dataset["frameIndex"] = nextFrameIndex;
    const collision = runtimeTarget.querySelector<HTMLElement>(
      '[data-list="before"] [data-kind="collision"]',
    );
    const entering = runtimeTarget.querySelector<HTMLElement>(
      '[data-list="after"] [data-kind="entering"]',
    );
    const exiting = Array.from(
      runtimeTarget.querySelectorAll<HTMLElement>('[data-list="after"] [data-kind="exiting"]'),
    ).find((candidate) => candidate.dataset["id"] === entering?.dataset["id"]);
    diagnostic.textContent =
      collision !== null && exiting !== undefined && entering !== null
        ? `Without: exit DOM #${collision.dataset["instance"]} is reused and FLIP moves it to the returning slot. With Likftc: exit DOM #${exiting.dataset["instance"]} stays and new DOM #${entering.dataset["instance"]} enters.`
        : `Every ${timing.frameIntervalMs}ms update interrupts a ${timing.flipDurationMs}ms FLIP. Watch the same IDs return before their exits finish.`;
  }

  async function applyFrame(
    definition: DemoFrameDefinition,
    index: number,
    shouldAnimate: boolean,
  ): Promise<void> {
    const previousDefinition = frames[frameIndex];
    if (previousDefinition === undefined) throw new Error(`Missing previous frame ${frameIndex}`);
    const now = performance.now();
    retainedExits = retainedExits.filter((exit) => exit.expiresAt > now);
    const delta = findFrameDelta(previousDefinition, definition);
    retainedExits = [
      ...retainedExits,
      ...delta.exitingItems.map(({ item, slot }) =>
        captureRetainedExit(runtimeTarget, item, slot, now + timing.exitDurationMs),
      ),
    ];
    enteringIds = delta.enteringIds;

    const shouldRunMotion = shouldAnimate && motionIsEnabled();
    const previous = shouldRunMotion
      ? prepareRowAnimationUpdate(runtimeTarget)
      : new Map<string, never>();
    if (!shouldRunMotion) cancelRuntimeAnimations();
    await runtime.update(createFrameState(definition, retainedExits, enteringIds));
    stampRowInstances(runtimeTarget);
    if (shouldRunMotion) animateDemoRows(runtimeTarget, previous, timing);
    frameIndex = index;
    updateDiagnostics();
    scheduleExitCleanup();
  }

  async function recreateRuntime(targetFrame: number): Promise<void> {
    clearExitCleanupTimer();
    cancelRuntimeAnimations();
    await runtime.destroy();
    runtimeTarget.replaceChildren();
    runtime = await createRuntime(runtimeTarget, createFrameState(initialDefinition));
    stampRowInstances(runtimeTarget);
    retainedExits = [];
    enteringIds = [];
    frameIndex = 0;
    for (let index = 1; index <= targetFrame; index += 1) {
      const definition = frames[index];
      if (definition === undefined) break;
      await applyFrame(definition, index, false);
    }
    updateDiagnostics();
  }

  async function showFrame(index: number): Promise<void> {
    const targetFrame = Math.max(0, Math.min(index, frames.length - 1));
    if (targetFrame < frameIndex) {
      await recreateRuntime(targetFrame);
      return;
    }
    if (targetFrame === frameIndex) return;
    const frame = frames[targetFrame];
    if (frame === undefined) return;
    await applyFrame(frame, targetFrame, true);
  }

  function enqueueUpdate(update: () => Promise<void>): void {
    updateQueue = updateQueue.then(update).catch((error: unknown) => {
      stopPlayback();
      queueMicrotask(() => {
        throw error;
      });
    });
  }

  function schedulePlayback(): void {
    if (!isPlaying) return;
    const frame = frames[frameIndex];
    if (frame === undefined) return;
    playbackTimer = window.setTimeout(() => {
      playbackTimer = undefined;
      enqueueUpdate(async () => {
        if (!isPlaying) return;
        const nextFrame = (frameIndex + 1) % frames.length;
        const definition = frames[nextFrame];
        if (definition !== undefined) await applyFrame(definition, nextFrame, true);
        schedulePlayback();
      });
    }, timing.frameIntervalMs);
  }

  function startPlayback(): void {
    if (isPlaying || !motionIsEnabled()) return;
    isPlaying = true;
    updatePlaybackControl();
    enqueueUpdate(async () => {
      if (!isPlaying) return;
      schedulePlayback();
    });
  }

  requireElement<HTMLButtonElement>(root, '[data-action="previous"]').addEventListener(
    "click",
    () => {
      stopPlayback();
      enqueueUpdate(() => showFrame(frameIndex - 1));
    },
  );
  requireElement<HTMLButtonElement>(root, '[data-action="next"]').addEventListener("click", () => {
    stopPlayback();
    enqueueUpdate(() => showFrame(frameIndex + 1));
  });
  playButton.addEventListener("click", () => {
    if (isPlaying) stopPlayback();
    else startPlayback();
  });
  requireElement<HTMLButtonElement>(root, '[data-action="reset"]').addEventListener("click", () => {
    stopPlayback();
    enqueueUpdate(() => recreateRuntime(0));
  });

  frameIntervalInput.addEventListener("input", updateTimingFromControls);
  motionDurationInput.addEventListener("input", updateTimingFromControls);

  for (const button of root.querySelectorAll<HTMLButtonElement>("[data-motion]")) {
    button.addEventListener("click", () => {
      const nextMotion = button.dataset["motion"];
      if (nextMotion !== "full" && nextMotion !== "reduced" && nextMotion !== "system") return;
      motion = nextMotion;
      for (const option of root.querySelectorAll<HTMLButtonElement>("[data-motion]")) {
        option.setAttribute("aria-pressed", String(option === button));
      }
      demo.dataset["motion"] = motion;
      if (!motionIsEnabled()) {
        stopPlayback();
        cancelRuntimeAnimations();
      } else {
        updatePlaybackControl();
      }
    });
  }

  reducedMotion.addEventListener("change", () => {
    if (!motionIsEnabled()) {
      stopPlayback();
      cancelRuntimeAnimations();
    } else {
      updatePlaybackControl();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopPlayback();
  });

  updateTimingUi();
  updateDiagnostics();
  updatePlaybackControl();
  startPlayback();
}
