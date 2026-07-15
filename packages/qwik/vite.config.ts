import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    clean: true,
    deps: {
      neverBundle: ["@vp-tw/likftc", "@qwik.dev/core"],
    },
    dts: true,
    entry: ["src/index.ts"],
    format: ["esm"],
    outDir: "dist",
    outExtensions: () => ({ js: ".js" }),
    platform: "neutral",
    sourcemap: true,
    target: "es2022",
    tsconfig: "tsconfig.json",
  },
});
