import { playwright } from "@vitest/browser-playwright";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";

const channel =
  process.env["PLAYWRIGHT_CHANNEL"] ?? (process.platform === "darwin" ? "chrome" : undefined);

export default defineConfig({
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
  plugins: [
    solid({
      dev: false,
      hot: false,
      include: ["packages/likftc/src/solid.browser.test.tsx"],
    }),
    svelte({
      emitCss: false,
      include: ["packages/likftc/src/**/*.svelte"],
    }),
  ],
  optimizeDeps: {
    include: [
      "@angular/compiler",
      "@angular/common",
      "@angular/core",
      "@angular/platform-browser",
      "lit",
      "lit/directives/repeat.js",
      "preact",
      "preact/hooks",
      "preact/jsx-dev-runtime",
      "react",
      "react-dom/client",
      "react/jsx-dev-runtime",
      "rxjs",
      "solid-js",
      "solid-js/web",
      "svelte",
      "svelte/store",
      "vue",
    ],
  },
  test: {
    attachmentsDir: ".artifacts/vitest",
    environment: "node",
    browser: {
      enabled: true,
      headless: true,
      instances: [{ browser: "chromium" }],
      provider: channel === undefined ? playwright() : playwright({ launchOptions: { channel } }),
      screenshotDirectory: ".artifacts/screenshots",
    },
    include: ["packages/likftc/src/**/*.browser.test.{ts,tsx}"],
    testTimeout: 10_000,
  },
});
