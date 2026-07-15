import { qwikVite } from "@qwik.dev/core/optimizer";
import { resolve } from "node:path";
import { defineConfig } from "vite-plus";

const sourceRoot = resolve(import.meta.dirname, "src");

export default defineConfig({
  base: "/likftc/demos/",
  build: {
    chunkSizeWarningLimit: 1_100,
    emptyOutDir: false,
    outDir: resolve(import.meta.dirname, "../docs/public/demos"),
    rollupOptions: {
      input: {
        qwik: resolve(sourceRoot, "qwik/index.html"),
      },
      output: {
        entryFileNames: "[name].js",
      },
    },
    target: "es2022",
  },
  plugins: [
    qwikVite({
      csr: true,
      srcDir: resolve(sourceRoot, "qwik"),
    }),
  ],
  root: sourceRoot,
});
