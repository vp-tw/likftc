# Likftc v1 Rewrite Plan

## Outcome

Rewrite Likftc as a tested, framework-neutral list animation identity and lifecycle library with idiomatic adapters for React, Preact, Vue, Svelte, Solid, Angular, native Web Components, and experimental Qwik 2. Replace the existing documentation with a branded Astro Starlight site containing CSR-only runnable before-and-after demos. Qwik remains explicitly experimental until its stable compiler and declaration gates pass.

The rewrite ships as a new major version. It does not preserve implementation compatibility with the current `get` and `sync` internals unless doing so does not weaken the new lifecycle contract.

## Non-negotiable requirements

- One documented lifecycle contract shared by every adapter.
- Before-and-after demos for every supported framework.
- CSR-only demos and adapter behavior for v1. SSR rendering and hydration semantics are out of scope.
- All packages remain safe to import in a server process and must not access the DOM at module scope.
- Identical scenarios, timing, controls, and diagnostics across demos.
- WCAG 2.2 AA, keyboard support, reduced-motion behavior, and responsive verification.
- No unmodified theme appearance or generic AI-generated developer-tool design patterns.
- Fresh dependency graph using current stable releases at implementation time.
- Automated unit, contract, browser, package, accessibility, visual, and responsive tests.

## Target workspace

```text
apps/
  docs/                       Astro Starlight website
  demos/                      Private multi-page CSR demo workspace
packages/
  likftc/                     Core plus stable framework subpath exports
  qwik/                       Experimental optimizer-only Qwik adapter
```

The stable package owns the core and framework subpath exports. Qwik remains a separate publishable package while its optimizer and exact beta peer require a distinct compatibility boundary. Neither package bundles framework runtimes.

## Toolchain decisions

### Runtime and package management

- Pin Node.js 24.18.0 for repository development and release jobs. It is the current Node 24 LTS and satisfies Angular 22's `^24.15.0` boundary; the earlier Node 24.14 spike is not Angular evidence.
- Keep pnpm as the workspace package manager and regenerate the lockfile from scratch.
- Use Vite+ as the command surface for environment management, installs, checks, tests, package builds, and cached monorepo tasks.
- Pin the Vite+ project dependency and CI action exactly for reproducibility. Vite+ is treated as a low-risk foundation based on its team, ecosystem adoption, and community signal.

### Static checks and builds

- TypeScript 7 is the primary CLI type checker for the workspace. It is stable as of July 8, 2026.
- `vp check` is the fast local path for Oxfmt and syntax-aware Oxlint. Vite+ 0.2.4's `tsgolint` path hangs with the required TS7/TS6 alias layout, so `typeAware` and `typeCheck` stay disabled until a pinned upgrade passes the compatibility spike.
- Install TypeScript 6 side-by-side through the official compatibility package for tools that need a programmatic compiler API. Astro, Vue, Svelte, and Angular embedded-language tooling cannot fully use TypeScript 7 until its new API ships.
- Run explicit TypeScript 7 and TypeScript 6 compiler tasks in CI instead of delegating correctness to `tsgolint`. A mismatch blocks the change until it is understood and documented.
- Run framework-native checks in CI where they add coverage: Angular compiler, Svelte check, Vue type checking, Qwik CSR optimizer, and package declaration builds.
- Use `vp pack` and its tsdown integration for ESM packages, declarations, source maps, and package exports.
- Prefer ESM-only package output for v1. Add CJS only if the compatibility spike identifies a supported consumer that cannot use ESM.

### Strict TypeScript baseline

All package configs extend one strict TS6-compatible base so TypeScript 6 and 7 evaluate the same source. Enable at least:

- `strict`
- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `noImplicitOverride`
- `noPropertyAccessFromIndexSignature`
- `noImplicitReturns`
- `noFallthroughCasesInSwitch`
- `noUnusedLocals`
- `noUnusedParameters`
- `noUncheckedSideEffectImports`
- `verbatimModuleSyntax`
- `isolatedModules`
- `forceConsistentCasingInFileNames`
- `allowUnreachableCode: false`
- `allowUnusedLabels: false`
- `skipLibCheck: false` for publishable library declaration projects

