import { svelte } from "@sveltejs/vite-plugin-svelte";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";
import { defineConfig } from "vite-plus";
import solid from "vite-plugin-solid";

const demoNames = [
  "alien-signals",
  "angular",
  "jotai",
  "nanostores",
  "pinia",
  "preact",
  "preact-signals",
  "react",
  "solid",
  "svelte",
  "tanstack-store",
  "vue",
  "web",
  "xstate",
  "zustand",
] as const;
const sourceRoot = resolve(import.meta.dirname, "src");

export default defineConfig({
  base: "/likftc/demos/",
  build: {
    chunkSizeWarningLimit: 1_100,
    emptyOutDir: true,
    outDir: resolve(import.meta.dirname, "../docs/public/demos"),
    rollupOptions: {
      input: Object.fromEntries(
        demoNames.map((name) => [name, resolve(sourceRoot, `${name}/index.html`)]),
      ),
      output: {
        entryFileNames: "[name].js",
      },
    },
    target: "es2022",
  },
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
  oxc: {
    include: [
      /\/src\/(?:jotai|nanostores|preact|preact-signals|react|tanstack-store|xstate|zustand)\/.*\.tsx$/,
      /\/src\/shared\/(?:preact|react)-state-panels\.tsx$/,
    ],
    jsx: {
      runtime: "automatic",
    },
  },
  plugins: [
    vue({ include: ["src/{pinia,vue}/**/*.vue"] }),
    solid({
      dev: false,
      hot: false,
      include: ["src/solid/**/*.tsx"],
    }),
    svelte({
      configFile: resolve(import.meta.dirname, "../../svelte.config.js"),
      emitCss: true,
      include: ["src/svelte/**/*.svelte"],
    }),
  ],
  root: sourceRoot,
});
