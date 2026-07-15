import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox, webkit } from "playwright";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const docsDirectory = join(root, "apps", "docs");
const executableExtension = process.platform === "win32" ? ".cmd" : "";
const astro = join(docsDirectory, "node_modules", ".bin", `astro${executableExtension}`);
const supportedBrowsers = { chromium, firefox, webkit };
const supportedWidths = [320, 375, 768, 1024, 1440, 1920];
const supportedFrameworks = [
  { demo: "react", guide: "react", sources: ["react/main.tsx"] },
  { demo: "preact", guide: "preact", sources: ["preact/main.tsx"] },
  {
    demo: "vue",
    guide: "vue",
    sources: ["vue/main.ts", "vue/Runtime.vue", "vue/Row.vue"],
    activeSource: "vue/Runtime.vue",
  },
  {
    demo: "svelte",
    guide: "svelte",
    sources: ["svelte/main.ts", "svelte/Runtime.svelte", "svelte/Row.svelte"],
    activeSource: "svelte/Runtime.svelte",
  },
  { demo: "solid", guide: "solid", sources: ["solid/main.tsx"] },
  { demo: "angular", guide: "angular", sources: ["angular/main.ts"] },
  { demo: "web", guide: "web-components", sources: ["web/main.ts"] },
  { demo: "qwik", guide: "qwik", sources: ["qwik/main.tsx"] },
];
const stateDemos = [
  {
    demo: "zustand",
    guide: "zustand",
    sources: ["zustand/main.tsx"],
  },
  {
    demo: "pinia",
    guide: "pinia",
    sources: ["pinia/main.ts", "pinia/Runtime.vue", "state/stores/pinia.ts"],
    activeSource: "pinia/Runtime.vue",
  },
  {
    demo: "jotai",
    guide: "jotai",
    sources: ["jotai/main.tsx"],
  },
  {
    demo: "nanostores",
    guide: "nanostores",
    sources: ["nanostores/main.tsx", "shared/react-state-panels.tsx"],
    activeSource: "nanostores/main.tsx",
  },
  {
    demo: "tanstack-store",
    guide: "tanstack-store",
    sources: ["tanstack-store/main.tsx", "shared/react-state-panels.tsx"],
    activeSource: "tanstack-store/main.tsx",
  },
  {
    demo: "xstate",
    guide: "xstate",
    sources: ["xstate/main.tsx", "shared/react-state-panels.tsx"],
    activeSource: "xstate/main.tsx",
  },
  { demo: "angular", guide: "angular-signals", sources: ["angular/main.ts"] },
  {
    demo: "preact-signals",
    guide: "preact-signals",
    sources: ["preact-signals/main.tsx", "shared/preact-state-panels.tsx"],
    activeSource: "preact-signals/main.tsx",
  },
  {
    demo: "alien-signals",
    guide: "alien-signals",
    sources: ["alien-signals/main.ts", "state/stores/alien-signals.ts", "shared/state-demo.ts"],
    activeSource: "shared/state-demo.ts",
  },
];
const visualDimensionTolerance = 2;
const updateVisualSnapshots = process.env["LIKFTC_UPDATE_VISUAL_SNAPSHOTS"] === "1";
const expectedVisualSnapshots = updateVisualSnapshots
  ? undefined
  : JSON.parse(readFileSync(join(root, "test", "visual-snapshots.json"), "utf8"));
const observedVisualSnapshots = {};

function normalizeVisualDimensions(actual, expected, path = "") {
  if (Array.isArray(actual)) {
    return actual.map((value, index) =>
      normalizeVisualDimensions(value, expected?.[index], `${path}[${index}]`),
    );
  }

  if (actual !== null && typeof actual === "object") {
    return Object.fromEntries(
      Object.entries(actual).map(([key, value]) => {
        const nextPath = path === "" ? key : `${path}.${key}`;
        const expectedValue = expected?.[key];
        if (
          (key === "height" || key === "width") &&
          typeof value === "number" &&
          typeof expectedValue === "number"
        ) {
          assert.ok(
            Math.abs(value - expectedValue) <= visualDimensionTolerance,
            `${nextPath} changed from ${expectedValue}px to ${value}px`,
          );
          return [key, expectedValue];
        }
        return [key, normalizeVisualDimensions(value, expectedValue, nextPath)];
      }),
    );
  }

  return actual;
}

function assertVisualSnapshot(name, snapshot) {
  observedVisualSnapshots[name] = snapshot;
  if (!updateVisualSnapshots) {
    const expected = expectedVisualSnapshots[name];
    assert.deepEqual(
      normalizeVisualDimensions(snapshot, expected),
      expected,
      `${name} visual snapshot changed`,
    );
  }
}

function readOption(name) {
  const prefix = `${name}=`;
  return process.argv
    .slice(2)
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
}

const requestedBrowser =
  readOption("--browser") ?? process.env["LIKFTC_SITE_BROWSER"] ?? "chromium";
const requestedWidths = readOption("--widths");
const requestedWidth = readOption("--width") ?? process.env["LIKFTC_SITE_WIDTH"];
const requestedFramework = process.env["LIKFTC_SITE_FRAMEWORK"];
const widths =
  requestedWidths?.split(",").map((width) => Number.parseInt(width, 10)) ??
  (requestedWidth === undefined ? supportedWidths : [Number.parseInt(requestedWidth, 10)]);
const frameworks =
  requestedFramework === undefined
    ? supportedFrameworks
    : supportedFrameworks.filter(({ guide }) => guide === requestedFramework);
const stateWidths = widths;
assert.ok(
  Object.hasOwn(supportedBrowsers, requestedBrowser),
  `Unsupported browser: ${requestedBrowser}`,
);
assert.ok(
  requestedWidth === undefined || requestedWidths === undefined,
  "Use either --width or --widths, not both",
);
assert.ok(
  widths.every((width) => supportedWidths.includes(width)),
  `Unsupported LIKFTC_SITE_WIDTH: ${requestedWidth}`,
);
assert.ok(
  requestedFramework === undefined || frameworks.length === 1,
  `Unsupported LIKFTC_SITE_FRAMEWORK: ${requestedFramework}`,
);

async function getAvailablePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const { port } = address;
  server.close();
  await once(server, "close");
  return port;
}

