export interface DemoRowPosition {
  readonly left: number;
  readonly top: number;
}

export interface DemoRowSnapshot extends DemoRowPosition {
  readonly backgroundColor: string;
  readonly borderColor: string;
  readonly statusColor: string | undefined;
}

export interface DemoMotionTiming {
  readonly enterDurationMs: number;
  readonly exitDurationMs: number;
  readonly flipDurationMs: number;
  readonly frameIntervalMs: number;
}

export interface DemoTimingControlRange {
  readonly max: number;
  readonly min: number;
  readonly step: number;
}

export const demoTimingControlRanges = {
  frameIntervalMs: { max: 1_200, min: 250, step: 50 },
  motionDurationMs: { max: 3_200, min: 800, step: 100 },
} as const satisfies Record<"frameIntervalMs" | "motionDurationMs", DemoTimingControlRange>;

function normalizeTimingValue(
  value: number,
  range: DemoTimingControlRange,
  fallback: number,
): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(range.max, Math.max(range.min, value));
}

export function createDemoMotionTiming(
  frameIntervalMs: number,
  motionDurationMs: number,
): DemoMotionTiming {
  const normalizedFrameInterval = normalizeTimingValue(
    frameIntervalMs,
    demoTimingControlRanges.frameIntervalMs,
    1_000,
  );
  const normalizedMotionDuration = normalizeTimingValue(
    motionDurationMs,
    demoTimingControlRanges.motionDurationMs,
    3_000,
  );
  return {
    enterDurationMs: normalizedMotionDuration,
    exitDurationMs: normalizedMotionDuration,
    flipDurationMs: normalizedMotionDuration,
    frameIntervalMs: normalizedFrameInterval,
  };
}

export const demoMotionTiming = createDemoMotionTiming(1_000, 3_000);

type PresenceMotion = "enter" | "exit";

interface PresenceAnimation {
  readonly animation: Animation;
  readonly motion: PresenceMotion;
}

let flipAnimations = new WeakMap<HTMLElement, Animation>();
let presenceAnimations = new WeakMap<HTMLElement, PresenceAnimation>();
let rowStyleAnimations = new WeakMap<HTMLElement, Animation>();
let statusStyleAnimations = new WeakMap<HTMLElement, Animation>();

function consumeCancellation(animation: Animation): void {
  void animation.finished.catch(() => undefined);
}

function trackFlipAnimation(row: HTMLElement, animation: Animation): void {
  flipAnimations.set(row, animation);
  consumeCancellation(animation);
  void animation.finished.then(
    () => {
      if (flipAnimations.get(row) === animation) flipAnimations.delete(row);
    },
    () => undefined,
  );
}

function trackPresenceAnimation(
  row: HTMLElement,
  animation: Animation,
  motion: PresenceMotion,
): void {
  presenceAnimations.set(row, { animation, motion });
  row.dataset["presenceMotion"] = motion;
  consumeCancellation(animation);
  void animation.finished.then(
    () => {
      if (presenceAnimations.get(row)?.animation !== animation) return;
      row.dataset["presenceMotion"] = `${motion}-finished`;
    },
    () => undefined,
  );
}

function trackStyleAnimation(
  target: HTMLElement,
  animation: Animation,
  animations: WeakMap<HTMLElement, Animation>,
): void {
  animations.set(target, animation);
  consumeCancellation(animation);
  void animation.finished.then(
    () => {
      if (animations.get(target) === animation) animations.delete(target);
    },
    () => undefined,
  );
}

function startExitStyleAnimation(
  row: HTMLElement,
  previous: DemoRowSnapshot | undefined,
  timing: DemoMotionTiming,
): void {
  if (previous === undefined) return;

  const duration = Math.min(500, timing.exitDurationMs);
  const computedStyle = getComputedStyle(row);
  const rowAnimation = row.animate(
    [
      {
        backgroundColor: previous.backgroundColor,
        borderColor: previous.borderColor,
      },
      {
        backgroundColor: computedStyle.backgroundColor,
        borderColor: computedStyle.borderColor,
      },
    ],
    {
      duration,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    },
  );
  trackStyleAnimation(row, rowAnimation, rowStyleAnimations);

  const status = row.querySelector<HTMLElement>("em, small");
  if (status === null || previous.statusColor === undefined) return;
  const statusAnimation = status.animate(
    [{ color: previous.statusColor }, { color: getComputedStyle(status).color }],
    {
      duration,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    },
  );
  trackStyleAnimation(status, statusAnimation, statusStyleAnimations);
}

