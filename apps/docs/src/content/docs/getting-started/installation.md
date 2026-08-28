---
title: Installation
description: Install one package and import the adapter for your framework.
---

Likftc ships its framework-neutral core and all stable adapters in one package. Install it with your framework runtime, then import only the adapter subpath you use. Framework runtimes remain external and unused adapters are not loaded.

```sh
pnpm add @vp-tw/likftc react
```

Replace `react` with the runtime for your project. The Likftc package name stays the same.

:::note[v1 support contract]
The framework-neutral core and stable adapter APIs follow semantic versioning from v1. Qwik and Octane remain explicitly experimental subpaths while their runtimes are pre-stable.
:::

## Runtime support

- Node.js `^22.22.3` or `>=24.15.0` for package tooling and server-side imports.
- ESM-only output.
- CSR behavior in v1. SSR rendering and hydration semantics are not part of the support contract.
- Built package entry points are safe to import in Node and do not access browser globals at module scope.

## Choose an import

| UI library           | Import                  | Native shape                  |
| -------------------- | ----------------------- | ----------------------------- |
| React                | `@vp-tw/likftc/react`   | Hook                          |
| Preact               | `@vp-tw/likftc/preact`  | Hook                          |
| Vue                  | `@vp-tw/likftc/vue`     | Computed composable           |
| Svelte               | `@vp-tw/likftc/svelte`  | Readable store                |
| Solid                | `@vp-tw/likftc/solid`   | Key controller                |
| Angular              | `@vp-tw/likftc/angular` | Signal                        |
| Web Components / Lit | `@vp-tw/likftc/web`     | Transactional controller      |
| Qwik 2 beta          | `@vp-tw/likftc/qwik`    | Experimental client-only hook |
| Octane 0.1.17        | `@vp-tw/likftc/octane`  | Experimental client-only hook |

Likftc tested Octane with `octane@0.1.17` and `@octanejs/vite-plugin@0.1.17`, and Qwik with `@qwik.dev/core@2.0.0-beta.42`. Other experimental-runtime versions are use-at-your-own-risk; please open an issue or PR if you verify one. See each framework guide for compiler and declaration constraints.
