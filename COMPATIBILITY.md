# Compatibility Matrix

This file records the rewrite compatibility target as of 2026-07-16. Versions are exact evidence inputs, not floating install ranges. Stable peer ranges are backed by the current workspace suite and isolated minimum-version fixtures.

## Workspace baseline

| Component                    | Pinned version | Reason                                                                          |
| ---------------------------- | -------------- | ------------------------------------------------------------------------------- |
| Node.js                      | 24.18.0        | Current Node 24 LTS and satisfies Angular 22's `^24.15.0` requirement           |
| pnpm                         | 11.12.0        | Current stable package manager; supersedes the 11.7.0 disposable spike baseline |
| Vite+                        | 0.2.4          | Requested unified toolchain; exact pin contains pre-1.0 drift                   |
| TypeScript native CLI        | 7.0.2          | Primary source checker                                                          |
| TypeScript compatibility API | 6.0.2          | `@typescript/typescript6` for framework programmatic APIs and `tsc6`            |
| Astro                        | 7.0.9          | Documentation application baseline                                              |
| Starlight                    | 0.41.3         | Documentation framework baseline                                                |
| Vitest                       | 4.1.10         | Unit and browser test runner baseline                                           |
| Playwright                   | 1.61.1         | Browser provider and end-to-end baseline                                        |

Node 24.14.0 was sufficient for the first isolated Astro spike but is not a valid final baseline because Angular 22 requires Node 24.15.0 or newer. Every final compatibility check must run again on Node 24.18.0.

`@types/node` intentionally follows the latest Node 24 declaration line. Dependency audits report the Node 26 major, but adopting it would make repository types disagree with the pinned Node 24 runtime.

## Framework targets

| Integration    | Current evidence version | Provisional peer range | Boundary fixtures         | Required native checks                                              |
| -------------- | ------------------------ | ---------------------- | ------------------------- | ------------------------------------------------------------------- |
| React          | 19.2.7                   | `>=18.3.1 <20`         | 18.3.1 and 19.2.7         | Strict Mode browser identity, concurrent interruption, declarations |
| Preact         | 10.29.7                  | `>=10.29.0 <11`        | 10.29.0 and 10.29.7       | Native Preact hooks without `preact/compat`, browser identity       |
| Vue            | 3.5.39                   | `>=3.4.0 <4`           | 3.4.0 and 3.5.39          | Native type checks, computed updates, browser identity              |
| Svelte         | 5.56.5                   | `>=5.0.0 <6`           | 5.0.0 and 5.56.5          | `svelte-check`, Svelte 5 package build, browser identity            |
| Solid          | 1.9.14                   | `>=1.9.0 <2`           | 1.9.0 and 1.9.14          | Owner disposal, signal updates, browser identity                    |
| Angular        | 22.0.6                   | `>=20.0.0 <23`         | 20.0.0 and 22.0.6         | Angular compiler, package build, zoneless CSR, browser identity     |
| Web Components | Web platform             | none                   | Playwright browser matrix | Controller connect/update/disconnect and Node import smoke test     |
| Qwik           | 2.0.0-beta.36            | exact beta             | exact beta only           | CSR optimizer, strict source checks, browser identity               |

Lit 3.3.3 is a required consumer example for `@vp-tw/likftc/web`, not a runtime peer dependency. The native Web Components export must remain usable without Lit.

Qwik support is experimental and optimizer-only. Stable Qwik 1.20.0 excludes Vite 8, while Qwik 2 beta supports it. Qwik 2 beta.36 and beta.37 still fail semantic checking of their SVG JSX declarations under TypeScript 6 and TypeScript 7, and their runtime ESM reads optimizer globals during direct Node evaluation. `packages/likftc/tsconfig.qwik.json` confines `skipLibCheck` to Qwik-specific type checking, while `tsconfig.build.json` applies the same upstream workaround during declaration generation. Stable adapter checks keep `skipLibCheck: false`; adapter source, tests, generated declarations, optimizer output, and real-browser identity behavior remain checked. The optional peer is exact until Qwik 2 becomes stable and both upstream exceptions are removed.

Vue SFC checking uses `vue-tsc` 3.3.7 with an application-local TypeScript 5.9.3 API because that checker cannot load the native TypeScript 7 shim. The same demo's `.ts` source still passes the workspace TypeScript 6 and TypeScript 7 checks, and the SFC checker inherits the strict application config. Re-evaluate this boundary when `vue-tsc` supports the native TypeScript 7 API.

If a minimum-version fixture fails, narrow the peer range to the first passing version. Do not patch a fixture, add compatibility aliases, or publish a wider claim without corresponding contract evidence.

`pnpm run check:compatibility` rebuilds and packs the stable package, installs that tarball with the exact minimum framework versions in an isolated workspace, compiles the consumer with the strict TypeScript config, bundles it with Vite, and runs every stable export in Chromium. The generated lockfile and tarball remain under `.artifacts/compatibility/` as local evidence. Current workspace versions run the full shared browser conformance suite. Qwik remains an exact-beta, optimizer-only target and is validated separately.

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