async function waitForServer(url, previewOutput) {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The preview process has not bound its port yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Astro preview did not start.\n${previewOutput.join("")}`);
}

async function launchBrowser() {
  const browserType = supportedBrowsers[requestedBrowser];
  try {
    return await browserType.launch({ headless: true });
  } catch (error) {
    const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    if (
      requestedBrowser !== "chromium" ||
      process.platform !== "darwin" ||
      !existsSync(chromePath)
    ) {
      throw error;
    }
    return chromium.launch({ channel: "chrome", headless: true });
  }
}

const maxInspectionsPerBrowser = 16;
let browser;
let inspectionsSinceLaunch = 0;

async function acquireBrowser() {
  if (browser === undefined || inspectionsSinceLaunch >= maxInspectionsPerBrowser) {
    await browser?.close();
    browser = await launchBrowser();
    inspectionsSinceLaunch = 0;
  }
  inspectionsSinceLaunch += 1;
  return browser;
}

function isBrowserClosedError(error) {
  let current = error;
  while (current instanceof Error) {
    if (
      /target (?:page, context or browser|page|context|browser) has been closed|target closed/iu.test(
        current.message,
      )
    ) {
      return true;
    }
    current = current.cause;
  }
  return false;
}

async function resetBrowser() {
  await browser?.close().catch(() => {});
  browser = undefined;
  inspectionsSinceLaunch = 0;
}

async function inspectPage(baseUrl, path, width, inspect, contextOptions = {}) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await inspectPageAttempt(baseUrl, path, width, inspect, contextOptions);
      return;
    } catch (error) {
      if (attempt !== 0 || !isBrowserClosedError(error)) throw error;
      await resetBrowser();
    }
  }
}

async function inspectPageAttempt(baseUrl, path, width, inspect, contextOptions) {
  const { viewportHeight = 900, ...browserContextOptions } = contextOptions;
  const activeBrowser = await acquireBrowser();
  const context = await activeBrowser.newContext({
    ...browserContextOptions,
    viewport: { height: viewportHeight, width },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      errors.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`);
  });

  await page.addInitScript(() => {
    const metrics = { cls: 0, clsShifts: [], fcp: 0, lcp: 0, maxEventDuration: 0 };
    Object.defineProperty(globalThis, "__likftcWebVitals", { value: metrics });
    if (!("PerformanceObserver" in globalThis)) return;
    const supported = new Set(PerformanceObserver.supportedEntryTypes);
    if (supported.has("layout-shift")) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!("hadRecentInput" in entry) || !entry.hadRecentInput) {
            metrics.cls += "value" in entry && typeof entry.value === "number" ? entry.value : 0;
            metrics.clsShifts.push({
              sources:
                "sources" in entry
                  ? entry.sources.map(({ currentRect, node, previousRect }) => ({
                      currentRect,
                      node:
                        node instanceof Element
                          ? `${node.localName}${node.id === "" ? "" : `#${node.id}`}${
                              node.classList.length === 0 ? "" : `.${[...node.classList].join(".")}`
                            }`
                          : null,
                      previousRect,
                    }))
                  : [],
              startTime: entry.startTime,
              value: "value" in entry ? entry.value : 0,
            });
          }
        }
      }).observe({ buffered: true, type: "layout-shift" });
    }
    if (supported.has("largest-contentful-paint")) {
      new PerformanceObserver((list) => {
        const latest = list.getEntries().at(-1);
        if (latest !== undefined) metrics.lcp = latest.startTime;
      }).observe({ buffered: true, type: "largest-contentful-paint" });
    }
    if (supported.has("paint")) {
      new PerformanceObserver((list) => {
        const fcp = list.getEntries().find(({ name }) => name === "first-contentful-paint");
        if (fcp !== undefined) metrics.fcp = fcp.startTime;
      }).observe({ buffered: true, type: "paint" });
    }
    if (supported.has("event")) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          metrics.maxEventDuration = Math.max(metrics.maxEventDuration, entry.duration);
        }
      }).observe({ buffered: true, durationThreshold: 16, type: "event" });
    }
  });

  try {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
    await inspect(page);
    const metrics = await getWebVitals(page);
    const cls = metrics?.cls ?? 0;
    assert.ok(
      cls <= 0.1,
      `${path} cumulative layout shift ${cls} exceeds 0.1: ${JSON.stringify(metrics?.clsShifts)}`,
    );
    assert.deepEqual(errors, [], `${path} emitted browser errors at ${width}px`);
  } catch (error) {
    const diagnostics = errors.length === 0 ? "" : `\nBrowser diagnostics:\n${errors.join("\n")}`;
    throw new Error(
      `${path} in ${requestedBrowser} at ${width}px: ${String(error)}${diagnostics}`,
      { cause: error },
    );
  } finally {
    await context.close().catch(() => {});
  }
}

async function getWebVitals(page) {
  return page.evaluate(() => globalThis.__likftcWebVitals ?? null);
}

async function resetCumulativeLayoutShift(page) {
  await page.evaluate(() => {
    const metrics = globalThis.__likftcWebVitals;
    if (metrics !== undefined) {
      metrics.cls = 0;
      metrics.clsShifts.length = 0;
    }
  });
}

async function assertNoHorizontalOverflow(page, context) {
  assert.equal(
    await page.evaluate(() => document.body.scrollWidth > document.documentElement.clientWidth),
    false,
    `${context} has horizontal page overflow`,
  );
}

function assertPixelClose(actual, expected, context) {
  assert.ok(
    Math.abs(actual - expected) <= 0.1,
    `${context}: expected ${expected}px, received ${actual}px`,
  );
}

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

function assertStaticAssets() {
  const ogImage = readFileSync(join(docsDirectory, "public", "og-image.png"));
  assert.equal(ogImage.readUInt32BE(16), 1_200, "OG image width must be 1200px");
  assert.equal(ogImage.readUInt32BE(20), 630, "OG image height must be 630px");
  const legacyHeroDemoOutput = join(docsDirectory, "dist", "hero-demos");
  assert.equal(
    existsSync(legacyHeroDemoOutput) && listFiles(legacyHeroDemoOutput).length > 0,
    false,
    "Legacy hero demo routes must not be emitted",
  );

  const demoOutput = join(docsDirectory, "public", "demos");
  for (const file of listFiles(demoOutput).filter((path) => /\.(?:js|json)$/.test(path))) {
    const output = readFileSync(file, "utf8");
    assert.equal(output.includes("@shikijs"), false, `${file} includes client-side Shiki`);
    assert.equal(output.includes("vitesse-dark"), false, `${file} includes a Shiki theme`);
  }
}

async function assertAccessible(page, context) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  assert.deepEqual(
    violations.map(({ id, impact, nodes }) => ({
      id,
      impact,
      targets: nodes.map((node) => node.target),
    })),
    [],
    `${context} has accessibility violations`,
  );
}

async function settleHomeHero(page) {
  const playbackControl = page.getByRole("button", {
    name: "Pause automatic animation",
    exact: true,
  });
  if ((await playbackControl.getAttribute("aria-pressed")) === "false") {
    await playbackControl.click();
  }

  await page.locator("likftc-filter-vortex-stage").evaluate(async (host) => {
    const shadowRoot = host.shadowRoot;
    if (shadowRoot === null) throw new Error("Filter vortex shadow root is missing");

    const finiteAnimations = [];
    for (const animation of shadowRoot.getAnimations()) {
      const endTime = animation.effect?.getComputedTiming().endTime;
      if (typeof endTime === "number" && Number.isFinite(endTime)) {
        animation.finish();
        finiteAnimations.push(animation.finished);
      } else {
        animation.pause();
      }
    }
    await Promise.allSettled(finiteAnimations);
  });
}

async function waitForInlineDemo(page, demo) {
  const host = page.locator(`[data-likftc-demo="${demo}"]`);
  await host.locator(".runtime-demo[data-playback]").waitFor();
  return host;
}

async function assertExactDemoSources(page, demo, sources, activeSource = sources[0]) {
  const sourceHost = page.locator(`[data-likftc-source="${demo}"]`);
  await page
    .locator(
      `[data-likftc-source="${demo}"][data-source-state="ready"], ` +
        `[data-likftc-source="${demo}"][data-source-state="error"]`,
    )
    .waitFor({ timeout: 5_000 });
  assert.equal(
    await sourceHost.getAttribute("data-source-state"),
    "ready",
    `${demo} source loader did not finish successfully`,
  );
  assert.equal(await sourceHost.locator("[data-demo-source-file]").count(), sources.length);
  assert.equal(await sourceHost.locator('button[aria-label^="Copy "]').count(), sources.length);
  const expectedTabs = sources.length > 1 ? sources.length : 0;
  assert.equal(await sourceHost.getByRole("tab").count(), expectedTabs);
  if (expectedTabs > 0) {
    assert.equal(await sourceHost.getByRole("tab", { selected: true }).count(), 1);
    assert.equal(await sourceHost.getByRole("tabpanel").filter({ visible: true }).count(), 1);
    assert.equal(
      await sourceHost.getByRole("tab", { selected: true }).getAttribute("aria-label"),
      `Show src/${activeSource}`,
    );
  }

  for (const sourcePath of sources) {
    const displayedPath = `src/${sourcePath}`;
    const renderedCode = sourceHost.locator(`[data-demo-source-code="${displayedPath}"]`);
    const rendered = await renderedCode.textContent();
    const source = readFileSync(join(root, "apps", "demos", "src", sourcePath), "utf8");
    assert.equal(rendered, source, `${displayedPath} is not displayed verbatim`);
    assert.equal(
      await renderedCode.evaluate((code) => code.parentElement?.classList.contains("shiki")),
      true,
      `${displayedPath} is not rendered by Shiki`,
    );
    assert.ok(
      (await renderedCode.locator("span").count()) > 0,
      `${displayedPath} has no highlighted Shiki tokens`,
    );
  }
}

async function pressFrameButton(page, frame, name) {
  await frame.getByRole("button", { name, exact: false }).focus();
  await page.keyboard.press("Enter");
}

async function waitForCollision(frame) {
  await frame.locator('[data-list="before"] [data-kind="collision"]').waitFor();
}

async function waitForNoMatches(locator, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while ((await locator.count()) > 0) {
    if (Date.now() >= deadline) {
      throw new Error(`Timed out waiting for ${await locator.count()} elements to detach`);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

async function waitForAttribute(locator, name, expectedValue, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  let actualValue = await locator.getAttribute(name);
  while (actualValue !== expectedValue) {
    if (Date.now() >= deadline) {
      throw new Error(
        `Timed out waiting for ${name} to equal ${String(expectedValue)}; received ${String(actualValue)}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
    actualValue = await locator.getAttribute(name);
  }
}

async function assertDemoKeyStrategy(frame) {
  const keys = await frame.locator("[data-list] [data-key]").evaluateAll((rows) =>
    rows.map((row) => ({
      key: row.getAttribute("data-key"),
      list: row.closest("[data-list]")?.getAttribute("data-list"),
    })),
  );
  assert.ok(keys.length >= 6);
  for (const { key, list } of keys) {
    if (list === "before") assert.match(key ?? "", /^id:[a-d]$/);
    else if (list === "after") assert.match(key ?? "", /^k:[\w-]{8}$/);
    else assert.fail(`Unexpected demo list: ${list}`);
  }
}

async function getRunningAnimationDurations(locator) {
  return locator.evaluate((row) =>
    row
      .getAnimations()
      .filter((animation) => animation.playState === "running")
      .flatMap((animation) => {
        const duration = animation.effect?.getTiming().duration;
        return typeof duration === "number" ? [duration] : [];
      }),
  );
}

async function getRunningTransformStartYSign(locator) {
  return locator.evaluate((row) =>
    row
      .getAnimations()
      .filter((animation) => animation.playState === "running")
      .flatMap((animation) => {
        const effect = animation.effect;
        if (!(effect instanceof KeyframeEffect)) return [];
        const transform = effect.getKeyframes()[0]?.transform;
        if (typeof transform !== "string" || transform === "none") return [];
        const translatedY = transform.match(
          /^translate(?:Y)?\((?:[^,]+,\s*)?(-?\d+(?:\.\d+)?)(?:px|rem)/,
        )?.[1];
        return translatedY === undefined ? [] : [Math.sign(Number.parseFloat(translatedY))];
      })
      .find((direction) => direction !== 0),
  );
}

async function getListLayout(locator) {
  return locator.evaluate((list) => {
    const rows = Array.from(list.querySelectorAll(":scope > li"));
    return {
      flowRows: rows.filter((row) => getComputedStyle(row).position !== "absolute").length,
      height: list.getBoundingClientRect().height,
      overlayRows: rows.filter((row) => getComputedStyle(row).position === "absolute").length,
    };
  });
}

async function getDemoCaptionLayout(frame) {
  return frame.locator(".runtime-demo").evaluate((demo) => {
    const caption = demo.querySelector("[data-frame-caption]");
    const runtime = demo.querySelector("[data-runtime]");
    const status = demo.querySelector("[data-status]");
    const toolbar = demo.querySelector(".demo-toolbar");
    if (
      !(caption instanceof HTMLElement) ||
      !(runtime instanceof HTMLElement) ||
      !(status instanceof HTMLElement) ||
      !(toolbar instanceof HTMLElement)
    ) {
      throw new Error("Missing shared demo caption layout element");
    }
    const demoBounds = demo.getBoundingClientRect();
    return {
      captionHeight: caption.getBoundingClientRect().height,
      runtimeOffset: runtime.getBoundingClientRect().top - demoBounds.top,
      statusHeight: status.getBoundingClientRect().height,
      statusPosition: getComputedStyle(status).position,
      toolbarHeight: toolbar.getBoundingClientRect().height,
    };
  });
}

async function assertDemoCaptionLayoutStable(page, frame) {
  const initialLayout = await getDemoCaptionLayout(frame);
  assert.equal(initialLayout.captionHeight, 88);
  assert.equal(initialLayout.statusHeight, 1);
  assert.equal(initialLayout.statusPosition, "absolute");

  await pressFrameButton(page, frame, "Next frame");
  await frame.locator('.runtime-demo[data-frame-index="1"]').waitFor();
  assert.deepEqual(await getDemoCaptionLayout(frame), initialLayout);

  await pressFrameButton(page, frame, "Reset");
  await frame.locator('.runtime-demo[data-frame-index="0"]').waitFor();
  await waitForNoMatches(frame.locator('[data-list="after"] [data-kind="exiting"]'));
}

async function assertNumberFlowContract(root) {
  const targets = root.locator("[data-timing-summary], [data-timing-output]");
  assert.equal(await targets.count(), 5);
  for (const target of await targets.all()) {
    assert.equal(await target.getAttribute("data-number-flow"), "ready");
    assert.match((await target.getAttribute("data-number-flow-value")) ?? "", /^\d+$/);
    assert.equal(await target.locator(".number-flow").count(), 1);
    assert.equal(await target.locator(".number-flow-unit").textContent(), "ms");
    assert.match(
      (await target.locator(".number-flow-sr").textContent()) ?? "",
      /^\d+ milliseconds$/,
    );
  }
}

async function getNumberFlowAnimationCount(target) {
  return target.evaluate(
    (element) =>
      element
        .getAnimations({ subtree: true })
        .filter((animation) => animation.id === "likftc-number-flow").length,
  );
}

async function getActiveRowVisualStates(locator) {
  return locator.evaluate((list) =>
    Array.from(list.querySelectorAll(':scope > li:not([data-kind="exiting"])')).map((row) => ({
      opacity: Number.parseFloat(getComputedStyle(row).opacity),
      presenceMotion: row.getAttribute("data-presence-motion"),
    })),
  );
}

async function setRangeValue(locator, value) {
  await locator.evaluate((input, nextValue) => {
    if (!(input instanceof HTMLInputElement) || input.type !== "range") {
      throw new TypeError("Expected a range input");
    }
    input.value = String(nextValue);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}

async function observePlayback(rootLocator, transitionCount = 3) {
  return rootLocator.evaluate(
    (root, expectedTransitions) =>
      new Promise((resolve, reject) => {
        const frames = [];
        const sequences = [];
        const startedAt = performance.now();
        const frameIntervalMs = Number(root.getAttribute("data-frame-interval-ms"));
        const timeoutId = window.setTimeout(
          () => {
            observer.disconnect();
            reject(new Error(`Playback did not produce ${expectedTransitions} frame transitions`));
          },
          Math.max(5_000, frameIntervalMs * expectedTransitions + 2_000),
        );
        const observer = new MutationObserver(() => {
          const frameIndex = Number(root.getAttribute("data-frame-index"));
          if (frames.at(-1) === frameIndex) return;
          frames.push(frameIndex);
          sequences.push(
            Array.from(
              root.querySelectorAll(
                '[data-list="before"] > [data-kind]:not([data-kind="exiting"])',
              ),
            )
              .map((row) => row.getAttribute("data-id")?.toUpperCase() ?? "")
              .join(""),
          );
          if (frames.length < expectedTransitions) return;

          window.clearTimeout(timeoutId);
          observer.disconnect();
          resolve({
            animationCount: root
              .getAnimations({ subtree: true })
              .filter((animation) => animation.playState === "running").length,
            elapsedMs: performance.now() - startedAt,
            frames,
            sequences,
          });
        });
        const playButton = root.querySelector('[data-action="play"]');
        if (!(playButton instanceof HTMLButtonElement)) {
          window.clearTimeout(timeoutId);
          observer.disconnect();
          reject(new Error("Playback control is missing"));
          return;
        }
        observer.observe(root, { attributeFilter: ["data-frame-index"], attributes: true });
        playButton.click();
      }),
    transitionCount,
  );
}

assertStaticAssets();

const port = await getAvailablePort();
const baseUrl = `http://127.0.0.1:${port}/likftc`;
const previewOutput = [];
const preview = spawn(astro, ["preview", "--host", "127.0.0.1", "--port", String(port)], {
  cwd: docsDirectory,
  stdio: ["ignore", "pipe", "pipe"],
});
preview.stdout.on("data", (chunk) => previewOutput.push(chunk.toString()));
preview.stderr.on("data", (chunk) => previewOutput.push(chunk.toString()));

try {
  await waitForServer(`${baseUrl}/`, previewOutput);

  for (const width of widths) {
    await inspectPage(baseUrl, "/", width, async (page) => {
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal(
        await page.evaluate(() => document.body.scrollWidth > document.documentElement.clientWidth),
        false,
      );
      assert.equal(await page.locator("likftc-filter-vortex-stage").count(), 1);
      assert.equal(await page.locator("likftc-comparison-lab").count(), 0);
      assert.equal(await page.getByLabel("State interval", { exact: true }).count(), 0);
      assert.equal(await page.getByLabel("Motion duration", { exact: true }).count(), 0);
      assert.equal(
        await page
          .getByRole("navigation", { name: "Supported frameworks" })
          .getByRole("link")
          .count(),
        8,
      );
      assert.equal(
        await page
          .getByRole("navigation", { name: "Documentation starting points" })
          .getByRole("link")
          .count(),
        4,
      );
      const footer = page.locator(".brand-footer");
      assert.equal(await footer.getByRole("link", { name: "MIT License", exact: true }).count(), 1);
      assert.equal(await footer.getByRole("link", { name: "GitHub", exact: true }).count(), 1);
      assert.deepEqual(
        await page
          .locator(".filter-vortex-title-result, .filter-vortex-lede")
          .evaluateAll((elements) =>
            elements.map((element) => getComputedStyle(element).backgroundColor),
          ),
        ["rgba(242, 238, 228, 0.09)", "rgba(23, 23, 19, 0.7)"],
      );
      if (width === 320) {
        assert.equal(
          await page.locator('meta[property="og:image"]').getAttribute("content"),
          "https://vp-tw.github.io/likftc/og-image.png",
        );
        assert.equal(
          await page.locator('meta[name="twitter:image"]').getAttribute("content"),
          "https://vp-tw.github.io/likftc/og-image.png",
        );
        const imageResponse = await page.request.get(`${baseUrl}/og-image.png`);
        assert.equal(imageResponse.ok(), true);
        assert.equal(imageResponse.headers()["content-type"], "image/png");
      }
      if (width === 320 || width === 1440) {
        await settleHomeHero(page);
        assert.deepEqual(
          await page.evaluate(() => {
            const style = getComputedStyle(document.documentElement);
            return [
              "active",
              "disabled",
              "disabled-surface",
              "focus",
              "focus-inverse",
              "hover",
              "link",
            ].map((state) => style.getPropertyValue(`--interaction-${state}`).trim());
          }),
          ["#952f22", "#5d5a52", "#e5dece", "#163bca", "#d9ff43", "#10205e", "#163bca"],
        );
        await assertAccessible(page, `Home at ${width}px`);
        await page.evaluate(() => {
          document.documentElement.dataset["theme"] = "dark";
        });
        await page.locator(".home-directions").evaluate(async (section) => {
          await Promise.all(
            section.getAnimations({ subtree: true }).map((animation) => animation.finished),
          );
        });
        assert.deepEqual(
          await page.evaluate(() => {
            const style = getComputedStyle(document.documentElement);
            return [
              "active",
              "disabled",
              "disabled-surface",
              "focus",
              "focus-inverse",
              "hover",
              "link",
            ].map((state) => style.getPropertyValue(`--interaction-${state}`).trim());
          }),
          ["#ff9a84", "#918d83", "#24241e", "#d9ff43", "#163bca", "#dce3ff", "#8ca2ff"],
        );
        assert.equal(
          await page
            .locator(".social-icons a")
            .first()
            .evaluate((link) => getComputedStyle(link).color),
          "rgb(140, 162, 255)",
        );
        await assertAccessible(page, `Dark home at ${width}px`);
      }
      if (requestedBrowser === "chromium" && width === 1_440) {
        const metrics = await getWebVitals(page);
        assert.ok(metrics !== null);
        assert.ok(metrics.fcp > 0 && metrics.fcp <= 1_800, `Home FCP was ${metrics.fcp}ms`);
        assert.ok(metrics.lcp > 0 && metrics.lcp <= 2_500, `Home LCP was ${metrics.lcp}ms`);
        assert.ok(
          metrics.maxEventDuration <= 200,
          `Home event duration was ${metrics.maxEventDuration}ms`,
        );
      }
      if (requestedBrowser === "chromium" && width === 375) {
        await settleHomeHero(page);
        const vortexStage = page.locator("likftc-filter-vortex-stage [data-stage]");
        const vortexSpace = page.locator("likftc-filter-vortex-stage [data-space]");
        await vortexStage.dispatchEvent("pointermove", { clientX: 300, clientY: 200 });
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
        assert.notDeepEqual(
          await vortexSpace.evaluate((space) => [
            space.style.getPropertyValue("--rx"),
            space.style.getPropertyValue("--ry"),
          ]),
          ["", ""],
        );
        await vortexStage.dispatchEvent("pointerleave");
        assert.deepEqual(
          await vortexSpace.evaluate((space) => [
            space.style.getPropertyValue("--rx"),
            space.style.getPropertyValue("--ry"),
          ]),
          ["", ""],
        );
        assertVisualSnapshot(
          "home-375",
          await page.locator("likftc-filter-vortex-stage").evaluate((host) => {
            const root = host.shadowRoot;
            if (root === null) throw new Error("Filter vortex shadow root is missing");
            const snapshot = (selector) => {
              const element = root.querySelector(selector);
              if (!(element instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
              const style = getComputedStyle(element);
              return {
                background: style.backgroundColor,
                borderColor: style.borderColor,
                borderRadius: style.borderRadius,
                color: style.color,
                height: element.offsetHeight,
                opacity: style.opacity,
                width: element.offsetWidth,
              };
            };
            return {
              query: snapshot("[data-query]"),
              space: snapshot("[data-space]"),
              stage: snapshot("[data-stage]"),
              tokens: Array.from(root.querySelectorAll(".token")).map((token) => {
                if (!(token instanceof HTMLElement)) throw new Error("Missing token element");
                const style = getComputedStyle(token);
                return {
                  background: style.backgroundColor,
                  borderColor: style.borderColor,
                  height: token.offsetHeight,
                  width: token.offsetWidth,
                };
              }),
              trigger: snapshot("[data-trigger]"),
            };
          }),
        );
      }
    });
  }

  if (
    requestedBrowser === "chromium" &&
    requestedWidth === undefined &&
    requestedWidths === undefined
  ) {
    await inspectPage(
      baseUrl,
      "/",
      375,
      async (page) => {
        assert.ok((await page.evaluate(() => navigator.maxTouchPoints)) > 0);
        await page.getByRole("button", { name: "Pause automatic animation", exact: true }).tap();
        const query = page.locator("likftc-filter-vortex-stage").locator("[data-query]");
        const initialQuery = await query.textContent();
        await page.getByRole("button", { name: "Change search query", exact: true }).tap();
        await page.waitForFunction(
          (value) =>
            document
              .querySelector("likftc-filter-vortex-stage")
              ?.shadowRoot?.querySelector("[data-query]")?.textContent !== value,
          initialQuery,
        );
        await assertNoHorizontalOverflow(page, "Touch home");
      },
      { hasTouch: true, isMobile: true },
    );

    for (const path of ["/", "/getting-started/comparison/", "/frameworks/react/"]) {
      await inspectPage(baseUrl, path, 1_280, async (page) => {
        await page.addStyleTag({ content: ":root { font-size: 200% !important; }" });
        await page.waitForTimeout(100);
        await page.evaluate(() => {
          const metrics = globalThis.__likftcWebVitals;
          if (metrics !== undefined) {
            metrics.cls = 0;
            metrics.clsShifts.length = 0;
          }
        });
        await page.waitForTimeout(2_500);
        await assertNoHorizontalOverflow(page, `${path} at 200% text zoom`);
        assert.equal(await page.locator("h1").count(), 1);
      });
    }

    for (const path of ["/", "/getting-started/comparison/", "/frameworks/react/"]) {
      await inspectPage(
        baseUrl,
        path,
        667,
        async (page) => {
          await assertNoHorizontalOverflow(page, `${path} in landscape`);
          assert.equal(await page.locator("h1").count(), 1);
        },
        { viewportHeight: 375 },
      );
    }

    const fallbackContext = await browser.newContext({ viewport: { height: 900, width: 375 } });
    await fallbackContext.route(/\.(?:otf|ttf|woff2?)(?:\?.*)?$/u, (route) => route.abort());
    const fallbackPage = await fallbackContext.newPage();
    try {
      await fallbackPage.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
      const heading = fallbackPage.locator("h1");
      await heading.waitFor();
      assert.ok((await heading.boundingBox())?.height > 0, "Fallback heading must remain visible");
      await assertNoHorizontalOverflow(fallbackPage, "Home with webfonts blocked");
    } finally {
      await fallbackContext.close();
    }
  }

  for (const width of widths) {
    await inspectPage(baseUrl, "/getting-started/comparison/", width, async (page) => {
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal(
        await page.evaluate(() => document.body.scrollWidth > document.documentElement.clientWidth),
        false,
      );
      assert.equal(await page.getByLabel("State interval", { exact: true }).count(), 1);
      assert.equal(await page.getByLabel("Motion duration", { exact: true }).count(), 1);
      await assertDemoKeyStrategy(page.locator("[data-comparison-lab]"));
      assert.deepEqual(
        await page.locator("likftc-comparison-lab").evaluate((host) => {
          const shadowRoot = host.shadowRoot;
          const timingCell = shadowRoot?.querySelector(".lab-timing div + div");
          const secondPanel = shadowRoot?.querySelector(".demo-panel + .demo-panel");
          return {
            hasShadowRoot: shadowRoot !== null,
            hostMarginTop: getComputedStyle(host).marginTop,
            panelMarginTop:
              secondPanel === null || secondPanel === undefined
                ? null
                : getComputedStyle(secondPanel).marginTop,
            timingMarginTop:
              timingCell === null || timingCell === undefined
                ? null
                : getComputedStyle(timingCell).marginTop,
          };
        }),
        {
          hasShadowRoot: true,
          hostMarginTop: "0px",
          panelMarginTop: "0px",
          timingMarginTop: "0px",
        },
      );
      const comparisonPlayButton = page.getByRole("button", {
        name: "Pause loop",
        exact: true,
      });
      assert.equal(await comparisonPlayButton.getAttribute("aria-pressed"), "true");
      assert.equal(
        await page.locator("[data-comparison-lab]").getAttribute("data-playback"),
        "playing",
      );
      await comparisonPlayButton.click();
      await page.getByRole("button", { name: "Reset", exact: false }).click();
      await page.locator('[data-comparison-lab][data-frame-index="0"]').waitFor();
      await assertNumberFlowContract(page.locator("[data-comparison-lab]"));

      if (requestedBrowser === "chromium" && width === 375) {
        assertVisualSnapshot(
          "comparison-375",
          await page.locator("[data-comparison-lab]").evaluate((lab) => {
            const snapshot = (element) => {
              if (!(element instanceof HTMLElement)) throw new Error("Missing comparison element");
              const style = getComputedStyle(element);
              return {
                background: style.backgroundColor,
                borderColor: style.borderColor,
                color: style.color,
                height: element.offsetHeight,
                width: element.offsetWidth,
              };
            };
            return {
              caption: snapshot(lab.querySelector("[data-frame-caption]")),
              panels: Array.from(lab.querySelectorAll(".demo-panel")).map(snapshot),
              rows: Array.from(
                lab.querySelectorAll('[data-list="after"] > li:not([data-kind="exiting"])'),
              ).map(snapshot),
              toolbar: snapshot(lab.querySelector(".lab-toolbar")),
            };
          }),
        );
      }

      const readNarrationLayout = () =>
        page.locator("[data-comparison-lab]").evaluate((lab) => {
          const caption = lab.querySelector("[data-frame-caption]");
          const grid = lab.querySelector(".comparison-grid");
          const timingControls = lab.querySelector(".lab-timing-controls");
          const toolbar = lab.querySelector(".lab-toolbar");
          if (caption === null || grid === null || timingControls === null || toolbar === null) {
            throw new Error("Missing comparison narration layout element");
          }
          return {
            captionHeight: caption.getBoundingClientRect().height,
            gridTop: grid.getBoundingClientRect().top,
            timingTop: timingControls.getBoundingClientRect().top,
            toolbarHeight: toolbar.getBoundingClientRect().height,
          };
        });
      const initialNarrationLayout = await readNarrationLayout();
      assert.equal(initialNarrationLayout.captionHeight, 88);
      await page.getByRole("button", { name: "Next frame", exact: false }).click();
      await page.locator('[data-comparison-lab][data-frame-index="1"]').waitFor();
      assert.deepEqual(await readNarrationLayout(), initialNarrationLayout);
      assert.notEqual(
        await page.locator('[data-list="after"] [data-id="d"]').getAttribute("data-tone"),
        await page.locator('[data-list="after"] [data-id="a"]').getAttribute("data-tone"),
      );
      await page.getByRole("button", { name: "Reset", exact: false }).click();
      await page.locator('[data-comparison-lab][data-frame-index="0"]').waitFor();

      const controlSizes = await page
        .locator("[data-comparison-lab] button")
        .evaluateAll((controls) =>
          controls.map((control) => {
            const rectangle = control.getBoundingClientRect();
            return { height: rectangle.height, width: rectangle.width };
          }),
        );
      assert.ok(controlSizes.every(({ height, width }) => height >= 44 && width >= 44));

      if (width === 320) {
        await page.getByRole("button", { name: "Reduced", exact: true }).click();
        assert.equal(
          await page.getByRole("button", { name: "Play loop", exact: true }).isDisabled(),
          true,
        );
        await setRangeValue(page.getByLabel("State interval", { exact: true }), 950);
        assert.equal(
          await getNumberFlowAnimationCount(page.locator('[data-timing-output="frame"]')),
          0,
        );
        await setRangeValue(page.getByLabel("State interval", { exact: true }), 1_000);
        const initialBeforeInstance = await page
          .locator('[data-list="before"] [data-id="c"]')
          .getAttribute("data-instance");
        const initialAfterInstance = await page
          .locator('[data-list="after"] [data-id="c"]')
          .getAttribute("data-instance");
        const initialBeforeLayout = await getListLayout(page.locator('[data-list="before"]'));
        const initialAfterLayout = await getListLayout(page.locator('[data-list="after"]'));
        assert.ok(initialBeforeInstance);
        assert.ok(initialAfterInstance);
        assert.equal(initialBeforeLayout.flowRows, 3);
        assert.equal(initialAfterLayout.flowRows, 3);

        await page.getByRole("button", { name: "Next frame", exact: false }).click();
        await page.locator('[data-list="after"] [data-id="c"][data-kind="exiting"]').waitFor();
        assert.equal(
          await page.locator('[data-list="before"] [data-id="c"]').getAttribute("data-instance"),
          initialBeforeInstance,
        );
        assert.equal(
          await page
            .locator('[data-list="after"] [data-id="c"][data-kind="exiting"]')
            .getAttribute("data-instance"),
          initialAfterInstance,
        );
        const exitFrameBeforeLayout = await getListLayout(page.locator('[data-list="before"]'));
        const exitFrameAfterLayout = await getListLayout(page.locator('[data-list="after"]'));
        assert.deepEqual(exitFrameBeforeLayout, {
          flowRows: 3,
          height: initialBeforeLayout.height,
          overlayRows: 1,
        });
        assert.deepEqual(exitFrameAfterLayout, {
          flowRows: 3,
          height: initialAfterLayout.height,
          overlayRows: 1,
        });

        await page.getByRole("button", { name: "Next frame", exact: false }).click();
        await page.locator('[data-list="before"] [data-kind="collision"]').waitFor();
        assert.equal(
          await page
            .locator('[data-list="before"] [data-kind="collision"]')
            .getAttribute("data-instance"),
          initialBeforeInstance,
        );
        assert.equal(
          await page
            .locator('[data-list="after"] [data-id="c"][data-kind="exiting"]')
            .getAttribute("data-instance"),
          initialAfterInstance,
        );
        assert.notEqual(
          await page
            .locator('[data-list="after"] [data-kind="entering"]')
            .getAttribute("data-instance"),
          initialAfterInstance,
        );
        assert.deepEqual(
          await page.locator('[data-list="after"] [data-id="c"] b').allTextContents(),
          ["Cinder", "Cinder"],
        );
        const collisionBeforeLayout = await getListLayout(page.locator('[data-list="before"]'));
        const collisionAfterLayout = await getListLayout(page.locator('[data-list="after"]'));
        assert.equal(collisionBeforeLayout.flowRows, 3);
        assertPixelClose(
          collisionBeforeLayout.height,
          initialBeforeLayout.height,
          "Without Likftc list height changed",
        );
        assert.equal(collisionAfterLayout.flowRows, 3);
        assertPixelClose(
          collisionAfterLayout.height,
          initialAfterLayout.height,
          "With Likftc list height changed",
        );
        assert.equal(collisionAfterLayout.overlayRows, 2);
        assert.deepEqual(
          await page
            .locator('[data-list="before"] [data-id="c"][data-kind="collision"]')
            .evaluate((row) => ({
              opacity: getComputedStyle(row).opacity,
              presenceMotion: row.getAttribute("data-presence-motion"),
            })),
          { opacity: "1", presenceMotion: null },
        );
        assert.equal(
          await page
            .locator("[data-comparison-lab]")
            .evaluate((lab) => lab.getAnimations({ subtree: true }).length),
          0,
        );
      }

      if (width === 375) {
        const comparisonLab = page.locator("[data-comparison-lab]");
        assert.deepEqual(
          await comparisonLab.evaluate((lab) => ({
            exitDurationMs: Number(lab.getAttribute("data-exit-duration-ms")),
            frameIntervalMs: Number(lab.getAttribute("data-frame-interval-ms")),
            flipDurationMs: Number(lab.getAttribute("data-flip-duration-ms")),
          })),
          {
            exitDurationMs: 3_000,
            flipDurationMs: 3_000,
            frameIntervalMs: 1_000,
          },
        );
        assert.deepEqual(
          await comparisonLab.locator("[data-timing-control]").evaluateAll((controls) =>
            controls.map((control) => ({
              max: control.getAttribute("max"),
              min: control.getAttribute("min"),
              step: control.getAttribute("step"),
            })),
          ),
          [
            { max: "1200", min: "250", step: "50" },
            { max: "3200", min: "800", step: "100" },
          ],
        );
        await setRangeValue(page.getByLabel("State interval", { exact: true }), 1_200);
        await setRangeValue(page.getByLabel("Motion duration", { exact: true }), 800);
        assert.ok(
          (await getNumberFlowAnimationCount(page.locator('[data-timing-output="frame"]'))) > 0,
        );
        assert.equal(
          await page.locator("[data-timing-guidance]").getAttribute("data-state"),
          "warning",
        );
        await setRangeValue(page.getByLabel("State interval", { exact: true }), 400);
        await setRangeValue(page.getByLabel("Motion duration", { exact: true }), 1_600);
        const timing = await comparisonLab.evaluate((lab) => ({
          exitDurationMs: Number(lab.getAttribute("data-exit-duration-ms")),
          frameIntervalMs: Number(lab.getAttribute("data-frame-interval-ms")),
          flipDurationMs: Number(lab.getAttribute("data-flip-duration-ms")),
        }));
        assert.deepEqual(timing, {
          exitDurationMs: 1_600,
          flipDurationMs: 1_600,
          frameIntervalMs: 400,
        });
        assert.equal(
          await page.locator('[data-timing-output="frame"]').getAttribute("data-number-flow-value"),
          "400",
        );
        assert.equal(
          await page
            .locator('[data-timing-output="motion"]')
            .getAttribute("data-number-flow-value"),
          "1600",
        );
        await page.getByText("Motion spans 4.0 state updates.", { exact: false }).waitFor();
        await page.getByRole("button", { name: "Full", exact: true }).click();
        const initialBeforeLayout = await getListLayout(page.locator('[data-list="before"]'));
        const initialAfterLayout = await getListLayout(page.locator('[data-list="after"]'));
        await page.getByRole("button", { name: "Next frame", exact: false }).click();
        await page.getByRole("button", { name: "Next frame", exact: false }).click();
        await page.locator('[data-list="before"] [data-id="c"][data-kind="collision"]').waitFor();
        const collisionDurations = await getRunningAnimationDurations(
          page.locator('[data-list="before"] [data-id="c"][data-kind="collision"]'),
        );
        assert.ok(collisionDurations.includes(timing.flipDurationMs));
        assert.deepEqual(await getListLayout(page.locator('[data-list="before"]')), {
          flowRows: 3,
          height: initialBeforeLayout.height,
          overlayRows: 1,
        });
        const fullAfterLayout = await getListLayout(page.locator('[data-list="after"]'));
        assert.equal(fullAfterLayout.flowRows, 3);
        assertPixelClose(
          fullAfterLayout.height,
          initialAfterLayout.height,
          "Full-motion list height changed",
        );
        assert.equal(fullAfterLayout.overlayRows, 2);

        await page.getByRole("button", { name: "Reset", exact: false }).click();
        await waitForNoMatches(page.locator('[data-list="after"] [data-kind="exiting"]'));
        const playButton = page.getByRole("button", { name: "Play loop", exact: true });
        assert.equal(await playButton.isDisabled(), false);
        const playback = await observePlayback(page.locator("[data-comparison-lab]"), 12);
        assert.deepEqual(playback.frames, [1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0]);
        assert.deepEqual(playback.sequences, [
          "DAB",
          "CDA",
          "BCD",
          "ABC",
          "DAB",
          "CDA",
          "BCD",
          "ABC",
          "DAB",
          "CDA",
          "BCD",
          "ABC",
        ]);
        assert.ok(playback.elapsedMs >= timing.frameIntervalMs * 11);
        assert.ok(playback.elapsedMs < timing.frameIntervalMs * 14);
        assert.ok(playback.animationCount > 0);
        await page.getByRole("button", { name: "Pause loop", exact: true }).click();
        assert.ok(
          (await getActiveRowVisualStates(page.locator('[data-list="before"]'))).every(
            ({ opacity, presenceMotion }) =>
              opacity > 0 && presenceMotion !== "exit" && presenceMotion !== "exit-finished",
          ),
        );
        assert.equal(
          await page
            .getByRole("button", { name: "Play loop", exact: true })
            .getAttribute("aria-pressed"),
          "false",
        );
      }

      if (width === 320 || width === 1440) {
        await assertAccessible(page, `Comparison at ${width}px`);
      }
    });
  }

  if (
    requestedBrowser === "chromium" &&
    requestedWidth === undefined &&
    requestedWidths === undefined
  ) {
    await inspectPage(baseUrl, "/getting-started/comparison/", 1_440, async (page) => {
      const host = await page.locator("likftc-comparison-lab").elementHandle();
      assert.ok(host, "Comparison custom element is missing");
      const frameInterval = await host.evaluate((element) =>
        Number(
          element.shadowRoot
            ?.querySelector("[data-comparison-lab]")
            ?.getAttribute("data-frame-interval-ms"),
        ),
      );
      assert.ok(Number.isFinite(frameInterval));
      await resetCumulativeLayoutShift(page);

      await host.evaluate((element) => element.remove());
      await page.waitForTimeout(50);
      const detachedFrame = await host.evaluate((element) =>
        element.shadowRoot
          ?.querySelector("[data-comparison-lab]")
          ?.getAttribute("data-frame-index"),
      );
      await page.waitForTimeout(frameInterval + 250);
      assert.equal(
        await host.evaluate((element) =>
          element.shadowRoot
            ?.querySelector("[data-comparison-lab]")
            ?.getAttribute("data-frame-index"),
        ),
        detachedFrame,
        "Detached comparison lab continued autoplay",
      );

      await host.evaluate((element) => document.querySelector("main")?.append(element));
      const reconnectedFrame = await host.evaluate((element) =>
        element.shadowRoot
          ?.querySelector("[data-comparison-lab]")
          ?.getAttribute("data-frame-index"),
      );
      await page.waitForTimeout(frameInterval + 250);
      assert.notEqual(
        await host.evaluate((element) =>
          element.shadowRoot
            ?.querySelector("[data-comparison-lab]")
            ?.getAttribute("data-frame-index"),
        ),
        reconnectedFrame,
        "Reconnected comparison lab did not resume autoplay",
      );
      await resetCumulativeLayoutShift(page);
    });
  }

  for (const framework of frameworks) {
    for (const width of widths) {
      await inspectPage(baseUrl, `/frameworks/${framework.guide}/`, width, async (page) => {
        assert.equal(await page.locator("h1").count(), 1);
        assert.equal(await page.locator("iframe").count(), 0);
        assert.equal(await page.locator(`[data-likftc-demo="${framework.demo}"]`).count(), 1);
        assert.equal(
          await page.locator(`script[src="/likftc/demos/${framework.demo}.js"]`).count(),
          1,
        );
        assert.equal(
          await page.evaluate(
            () => document.body.scrollWidth > document.documentElement.clientWidth,
          ),
          false,
        );

        await page.locator(`[data-likftc-demo="${framework.demo}"]`).scrollIntoViewIfNeeded();
        const demoFrame = await waitForInlineDemo(page, framework.demo);
        await assertExactDemoSources(
          page,
          framework.demo,
          framework.sources,
          framework.activeSource,
        );
        assert.equal(await page.locator("pre code").count(), framework.sources.length);
        assert.equal((await getListLayout(demoFrame.locator('[data-list="after"]'))).flowRows, 3);
        await assertDemoKeyStrategy(demoFrame);
        await assertNumberFlowContract(demoFrame);
        assert.equal(await demoFrame.getByLabel("State interval", { exact: true }).count(), 1);
        assert.equal(await demoFrame.getByLabel("Motion duration", { exact: true }).count(), 1);
        const defaultPlayButton = demoFrame.getByRole("button", {
          name: "Pause loop",
          exact: true,
        });
        assert.equal(await defaultPlayButton.getAttribute("aria-pressed"), "true");
        assert.equal(
          await demoFrame.locator(".runtime-demo").getAttribute("data-playback"),
          "playing",
        );
        await defaultPlayButton.click();
        await pressFrameButton(page, demoFrame, "Reset");
        assert.deepEqual(
          await demoFrame.evaluate((host) => ({
            horizontal: host.scrollWidth > host.clientWidth,
            vertical: host.scrollHeight > host.clientHeight,
          })),
          { horizontal: false, vertical: false },
        );

        if (requestedBrowser === "chromium" && framework.demo === "react" && width === 375) {
          assertVisualSnapshot(
            "react-demo-375",
            await demoFrame.evaluate((host) => {
              const root = host.shadowRoot ?? host;
              const snapshot = (element) => {
                if (!(element instanceof HTMLElement)) throw new Error("Missing demo element");
                const style = getComputedStyle(element);
                return {
                  background: style.backgroundColor,
                  borderColor: style.borderColor,
                  color: style.color,
                  height: element.offsetHeight,
                  width: element.offsetWidth,
                };
              };
              return {
                panels: Array.from(root.querySelectorAll(".runtime-panel")).map(snapshot),
                rows: Array.from(
                  root.querySelectorAll('[data-list="after"] > li:not([data-kind="exiting"])'),
                ).map(snapshot),
                runtime: snapshot(root.querySelector("[data-runtime]")),
                toolbar: snapshot(root.querySelector(".demo-toolbar")),
              };
            }),
          );
        }

        if (width === 320) {
          await assertDemoCaptionLayoutStable(page, demoFrame);
          const controlSizes = await demoFrame
            .locator(".demo-toolbar button")
            .evaluateAll((controls) =>
              controls.map((control) => {
                const rectangle = control.getBoundingClientRect();
                return { height: rectangle.height, width: rectangle.width };
              }),
            );
          assert.ok(
            controlSizes.every(
              ({ height, width: controlWidth }) => height >= 48 && controlWidth >= 48,
            ),
          );
          const resourceBytes = await demoFrame.evaluate(() =>
            performance
              .getEntriesByType("resource")
              .filter((entry) => new URL(entry.name).pathname.includes("/likftc/demos/"))
              .reduce(
                (total, entry) => total + ("transferSize" in entry ? entry.transferSize : 0),
                0,
              ),
          );
          const resourceBudget = framework.demo === "angular" ? 1_300_000 : 350_000;
          assert.ok(
            resourceBytes <= resourceBudget,
            `${framework.guide} demo transferred ${resourceBytes} bytes; budget is ${resourceBudget}`,
          );
          const initialBeforeInstance = await demoFrame
            .locator('[data-list="before"] [data-id="c"]')
            .getAttribute("data-instance");
          const initialAfterInstance = await demoFrame
            .locator('[data-list="after"] [data-id="c"]')
            .getAttribute("data-instance");
          const initialBeforeLayout = await getListLayout(
            demoFrame.locator('[data-list="before"]'),
          );
          const initialAfterLayout = await getListLayout(demoFrame.locator('[data-list="after"]'));
          assert.ok(initialBeforeInstance);
          assert.ok(initialAfterInstance);

          await pressFrameButton(page, demoFrame, "Next frame");
          await demoFrame
            .locator('[data-list="after"] [data-id="c"][data-kind="exiting"]')
            .waitFor();
          assert.equal(
            await demoFrame
              .locator('[data-list="before"] [data-id="c"]')
              .getAttribute("data-instance"),
            initialBeforeInstance,
          );
          assert.equal(
            await demoFrame
              .locator('[data-list="after"] [data-id="c"][data-kind="exiting"]')
              .getAttribute("data-instance"),
            initialAfterInstance,
          );

          await pressFrameButton(page, demoFrame, "Next frame");
          await waitForCollision(demoFrame);
          const collision = demoFrame.locator(
            '[data-list="before"] [data-id="c"][data-kind="collision"]',
          );
          const exiting = demoFrame.locator(
            '[data-list="after"] [data-id="c"][data-kind="exiting"]',
          );
          const entering = demoFrame.locator(
            '[data-list="after"] [data-id="c"][data-kind="entering"]',
          );
          assert.equal(await collision.getAttribute("data-instance"), initialBeforeInstance);
          assert.equal(await exiting.getAttribute("data-instance"), initialAfterInstance);
          assert.notEqual(await entering.getAttribute("data-instance"), initialAfterInstance);
          assert.deepEqual(
            await demoFrame.locator('[data-list="after"] [data-id="c"] span').allTextContents(),
            ["Cinder", "Cinder"],
          );
          assert.deepEqual(await getListLayout(demoFrame.locator('[data-list="before"]')), {
            flowRows: 3,
            height: initialBeforeLayout.height,
            overlayRows: 1,
          });
          const collisionAfterLayout = await getListLayout(
            demoFrame.locator('[data-list="after"]'),
          );
          assert.equal(collisionAfterLayout.flowRows, 3);
          assertPixelClose(
            collisionAfterLayout.height,
            initialAfterLayout.height,
            "Narrow comparison list height changed",
          );
          assert.equal(collisionAfterLayout.overlayRows, 2);
          await waitForAttribute(collision, "data-presence-motion", null);
          assert.deepEqual(
            await collision.evaluate((row) => ({
              opacity: getComputedStyle(row).opacity,
              presenceMotion: row.getAttribute("data-presence-motion"),
            })),
            { opacity: "1", presenceMotion: null },
          );
          assert.ok(
            (await demoFrame
              .locator("[data-runtime]")
              .evaluate((runtime) => runtime.getAnimations({ subtree: true }).length)) > 0,
          );
          const collisionDurations = await getRunningAnimationDurations(collision);
          assert.ok(collisionDurations.includes(3_000));
          const exitingDurations = await getRunningAnimationDurations(exiting);
          assert.ok(exitingDurations.includes(3_000));
          const enteringDurations = await getRunningAnimationDurations(entering);
          assert.ok(enteringDurations.filter((duration) => duration === 3_000).length >= 2);
          assert.equal(await getRunningTransformStartYSign(collision), 1);
          assert.equal(await getRunningTransformStartYSign(entering), -1);
          await pressFrameButton(page, demoFrame, "Reduced");
          assert.equal(
            await demoFrame.getByRole("button", { name: "Play loop", exact: true }).isDisabled(),
            true,
          );
          assert.equal(
            await demoFrame
              .locator("[data-runtime]")
              .evaluate((runtime) => runtime.getAnimations({ subtree: true }).length),
            0,
          );
        }

        if (width === 375) {
          await page.emulateMedia({ reducedMotion: "reduce" });
          await demoFrame.locator('[data-action="play"]:disabled').waitFor();
          assert.equal(
            await demoFrame
              .getByRole("button", { name: "System", exact: true })
              .getAttribute("aria-pressed"),
            "true",
          );
          assert.equal(
            await demoFrame.getByRole("button", { name: "Play loop", exact: true }).isDisabled(),
            true,
          );
          await pressFrameButton(page, demoFrame, "Next frame");
          await pressFrameButton(page, demoFrame, "Next frame");
          await waitForCollision(demoFrame);
          assert.equal(
            await demoFrame
              .locator("[data-runtime]")
              .evaluate((runtime) => runtime.getAnimations({ subtree: true }).length),
            0,
          );
          await pressFrameButton(page, demoFrame, "Reset");
          await waitForNoMatches(demoFrame.locator('[data-list="after"] [data-kind="exiting"]'));
          try {
            await demoFrame
              .locator('[data-list="after"] [data-kind="current"]')
              .first()
              .waitFor({ timeout: 5_000 });
          } catch (error) {
            const runtime = demoFrame.locator("[data-runtime]");
            const runtimeHtml =
              (await runtime.count()) === 0 ? "mount point missing" : await runtime.innerHTML();
            throw new Error(
              `Reset did not remount ${framework.guide}. Browser errors: ${errors.join(" | ") || "none"}. Runtime HTML: ${runtimeHtml || "empty"}`,
              { cause: error },
            );
          }
          assert.equal(
            await demoFrame.locator('[data-list="after"] [data-kind="current"]').count(),
            3,
          );
          const resetBeforeLayout = await getListLayout(demoFrame.locator('[data-list="before"]'));
          const resetAfterLayout = await getListLayout(demoFrame.locator('[data-list="after"]'));
          await setRangeValue(demoFrame.getByLabel("State interval", { exact: true }), 400);
          await setRangeValue(demoFrame.getByLabel("Motion duration", { exact: true }), 1_600);
          const adjustableTiming = await demoFrame.locator(".runtime-demo").evaluate((demo) => ({
            frameIntervalMs: Number(demo.getAttribute("data-frame-interval-ms")),
            motionDurationMs: Number(demo.getAttribute("data-flip-duration-ms")),
          }));
          assert.deepEqual(adjustableTiming, {
            frameIntervalMs: 400,
            motionDurationMs: 1_600,
          });
          await pressFrameButton(page, demoFrame, "Full");
          await pressFrameButton(page, demoFrame, "Next frame");
          await pressFrameButton(page, demoFrame, "Next frame");
          await waitForCollision(demoFrame);
          const collisionDurations = await getRunningAnimationDurations(
            demoFrame.locator('[data-list="before"] [data-id="c"][data-kind="collision"]'),
          );
          assert.ok(collisionDurations.includes(adjustableTiming.motionDurationMs));
          const playingBeforeLayout = await getListLayout(
            demoFrame.locator('[data-list="before"]'),
          );
          const playingAfterLayout = await getListLayout(demoFrame.locator('[data-list="after"]'));
          assert.equal(playingBeforeLayout.flowRows, 3);
          assertPixelClose(
            playingBeforeLayout.height,
            resetBeforeLayout.height,
            "Without Likftc playback list height changed",
          );
          assert.equal(playingAfterLayout.flowRows, 3);
          assertPixelClose(
            playingAfterLayout.height,
            resetAfterLayout.height,
            "With Likftc playback list height changed",
          );
          assert.equal(playingAfterLayout.overlayRows, 2);

          await pressFrameButton(page, demoFrame, "Reset");
          await waitForNoMatches(demoFrame.locator('[data-list="after"] [data-kind="exiting"]'));
          const playButton = demoFrame.getByRole("button", {
            name: "Play loop",
            exact: true,
          });
          assert.equal(await playButton.isDisabled(), false);
          const transitionCount = framework.demo === "svelte" ? 12 : 3;
          const playback = await observePlayback(
            demoFrame.locator(".runtime-demo"),
            transitionCount,
          );
          assert.deepEqual(
            playback.frames,
            transitionCount === 12 ? [1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0] : [1, 2, 3],
          );
          assert.deepEqual(
            playback.sequences,
            transitionCount === 12
              ? ["DAB", "CDA", "BCD", "ABC", "DAB", "CDA", "BCD", "ABC", "DAB", "CDA", "BCD", "ABC"]
              : ["DAB", "CDA", "BCD"],
          );
          assert.ok(playback.elapsedMs >= (transitionCount - 1) * adjustableTiming.frameIntervalMs);
          assert.ok(playback.elapsedMs < (transitionCount + 2) * adjustableTiming.frameIntervalMs);
          assert.ok(playback.animationCount > 0);
          await demoFrame.getByRole("button", { name: "Pause loop", exact: true }).click();
          if (framework.demo === "svelte") {
            assert.ok(
              (await getActiveRowVisualStates(demoFrame.locator('[data-list="before"]'))).every(
                ({ opacity, presenceMotion }) =>
                  opacity > 0 && presenceMotion !== "exit" && presenceMotion !== "exit-finished",
              ),
            );
          }
        }

        if (width === 320 || width === 1440) {
          await demoFrame.evaluate((host) => {
            for (const animation of host.shadowRoot?.getAnimations() ?? []) animation.finish();
          });
          await assertAccessible(page, `${framework.guide} guide at ${width}px`);
        }
      });
    }

    await inspectPage(baseUrl, `/demos/${framework.demo}/index.html`, 375, async (page) => {
      const standaloneDemo = await waitForInlineDemo(page, framework.demo);
      assert.equal(await page.locator("iframe").count(), 0);
      assert.equal(
        await standaloneDemo.locator(".runtime-demo").getAttribute("data-playback"),
        "playing",
      );
      assert.deepEqual(
        await standaloneDemo.evaluate((host) => ({
          horizontal: host.scrollWidth > host.clientWidth,
          vertical: host.scrollHeight > host.clientHeight,
        })),
        { horizontal: false, vertical: false },
      );
      assert.equal(
        await page.evaluate(() => document.body.scrollWidth > document.documentElement.clientWidth),
        false,
      );
    });
  }

  for (const stateDemo of stateDemos) {
    for (const width of stateWidths) {
      await inspectPage(baseUrl, `/state-management/${stateDemo.guide}/`, width, async (page) => {
        assert.equal(await page.locator("h1").count(), 1);
        assert.equal(await page.locator("iframe").count(), 0);
        assert.equal(
          await page.locator(`script[src="/likftc/demos/${stateDemo.demo}.js"]`).count(),
          1,
        );
        assert.equal(
          await page.evaluate(
            () => document.body.scrollWidth > document.documentElement.clientWidth,
          ),
          false,
        );

        const demo = await waitForInlineDemo(page, stateDemo.demo);
        await assertExactDemoSources(
          page,
          stateDemo.demo,
          stateDemo.sources,
          stateDemo.activeSource,
        );
        assert.equal(await page.locator("pre code").count(), stateDemo.sources.length);
        assert.equal((await getListLayout(demo.locator('[data-list="before"]'))).flowRows, 3);
        assert.equal((await getListLayout(demo.locator('[data-list="after"]'))).flowRows, 3);
        await assertDemoKeyStrategy(demo);
        await assertNumberFlowContract(demo);
        assert.equal(
          await demo
            .getByRole("button", { name: "Pause loop", exact: true })
            .getAttribute("aria-pressed"),
          "true",
        );
        await demo.getByRole("button", { name: "Pause loop", exact: true }).click();
        await pressFrameButton(page, demo, "Reset");
        assert.deepEqual(
          await demo.evaluate((host) => ({
            horizontal: host.scrollWidth > host.clientWidth,
            vertical: host.scrollHeight > host.clientHeight,
          })),
          { horizontal: false, vertical: false },
        );

        if (width === 320) {
          await assertDemoCaptionLayoutStable(page, demo);
          const sizes = await demo.locator(".demo-toolbar button").evaluateAll((controls) =>
            controls.map((control) => {
              const rectangle = control.getBoundingClientRect();
              return { height: rectangle.height, width: rectangle.width };
            }),
          );
          assert.ok(
            sizes.every(({ height, width: buttonWidth }) => height >= 48 && buttonWidth >= 48),
          );
        }

        if (width === 375) {
          const initialBefore = await getListLayout(demo.locator('[data-list="before"]'));
          const initialAfter = await getListLayout(demo.locator('[data-list="after"]'));
          await pressFrameButton(page, demo, "Reduced");
          await pressFrameButton(page, demo, "Next frame");
          await pressFrameButton(page, demo, "Next frame");
          await waitForCollision(demo);
          assert.equal(
            await demo
              .locator('[data-list="after"] [data-id="c"]')
              .evaluateAll((rows) => new Set(rows.map((row) => row.getAttribute("data-key"))).size),
            2,
          );
          assert.deepEqual(await getListLayout(demo.locator('[data-list="before"]')), {
            flowRows: 3,
            height: initialBefore.height,
            overlayRows: 1,
          });
          const reducedAfter = await getListLayout(demo.locator('[data-list="after"]'));
          assert.equal(reducedAfter.flowRows, 3);
          assertPixelClose(
            reducedAfter.height,
            initialAfter.height,
            "Reduced-motion list height changed",
          );
          assert.equal(reducedAfter.overlayRows, 2);
          assert.equal(
            await demo
              .locator("[data-runtime]")
              .evaluate((runtime) => runtime.getAnimations({ subtree: true }).length),
            0,
          );

          await pressFrameButton(page, demo, "Reset");
          await pressFrameButton(page, demo, "Full");
          await setRangeValue(demo.getByLabel("Motion duration", { exact: true }), 1_600);
          await pressFrameButton(page, demo, "Next frame");
          await pressFrameButton(page, demo, "Next frame");
          await waitForCollision(demo);
          assert.ok(
            (
              await getRunningAnimationDurations(
                demo.locator('[data-list="before"] [data-kind="collision"]'),
              )
            ).includes(1_600),
          );
        }

        if (width === 320 || width === 1_440) {
          await demo.evaluate((host) => {
            for (const animation of host.getAnimations({ subtree: true })) animation.finish();
          });
          await assertAccessible(page, `${stateDemo.guide} state guide at ${width}px`);
        }
      });
    }

    await inspectPage(baseUrl, `/demos/${stateDemo.demo}/index.html`, 375, async (page) => {
      const standaloneDemo = await waitForInlineDemo(page, stateDemo.demo);
      assert.equal(await page.locator("iframe").count(), 0);
      assert.equal(
        await standaloneDemo.locator(".runtime-demo").getAttribute("data-playback"),
        "playing",
      );
      assert.deepEqual(
        await standaloneDemo.evaluate((host) => ({
          horizontal: host.scrollWidth > host.clientWidth,
          vertical: host.scrollHeight > host.clientHeight,
        })),
        { horizontal: false, vertical: false },
      );
    });
  }

  if (requestedFramework === undefined || requestedFramework === "solid") {
    await inspectPage(baseUrl, "/frameworks/solid/", 1_440, async (page) => {
      await waitForInlineDemo(page, "solid");
      await page.getByRole("link", { name: "React", exact: true }).click();
      await page.waitForURL("**/frameworks/react/");
      const navigatedDemo = await waitForInlineDemo(page, "react");
      assert.equal(await page.locator("iframe").count(), 0);
      assert.equal(
        await navigatedDemo.locator(".runtime-demo").getAttribute("data-playback"),
        "playing",
      );
    });
  }

  console.log(
    `Validated ${requestedBrowser} at ${widths.length} responsive widths across home, ${frameworks.length} framework demos, ${stateDemos.length} state demos, and standalone pages.`,
  );
  if (updateVisualSnapshots) {
    console.log(`LIKFTC_VISUAL_SNAPSHOTS=${JSON.stringify(observedVisualSnapshots, null, 2)}`);
  }
} finally {
  await browser?.close();
  preview.kill("SIGTERM");
  await Promise.race([
    once(preview, "close"),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  if (preview.exitCode === null) preview.kill("SIGKILL");
}