Use `module: preserve`, `moduleResolution: bundler`, explicit `rootDir`, and explicit `types` arrays. Do not use deprecated `baseUrl`, legacy Node module resolution, or deprecated module targets. Enable `isolatedDeclarations` and `erasableSyntaxOnly` for publishable packages where the framework compiler supports them.

Do not force one tsconfig across incompatible boundaries. Publishable source uses `skipLibCheck: false` and `isolatedDeclarations: true`; Astro and framework-native configs may use `skipLibCheck: true` only to avoid re-checking broken or optional third-party declarations, while retaining every source-level strictness flag. Tool configuration files are checked separately. Every exception needs an adjacent explanation and a regression test.

### Git hooks

Vite+ can replace Husky and lint-staged, but this project will use all requested tools with one owner per responsibility:

```text
Husky pre-commit hook
  -> lint-staged selects changed files
    -> Vite+ runs Oxfmt and Oxlint on staged files
```

Do not enable Vite+'s hook installer or `vp staged` while Husky and lint-staged own this workflow. Pre-commit stays fast and does not run `tsgolint`, the full compiler matrix, browser tests, or package checks. Explicit TS7/TS6 checks run in pre-push or CI.

### Release quality

Add Changesets for coordinated package versions and release notes, `publint` and Are the Types Wrong for package validation, packed-tarball fixture installs, npm provenance, and size budgets. Configure automated dependency update PRs after the v1 dependency graph stabilizes.

## Core v1 architecture

Design the core API through an RFC and executable contract tests before implementing adapters. The RFC must settle these behaviors:

- Atomic frame reconciliation rather than separately ordered `get` and `sync` calls.
- Stable identity while an item remains present.
- Fresh identity after an item becomes absent and later re-enters.
- Correct behavior during reorder, rapid churn, interrupted exits, and repeated renders.
- Explicit duplicate logical-ID diagnostics.
- Generated-key collision detection.
- Correct handling of valid falsey custom keys, avoiding the current truthiness bug.
- Deterministic first client render and remount behavior.
- Bounded memory behavior after items leave.
- No DOM access or browser-global access at module scope.
- Optional development diagnostics that expose frames, generated keys, and lifecycle events without entering production bundles.

The core should accept objects through an explicit `getId(item)` function while keeping logical IDs serializable. Adapters must define their commit timing rather than inheriting accidental behavior from a mutable shared map.

## Adapter contract

Every adapter must pass the same scenario suite while exposing native framework conventions:

| Export                  | Intended API direction                            | Required framework-specific coverage                          |
| ----------------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| `@vp-tw/likftc/react`   | Hook                                              | Strict Mode, concurrent client rendering, mount and remount   |
| `@vp-tw/likftc/preact`  | Hook                                              | Native Preact hooks, no React compatibility alias requirement |
| `@vp-tw/likftc/vue`     | Composable                                        | Refs, computed values, watchers, client mount and unmount     |
| `@vp-tw/likftc/svelte`  | Svelte 5-friendly function or rune integration    | Reactive client updates, package typing                       |
| `@vp-tw/likftc/solid`   | Primitive                                         | Signals, owner lifecycle, cleanup, client rendering           |
| `@vp-tw/likftc/angular` | Signal-oriented function or injectable controller | Angular 21 and 22, CSR, zoneless mode, compiler packaging     |
| `@vp-tw/likftc/web`     | DOM controller for native custom elements         | Connect, update, disconnect, and DOM ownership boundaries     |

Do not copy the React API mechanically into every framework. The shared contract is semantic; the public integration must remain idiomatic.

## Test strategy

### Core tests

- Vitest unit tests for every state transition and error path.
- Property-based tests for arbitrary frame sequences, reorder operations, disappearance, and re-entry.
- Regression tests for falsey generated keys, collisions, duplicates, and memory cleanup.
- Type tests for generic inference and invalid inputs.

