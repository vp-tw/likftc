import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import svelte from "shiki/langs/svelte.mjs";
import tsx from "shiki/langs/tsx.mjs";
import typescript from "shiki/langs/typescript.mjs";
import vue from "shiki/langs/vue.mjs";
import vitesseDark from "shiki/themes/vitesse-dark.mjs";
import vitesseLight from "shiki/themes/vitesse-light.mjs";

export const demoSourcePaths = {
  "alien-signals": [
    "alien-signals/main.ts",
    "state/stores/alien-signals.ts",
    "shared/state-demo.ts",
  ],
  angular: ["angular/main.ts"],
  jotai: ["jotai/main.tsx"],
  nanostores: ["nanostores/main.tsx", "shared/react-state-panels.tsx"],
  pinia: ["pinia/main.ts", "pinia/Runtime.vue", "state/stores/pinia.ts"],
  preact: ["preact/main.tsx"],
  "preact-signals": ["preact-signals/main.tsx", "shared/preact-state-panels.tsx"],
  qwik: ["qwik/main.tsx"],
  react: ["react/main.tsx"],
  solid: ["solid/main.tsx"],
  svelte: ["svelte/main.ts", "svelte/Runtime.svelte", "svelte/Row.svelte"],
  "tanstack-store": ["tanstack-store/main.tsx", "shared/react-state-panels.tsx"],
  vue: ["vue/main.ts", "vue/Runtime.vue", "vue/Row.vue"],
  web: ["web/main.ts"],
  xstate: ["xstate/main.tsx", "shared/react-state-panels.tsx"],
  zustand: ["zustand/main.tsx"],
} as const;

export type DemoSourceName = keyof typeof demoSourcePaths;

interface RenderedDemoSource {
  displayPath: string;
  highlightedHtml: string;
  language: string;
  lineCount: number;
  path: string;
}

type DemoSourceLanguage = "svelte" | "tsx" | "typescript" | "vue";

const defaultDemoSourcePaths: Partial<Record<DemoSourceName, string>> = {
  "alien-signals": "shared/state-demo.ts",
  jotai: "jotai/main.tsx",
  nanostores: "nanostores/main.tsx",
  pinia: "pinia/Runtime.vue",
  "preact-signals": "preact-signals/main.tsx",
  svelte: "svelte/Runtime.svelte",
  "tanstack-store": "tanstack-store/main.tsx",
  vue: "vue/Runtime.vue",
  xstate: "xstate/main.tsx",
  zustand: "zustand/main.tsx",
};

const sourceHighlighter = createHighlighterCore({
  engine: createJavaScriptRegexEngine(),
  langs: [svelte, tsx, typescript, vue],
  themes: [vitesseLight, vitesseDark],
});

const sourceColorReplacements = {
  "vitesse-dark": {
    "#24292e": "#87898c",
    "#2f363d": "#868a8e",
    "#4d9375": "#529679",
    "#666666": "#898989",
    "#6872ab": "#7f87b8",
    "#c4704f": "#c67454",
  },
  "vitesse-light": {
    "#1e754f": "#1d714d",
    "#22863a": "#1d7231",
    "#2e808f": "#276d7a",
    "#2e8f82": "#236e64",
    "#2f798a": "#2a6c7b",
    "#59873a": "#486d2f",
    "#5a6aa6": "#526097",
    "#998418": "#736312",
    "#999999": "#636363",
    "#a0ada0": "#5e665e",
    "#a65e2b": "#945426",
    "#ab5959": "#964e4e",
    "#ab5e3f": "#955237",
    "#b05a78": "#964d66",
    "#b07d48": "#805b35",
    "#b56959": "#8f5346",
    "#bda437": "#716221",
    "#e36209": "#a64807",
  },
} as const;

function describeLanguage(path: string): string {
  if (path.endsWith(".svelte")) return "Svelte";
  if (path.endsWith(".vue")) return "Vue SFC";
  if (path.endsWith(".tsx")) return "TSX";
  return "TypeScript";
}

function sourceLanguage(path: string): DemoSourceLanguage {
  if (path.endsWith(".svelte")) return "svelte";
  if (path.endsWith(".vue")) return "vue";
  if (path.endsWith(".tsx")) return "tsx";
  return "typescript";
}

function escapeAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

export function getDefaultDemoSourcePath(name: DemoSourceName): string {
  return defaultDemoSourcePaths[name] ?? demoSourcePaths[name][0];
}

export async function renderDemoSources(
  name: DemoSourceName,
  readSource: (path: string) => string,
): Promise<ReadonlyArray<RenderedDemoSource>> {
  const highlighter = await sourceHighlighter;
  return demoSourcePaths[name].map((path) => {
    const source = readSource(path);
    const displayPath = `src/${path}`;
    const highlightedHtml = highlighter
      .codeToHtml(source, {
        colorReplacements: sourceColorReplacements,
        lang: sourceLanguage(path),
        themes: {
          dark: "vitesse-dark",
          light: "vitesse-light",
        },
      })
      .replace("<code>", `<code data-demo-source-code="${escapeAttribute(displayPath)}">`);
    return {
      displayPath,
      highlightedHtml,
      language: describeLanguage(path),
      lineCount: source.endsWith("\n") ? source.split("\n").length - 1 : source.split("\n").length,
      path,
    };
  });
}
