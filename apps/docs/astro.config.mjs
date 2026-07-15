import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

export default defineConfig({
  base: "/likftc",
  prefetch: false,
  integrations: [
    starlight({
      components: {
        Footer: "./src/components/Footer.astro",
        PageTitle: "./src/components/PageTitle.astro",
        SiteTitle: "./src/components/SiteTitle.astro",
      },
      customCss: ["./src/styles/global.css"],
      description: "Fresh transition keys for list items that leave and return.",
      editLink: {
        baseUrl: "https://github.com/VdustR/likftc/edit/main/apps/docs/",
      },
      expressiveCode: false,
      favicon: "/favicon.png",
      head: [
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content: "https://vdustr.dev/likftc/og-image.png",
          },
        },
        {
          tag: "meta",
          attrs: { property: "og:image:width", content: "1200" },
        },
        {
          tag: "meta",
          attrs: { property: "og:image:height", content: "630" },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image:alt",
            content: "Likftc transition identities moving through an interactive filtered list",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:image",
            content: "https://vdustr.dev/likftc/og-image.png",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:image:alt",
            content: "Likftc transition identities moving through an interactive filtered list",
          },
        },
      ],
      lastUpdated: true,
      sidebar: [
        {
          label: "Start",
          items: [
            { label: "Overview", slug: "" },
            { label: "Installation", slug: "getting-started/installation" },
            { label: "First comparison", slug: "getting-started/comparison" },
          ],
        },
        {
          label: "Concepts",
          items: [{ autogenerate: { directory: "concepts" } }],
        },
        {
          label: "Frameworks",
          items: [
            { label: "React", slug: "frameworks/react" },
            { label: "Preact", slug: "frameworks/preact" },
            { label: "Vue", slug: "frameworks/vue" },
            { label: "Svelte", slug: "frameworks/svelte" },
            { label: "Solid", slug: "frameworks/solid" },
            { label: "Angular", slug: "frameworks/angular" },
            { label: "Web Components", slug: "frameworks/web-components" },
            { label: "Qwik — experimental", slug: "frameworks/qwik" },
          ],
        },
        {
          label: "State management",
          items: [
            { label: "Zustand", slug: "state-management/zustand" },
            { label: "Pinia", slug: "state-management/pinia" },
            { label: "Jotai", slug: "state-management/jotai" },
            { label: "Nanostores", slug: "state-management/nanostores" },
            { label: "TanStack Store", slug: "state-management/tanstack-store" },
            { label: "XState", slug: "state-management/xstate" },
            { label: "Angular Signals", slug: "state-management/angular-signals" },
            {
              label: "Preact Signals Core",
              slug: "state-management/preact-signals",
            },
            { label: "Alien Signals", slug: "state-management/alien-signals" },
          ],
        },
        {
          label: "Guides",
          items: [{ label: "Reduced motion", slug: "accessibility/reduced-motion" }],
        },
      ],
      social: [
        {
          href: "https://github.com/VdustR/likftc",
          icon: "github",
          label: "GitHub",
        },
      ],
      title: "Likftc",
    }),
  ],
  site: "https://vdustr.dev",
});