### Adapter tests

- A private shared conformance suite runs the same frame fixtures against every adapter.
- Actual framework renderers verify DOM instance identity, not only returned key strings.
- Server-import smoke tests prove packages do not access browser globals at module scope. SSR rendering and hydration tests are explicitly excluded from v1.
- React gets Strict Mode and interrupted-render cases.
- The experimental Qwik adapter must pass client-only optimizer and lifecycle cases with an exact beta peer.
- Angular gets compiler and zoneless cases.

### Browser and site tests

- Use Vitest Browser Mode with the Playwright provider for real-browser component behavior.
- Run Chromium on every pull request; run Chromium, Firefox, and WebKit in the full or scheduled matrix.
- Use Playwright for documentation navigation, open Shadow DOM interaction, keyboard interaction, accessibility checks, screenshots, and viewport testing.
- Add automated accessibility checks with axe in addition to manual keyboard and screen-reader review.
- Freeze animations at deterministic checkpoints before visual snapshots.

### Responsive matrix

At minimum verify 320, 375, 768, 1024, 1440, and 1920 CSS-pixel widths, plus portrait and landscape device emulation. Test 200% zoom and long code lines. No heading, code panel, controls, or identity labels may overflow their parent.

## Documentation and demo architecture

### Astro Starlight

Use Starlight for content collections, navigation, search, accessibility foundations, and documentation layout. Build a Likftc theme through custom CSS and focused component overrides instead of replacing Starlight's accessible page frame.

Suggested information architecture:

```text
Home
Getting started
  Why list identity changes
  Installation
  First comparison
Concepts
  Frames and identities
  Exit and re-entry
  Reordering
  Lifecycle timing
Frameworks
  React
  Preact
  Vue
  Svelte
  Solid
  Qwik compatibility status
  Angular
  Web Components
API reference
Recipes
Accessibility
Migration from 0.x
```

### Demo isolation

Build each supported framework example as a real standalone CSR entry with both a stable ES module and a direct debugging page. A framework guide loads only its route-specific module into an inline host. Do not add SSR adapters or hydration paths to the demo architecture.

The shared shell attaches an open Shadow DOM to the host, injects the demo styles there, and gives the selected framework adapter an ordinary `HTMLElement` mount target. This preserves CSS and runtime ownership without a nested browsing context. Each inline demo owns the untreated and corrected panes, deterministic frame controls, motion preference, and diagnostics. There is no parent-child messaging, resize protocol, or nested scrollbar.

### Single source for code and behavior

The code displayed in each framework guide documents the public adapter integration used by its runnable demo. The production demo app remains the executable source of truth for behavior; browser tests verify the displayed API shape and demo output together. Generate source tabs from the demo workspace before exposing complete multi-file examples, rather than maintaining copied full-source listings.

### Comparison component

Every framework demo uses one shared self-contained comparison shell:

- Synchronized untreated and corrected examples.
- `Previous frame`, `Next frame`, `Play loop` / `Pause loop`, and `Reset` controls. Playback starts on page load when the active motion preference permits it.
- One shared four-frame loop based on the original demo: A/B/C → D/A/B → C/D/A → B/C/D → A/B/C. Three active rows default to a 1,000 ms update interval while 3,000 ms exits overlap and same IDs re-enter. Active rows always move downward; the untreated pane alone exposes opposite-direction upward movement when an exiting same-key DOM is reused. Demo controls expose both timing values for slower or faster study.
- Motion mode: `System`, `Reduced`, and `Full`.
- Logical ID, generated key, actual DOM instance, overlapping presence, and frame diagnostics.
- Public integration code beside the runnable production demo.

Use side-by-side comparison when space permits. On narrow screens, stack both examples under one persistent control bar so neither side becomes hidden behind a tab.

## Reduced-motion behavior