function startPresenceAnimation(
  row: HTMLElement,
  motion: PresenceMotion,
  timing: DemoMotionTiming,
  previous: DemoRowSnapshot | undefined,
): void {
  const existing = presenceAnimations.get(row);
  if (existing?.motion === motion && existing.animation.playState !== "idle") return;

  const computedStyle = getComputedStyle(row);
  existing?.animation.cancel();

  if (motion === "exit") {
    startExitStyleAnimation(row, previous, timing);
    const animation = row.animate(
      [
        { filter: computedStyle.filter, opacity: computedStyle.opacity },
        { filter: "blur(1.25px)", opacity: 0 },
      ],
      {
        duration: timing.exitDurationMs,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      },
    );
    trackPresenceAnimation(row, animation, motion);
    return;
  }

  const animation = row.animate(
    [
      { filter: "blur(1.5px)", opacity: 0 },
      { filter: "blur(0)", opacity: 1 },
    ],
    {
      duration: timing.enterDurationMs,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      fill: "both",
    },
  );
  trackPresenceAnimation(row, animation, motion);
}

function cancelStaleExitAnimation(row: HTMLElement): void {
  const existing = presenceAnimations.get(row);
  if (existing?.motion !== "exit") return;

  existing.animation.cancel();
  presenceAnimations.delete(row);
  delete row.dataset["presenceMotion"];
}

function startTransformAnimation(
  row: HTMLElement,
  keyframes: ReadonlyArray<Keyframe>,
  duration: number,
): void {
  const animation = row.animate([...keyframes], {
    duration,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
  });
  trackFlipAnimation(row, animation);
}

export function prepareRowAnimationUpdate(root: Element): ReadonlyMap<string, DemoRowSnapshot> {
  const positions = new Map<string, DemoRowSnapshot>();
  for (const row of root.querySelectorAll<HTMLElement>("[data-list] [data-key]")) {
    const key = row.dataset["key"];
    const list = row.closest<HTMLElement>("[data-list]")?.dataset["list"];
    if (key === undefined || list === undefined) continue;
    const rectangle = row.getBoundingClientRect();
    const computedStyle = getComputedStyle(row);
    const status = row.querySelector<HTMLElement>("em, small");
    positions.set(`${list}:${key}`, {
      backgroundColor: computedStyle.backgroundColor,
      borderColor: computedStyle.borderColor,
      left: rectangle.left,
      statusColor: status === null ? undefined : getComputedStyle(status).color,
      top: rectangle.top,
    });

    const animation = flipAnimations.get(row);
    animation?.cancel();
    flipAnimations.delete(row);
  }
  return positions;
}

export function animateDemoRows(
  root: Element,
  previous: ReadonlyMap<string, DemoRowSnapshot>,
  timing: DemoMotionTiming = demoMotionTiming,
): void {
  for (const row of root.querySelectorAll<HTMLElement>("[data-list] [data-key]")) {
    const kind = row.dataset["kind"];
    const key = row.dataset["key"];
    const list = row.closest<HTMLElement>("[data-list]")?.dataset["list"];
    const prior =
      key === undefined || list === undefined ? undefined : previous.get(`${list}:${key}`);
    if (kind === "exiting") startPresenceAnimation(row, "exit", timing, prior);
    else if (kind === "entering") startPresenceAnimation(row, "enter", timing, prior);
    else cancelStaleExitAnimation(row);

    if (key === undefined || list === undefined) continue;
    if (prior === undefined) {
      if (kind === "entering") {
        startTransformAnimation(
          row,
          [
            { transform: "translateY(-0.85rem) scale(0.97)" },
            { transform: "translateY(0) scale(1)" },
          ],
          timing.enterDurationMs,
        );
      }
      continue;
    }

    const rectangle = row.getBoundingClientRect();
    const deltaX = prior.left - rectangle.left;
    const deltaY = prior.top - rectangle.top;
    if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) continue;
    startTransformAnimation(
      row,
      [{ transform: `translate(${deltaX}px, ${deltaY}px)` }, { transform: "translate(0, 0)" }],
      timing.flipDurationMs,
    );
  }
}

export function cancelDemoRowAnimations(root: Element): void {
  for (const animation of root.getAnimations({ subtree: true })) animation.cancel();
  for (const row of root.querySelectorAll<HTMLElement>("[data-presence-motion]")) {
    delete row.dataset["presenceMotion"];
  }
  flipAnimations = new WeakMap<HTMLElement, Animation>();
  presenceAnimations = new WeakMap<HTMLElement, PresenceAnimation>();
  rowStyleAnimations = new WeakMap<HTMLElement, Animation>();
  statusStyleAnimations = new WeakMap<HTMLElement, Animation>();
}
