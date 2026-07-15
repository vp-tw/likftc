import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: [".astro/**", ".changeset/pre.json", "coverage/**", "dist/**"],
    sortPackageJson: true,
  },
  lint: {
    ignorePatterns: [".astro/**", "coverage/**", "dist/**"],
    options: {
      typeAware: false,
      typeCheck: false,
    },
  },
  test: {
    coverage: {
      enabled: false,
      exclude: ["**/*.test-d.ts", "**/*.test.ts", "**/dist/**"],
      include: ["packages/likftc/src/index.ts"],
      provider: "v8",
      reporter: ["text", "json-summary"],
      thresholds: {
        branches: 90,
        functions: 100,
        lines: 95,
        statements: 95,
      },
    },
    exclude: ["packages/likftc/src/**/*.browser.test.{ts,tsx}"],
    include: ["packages/likftc/src/**/*.test.ts"],
    testTimeout: 5_000,
  },
});
