# Likftc

Fresh transition keys for list items that leave and return.

The v1 public API is frozen for stable release. Its lifecycle contract passes shared renderer tests, isolated minimum-version fixtures, and registry-installed consumer verification.

## Supported integrations

| Import                  | API                         | Tested workspace version            |
| ----------------------- | --------------------------- | ----------------------------------- |
| `@vp-tw/likftc/react`   | `useLikftc()`               | React 19.2.7                        |
| `@vp-tw/likftc/preact`  | `useLikftc()`               | Preact 10.29.7                      |
| `@vp-tw/likftc/vue`     | `useLikftc()`               | Vue 3.5.39                          |
| `@vp-tw/likftc/svelte`  | `createLikftc()` store      | Svelte 5.56.4                       |
| `@vp-tw/likftc/solid`   | `createLikftc()` primitive  | Solid 1.9.14                        |
| `@vp-tw/likftc/angular` | `createLikftc()` signal     | Angular 22.0.6                      |
| `@vp-tw/likftc/web`     | `createLikftc()` controller | Web platform and Lit 3.3.3 consumer |
| `@vp-tw/likftc/qwik`    | `useLikftc()`               | Qwik 2.0.0-beta.36                  |

Qwik support is experimental and client-only. Qwik 2 beta supports the Vite 8 baseline, but its peer must remain pinned exactly and its current SVG JSX declaration incompatibility is isolated in Qwik-specific type checks and the declaration build.

## Install

Install the package with the framework runtime you use. Framework adapters are subpath exports, and every framework runtime remains external.

```sh
pnpm add @vp-tw/likftc react
```

```tsx
import { useLikftc } from "@vp-tw/likftc/react";

const entries = useLikftc(items, { getId: (item) => item.id });
```

Qwik uses the same package through its experimental subpath export:

```sh
pnpm add @vp-tw/likftc @qwik.dev/core@2.0.0-beta.36
```

Every entry contains the original item, its logical ID, and a transition key. Use the transition key where the renderer or animation library owns DOM identity.

Your animation layer retains an exiting row under the key it already had. If the same logical ID
returns before that exit finishes, Likftc gives the entering row a fresh key so both DOM instances can
exist without a FLIP collision.

## Development

The repository pins Node.js 24.18.0, pnpm 11.12.0, and Vite+ 0.2.4. Use Vite+ as the command surface so the pinned package manager is selected even when another global pnpm is on `PATH`.

```sh
vp install --frozen-lockfile
vp run verify:toolchain
vp check
vp run check:types
vp run check:frameworks
vp test run --coverage
vp test run --config vitest.browser.config.ts
vp run check:docs
vp run build
vp run check:packages
vp run check:compatibility
```

CI installs its pinned Chromium build. Locally, either install that browser with Playwright or use an
existing Chrome installation:

```sh
PLAYWRIGHT_CHANNEL=chrome vp run test:browser:chromium
```

Workspace compiler and build tasks run with a concurrency limit of one. Astro checks and builds are intentionally serial because they share Vite's dependency cache. Vite+ type-aware Oxlint is disabled for this pinned release because its `tsgolint` worker does not terminate reliably with the dual TypeScript layout; explicit TypeScript 7 and TypeScript 6 checks remain required.

## Releases

Every publishable change needs a changeset. After a push to `main`, the release job waits for the full quality job, then creates or updates a draft release pull request. Merging that pull request runs the quality job again before publishing with npm provenance. Entering or leaving prerelease mode requires a separate review.

## Documentation

The branded Astro Starlight site lives in `apps/docs`. It includes keyboard-operable, CSR-only before-and-after demos and a reduced-motion mode that keeps manual frame stepping and identity diagnostics available.

See [the compatibility matrix](./COMPATIBILITY.md), [quality gates](./QUALITY_GATES.md), and [risk register](./RISK_REGISTER.md) for the current evidence and release blockers.

## License

MIT