Animation is essential instructional content. Autoplay makes the identity error visible without requiring setup, while the pause control and motion preference keep it user-controlled.

- Follow `prefers-reduced-motion` by default.
- Disable loop playback in reduced mode.
- Keep manual frame stepping, identity badges, and event logs fully functional.
- Apply state changes instantly or with a minimal non-spatial transition.
- Allow an explicit per-demo `Full` motion selection and clearly state that it overrides the system preference for that demo only.
- Provide previous, next, play or pause, and reset controls adjacent to every demo. Start playback only when the active motion preference permits it.
- Never use flashing effects or more than three flashes per second.

This preserves the product demonstration while meeting the user's need to control movement and auto-updating content.

## Brand and visual direction

- Preserve the recognizable key and motion concept, and treat the existing gruvbox palette as identity input rather than copying the old page literally.
- Convert final colors to OKLCH tokens and verify WCAG contrast.
- Select a distinctive Google Fonts family through a typography study based on the brand words precise, kinetic, and crafted. Reject common developer-tool defaults and test the final font with code, long headings, CJK fallback, and narrow viewports.
- Use motion to expose identity and lifecycle. Avoid uniform section reveals, gradient text, glass panels, oversized rounded cards, repeated icon-card grids, decorative terminal styling, and generic editorial layouts.
- Produce `DESIGN.md` after the first Starlight design spike so it records the new system rather than fossilizing the current SvelteKit implementation.

## Risk-reduction gates

1. Build one complete vertical slice first: strict core contract, React adapter, CSR comparison demo, source manifest, Starlight page, browser test, and packed-package fixture.
2. Freeze the semantic contract only after that slice survives Strict Mode, rapid frame changes, remounts, reduced motion, and all supported browser engines.
3. Add adapters one at a time. Each adapter must bring its own package checks, contract tests, example, docs, and visual baseline in the same change.
4. Keep framework versions isolated through peer dependencies and fixture apps. Test the minimum supported and current stable versions rather than relying on one hoisted workspace version.
5. Use deterministic virtual time and explicit frame stepping. Never make CI depend on wall-clock animation completion.
6. Keep public exports minimal. Internal diagnostic and demo APIs remain private until two adapters need the same capability.
7. Publish alpha and beta releases through Changesets. Verify real installs from packed tarballs before any stable release.
8. Maintain package-size and dependency-count budgets. An adapter may depend only on core plus its framework peer unless an exception is justified.
9. Use tiered CI: fast static, unit, and Chromium checks on every pull request; complete framework-version, browser, viewport, and visual matrices before merge or nightly.
10. Record core semantics, TypeScript dual-version handling, demo protocol, and packaging decisions as short ADRs so later upgrades do not reopen settled constraints accidentally.
11. Serialize `astro sync`, `astro check`, and `astro build`; they share Vite's dependency cache and can race when started concurrently. Parallelize only independent package tasks.
12. Give every CI task a timeout and verify teardown so a stuck compiler or browser worker cannot exhaust the runner or a developer machine.

## Delivery phases

### Phase 0: Compatibility spikes

1. Scaffold a disposable Vite+ workspace pinned to an exact release.
2. Prove Astro Starlight development and production builds under the selected Vite+ setup.
3. Prove TypeScript 7 CLI checks, TypeScript 6 compatibility checks, Vitest Browser Mode, and `vp pack` in the same workspace. Keep Vite+ type-aware lint disabled unless its `tsgolint` process exits reliably with the dual-version alias layout.
4. Prove the strict shared tsconfig against Astro, Vue, Svelte, Angular, and all publishable packages on Node 24.18.0; document only unavoidable per-package exceptions.
5. Compile minimal CSR examples for seven stable targets and experimental Qwik 2, retaining all upstream exception evidence.
6. Verify Angular 22 with TypeScript 6 and the parallel TypeScript 7 CLI path.
7. Prove isolated inline Shadow DOM mounting, route-specific runtime loading, deterministic controls, and reduced-motion behavior.

