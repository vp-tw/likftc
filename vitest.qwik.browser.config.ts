import { playwright } from "@vitest/browser-playwright";
import { qwikVite } from "@qwik.dev/core/optimizer";
import { defineConfig } from "vitest/config";

const channel =
  process.env["PLAYWRIGHT_CHANNEL"] ?? (process.platform === "darwin" ? "chrome" : undefined);

export default defineConfig({
  plugins: [
    qwikVite({
      csr: true,
      srcDir: "packages/likftc/src",
    }),
  ],
  optimizeDeps: {
    include: ["@qwik.dev/core"],
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
    include: ["packages/likftc/src/qwik.browser.test.tsx"],
    testTimeout: 10_000,
  },
});
