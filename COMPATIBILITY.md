# Compatibility Matrix

This file records the current framework compatibility target. Maintain current versions, including prereleases. Older framework versions are outside the maintained matrix. The current workspace suite and isolated current-version packed consumer establish the support evidence; each pin change requires new evidence.

## Workspace baseline

| Component                    | Pinned version | Reason                                                                          |
| ---------------------------- | -------------- | ------------------------------------------------------------------------------- |
| Node.js                      | 24.18.0        | Current Node 24 LTS and satisfies Angular 22's `^24.15.0` requirement           |
| pnpm                         | 11.12.0        | Current stable package manager; supersedes the 11.7.0 disposable spike baseline |
| Vite+                        | 1.0.0          | Requested unified toolchain; current coordinated toolchain                      |
| TypeScript native CLI        | 7.0.2          | Primary source checker                                                          |
| TypeScript compatibility API | 6.0.2          | `@typescript/typescript6` for framework programmatic APIs and `tsc6`            |
| Astro                        | 7.3.5          | Documentation application baseline                                              |
| Starlight                    | 0.42.5         | Documentation framework baseline                                                |
| Vitest                       | 5.0.1          | Unit and browser test runner baseline                                           |
| Playwright                   | 1.63.0         | Browser provider and end-to-end baseline                                        |

Node 24.14.0 was sufficient for the first isolated Astro spike but is not a valid final baseline because Angular 22 requires Node 24.15.0 or newer. Every final compatibility check must run again on Node 24.18.0.

`@types/node` intentionally follows the latest Node 24 declaration line. Dependency audits report the Node 26 major, but adopting it would make repository types disagree with the pinned Node 24 runtime.

## Framework targets

| Integration    | Current target version | Peer range        | Required native checks                                              |
| -------------- | ---------------------- | ----------------- | ------------------------------------------------------------------- |
| React          | 19.3.0                 | `>=19.3.0 <20`    | Strict Mode browser identity, concurrent interruption, declarations |
| Preact         | 11.0.0                 | `>=11.0.0 <12`    | Native Preact hooks, browser identity                               |
| Vue            | 3.5.43                 | `>=3.5.43 <4`     | Native type checks, computed updates, browser identity              |
| Svelte         | 5.57.1                 | `>=5.57.1 <6`     | `svelte-check`, package build, browser identity                     |
| Solid          | 1.9.15                 | `>=1.9.15 <2`     | Owner disposal, signal updates, browser identity                    |
| Angular        | 22.2.1                 | `>=22.2.1 <23`    | Angular compiler, package build, zoneless CSR, browser identity     |
| Web Components | Web platform           | none              | Controller lifecycle, Node import smoke test, browser matrix        |
| Qwik           | 2.0.0-rc.0             | `>=2.0.0-rc.0 <3` | CSR optimizer, source checks, browser identity                      |
| Octane         | 0.7.1                  | `>=0.7.1 <0.8`    | Vite compiler, browser identity, declarations                       |

Lit 3.3.3 is a required consumer example for `@vp-tw/likftc/web`, not a runtime peer dependency. The native Web Components export must remain usable without Lit.

Octane support is experimental. Likftc tested `octane@0.7.1` with `@octanejs/vite-plugin@0.1.62`. Other versions are use-at-your-own-risk; please open an issue or PR if you verify one.

Qwik support is experimental and optimizer-only. Stable Qwik 1.20.0 excludes Vite 8, while the current Qwik 2 RC supports it. Likftc tested `@qwik.dev/core@2.0.0-rc.0`; other versions are use-at-your-own-risk, and verified combinations are welcome as issues or PRs. The Qwik-specific declaration workaround remains scoped to its adapter; runtime ESM reads optimizer globals during direct Node evaluation. `packages/likftc/tsconfig.qwik.json` confines `skipLibCheck` to Qwik-specific type checking, while `tsconfig.build.json` applies the same upstream workaround during declaration generation. Stable adapter checks keep `skipLibCheck: false`; adapter source, tests, generated declarations, optimizer output, and real-browser identity behavior remain checked.

Vue SFC checking uses the current `vue-tsc` with the programmatic TypeScript 6 API. The same application source is independently checked with the native TypeScript 7 CLI. Angular and Octane also resolve the TypeScript 6 API explicitly in their owning workspace packages.

If a current-version fixture fails, narrow the peer range to the first passing version. Do not patch a fixture, add compatibility aliases, or publish a wider claim without corresponding contract evidence.

`pnpm run check:compatibility` rebuilds and packs the stable package, installs that tarball with the exact current framework versions in an isolated workspace, compiles the consumer with the strict TypeScript config, bundles it with Vite, and runs every stable export in Chromium. The generated lockfile and tarball remain under `.artifacts/compatibility/` as local evidence. Current workspace versions run the full shared browser conformance suite. Qwik remains an experimental, optimizer-only target and is validated separately.

## Runtime and browser policy

- Repository development and release jobs use Node 24.18.0 exactly.
- Packed consumer smoke tests cover Node 22.22.3 and 24.18.0 because both are supported LTS lines and satisfy Angular 22.
- Chromium runs on every pull request.
- Chromium, Firefox, and WebKit run before merge or in the merge queue.
- Browser claims follow the strictest supported framework boundary. Angular 22 uses its 2026-05-07 Baseline set; Likftc does not claim older browsers through another adapter.
- CSR rendering is supported. SSR rendering and hydration behavior are not supported. Server-process import safety is required except for the explicitly optimizer-only experimental Qwik adapter.

## Sources

- [Node.js release schedule](https://nodejs.org/en/about/previous-releases)
- [Angular version compatibility](https://angular.dev/reference/versions)
- [React package](https://www.npmjs.com/package/react)
- [Preact package](https://www.npmjs.com/package/preact)
- [Vue package](https://www.npmjs.com/package/vue)
- [Svelte package](https://www.npmjs.com/package/svelte)
- [Solid package](https://www.npmjs.com/package/solid-js)
- [Qwik 2 package](https://www.npmjs.com/package/@qwik.dev/core)
- [Angular package](https://www.npmjs.com/package/@angular/core)
- [Lit package](https://www.npmjs.com/package/lit)
- [TypeScript 7 package](https://www.npmjs.com/package/typescript)
- [TypeScript 6 compatibility package](https://www.npmjs.com/package/@typescript/typescript6)
- [Astro package](https://www.npmjs.com/package/astro)
- [Starlight package](https://www.npmjs.com/package/@astrojs/starlight)
- [Vite+ package](https://www.npmjs.com/package/vite-plus)
- [Vitest package](https://www.npmjs.com/package/vitest)
- [Playwright package](https://www.npmjs.com/package/playwright)

## Coordinated toolchain

Vite+ 1.0.0 bundles Vite 8.3.1 and Vitest 5.0.1. The Vite alias, Vitest override, and browser/coverage providers stay synchronized with that bundle. The pinned Qwik rc.0 optional Vitest peer still declares `<5`, while the published package uses Vitest 5 for development; the exact workspace exception requires core/optimizer browser and compiler evidence. No Qwik testing-export compatibility is claimed.

Changesets 3 uses `format: false` to avoid the previously failing auto-detected formatter during release versioning. Normal Vite+ format checks still run in CI. The release action must provide primary Linux readback before delivery is complete.