Exit only when all spikes pass in CI. If Vite+ cannot support the workspace reliably, keep its adoption blocked rather than hiding incompatibilities with untracked scripts.

### Phase 1: Workspace foundation

Replace the old manifest, lockfile, Rollup scripts, SvelteKit docs app, and legacy CI with the new workspace skeleton. Configure Vite+, pnpm, Oxc checks, TypeScript 7, the TypeScript 6 compatibility package, strict shared configs, Husky, lint-staged, Vitest, Playwright, Changesets, and package validation.

### Phase 2: Core contract

Write the core RFC, failing contract tests, implementation, type tests, and compatibility notes. Publish no adapters until the core lifecycle suite is stable.

### Phase 3: First reference adapters

Implement one complete React vertical slice first. After its package, CSR demo, docs, and browser tests pass, implement Vue and Svelte to validate the contract across reactive and compiler-based models. Freeze the adapter contract only after all three are green.

### Phase 4: Remaining adapters

Implement Preact, Solid, Angular, Web Components, and an explicitly experimental Qwik 2 adapter. Each adapter lands with tests, a production example, complete docs, and package validation.

### Phase 5: Branded Starlight site

Run an Impeccable design pass, produce `DESIGN.md`, implement the theme and landing page, finish the comparison component, and complete responsive and accessibility verification.

### Phase 6: Release hardening

Run the full browser and framework matrix, packed-package fixture installs, API review, migration guide, visual review, security checks, and release dry run. Publish a v1 prerelease before the stable release.

## CI gates

Every pull request must pass:

1. Install with a frozen lockfile.
2. Oxfmt check.
3. Oxlint and TypeScript 7 checks under the strict shared config.
4. TypeScript 6 compatibility and framework-native compiler checks.
5. Core and adapter Vitest suites.
6. Chromium browser tests.
7. Package build, `publint`, type-package validation, and packed fixture installs.
8. Astro Starlight production build.
9. Focused accessibility and responsive smoke tests.

Astro check and build jobs must not run concurrently against the same workspace. Every job has an explicit timeout and teardown check for compiler and browser child processes.

The full three-browser, visual-regression, and complete viewport matrix can run on merge queue or nightly if pull-request duration becomes excessive.

## Completion criteria

- All seven stable integrations and experimental Qwik 2 pass the shared semantic contract.
- Every framework page contains a synchronized before-and-after demo and source generated from the running example.
- Reduced-motion users can understand every demonstrated failure without enabling animation.
- The site passes the viewport matrix, keyboard review, automated accessibility checks, and visual regression suite.
- Every npm package passes export, declaration, packed-install, and size checks.
- The migration guide documents every intentional break from 0.x.
- No legacy SvelteKit, Rollup, generated-code, or obsolete dependency path remains.

## Current risk and confidence

Execution confidence is currently high for the implemented package contract. Vite+ is treated as low risk with explicit compiler fallbacks. Minimum-version tarball fixtures and one shared adapter conformance suite now pass; the largest remaining risks are prerelease operations, release ownership, the temporary TypeScript 7 API boundary for embedded-language tools, and long-term adapter maintenance.

The vertical-slice and strict dual-TypeScript checks are hard gates. Passing them should raise implementation confidence above 80 percent before adapter expansion begins.

## Primary references

- [Vite+ documentation](https://viteplus.dev/guide/)
- [Vite+ check and TypeScript Go integration](https://viteplus.dev/guide/check)
- [Vite+ library packaging](https://viteplus.dev/guide/pack)
- [Vite+ commit hooks](https://viteplus.dev/guide/commit-hooks)
- [TypeScript 7 stable release](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [TypeScript 6 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)
- [Angular version compatibility](https://angular.dev/reference/versions)
- [Astro framework integrations](https://docs.astro.build/en/guides/integrations/)
- [Starlight component overrides](https://starlight.astro.build/reference/overrides/)
- [Vitest Browser Mode](https://vitest.dev/guide/browser/)
- [WCAG 2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
