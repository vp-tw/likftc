import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [
    svelte({
      emitCss: false,
      include: ["src/**/*.svelte"],
    }),
  ],
  pack: {
    clean: true,
    deps: {
      neverBundle: [
        "@angular/core",
        "@qwik.dev/core",
        "preact",
        "preact/hooks",
        "react",
        "react/jsx-runtime",
        "solid-js",
        "svelte",
        "svelte/store",
        "vue",
      ],
    },
    dts: true,
    entry: [
      "src/index.ts",
      "src/angular.ts",
      "src/preact.ts",
      "src/qwik.ts",
      "src/react.ts",
      "src/solid.ts",
      "src/svelte.ts",
      "src/vue.ts",
      "src/web.ts",
    ],
    format: ["esm"],
    outDir: "dist",
    outExtensions: () => ({ js: ".js" }),
    platform: "neutral",
    sourcemap: true,
    target: "es2022",
    tsconfig: "tsconfig.build.json",
  },
});
