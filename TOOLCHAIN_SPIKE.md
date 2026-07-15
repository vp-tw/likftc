# Toolchain Compatibility Spike

## Pinned baseline

- Node.js 24.14.0 for the initial isolated run only
- pnpm 11.7.0 for the disposable spike; final workspace baseline is 11.12.0
- Vite+ 0.2.4
- TypeScript native CLI 7.0.2 as `tsc`
- TypeScript compatibility package 6.0.2 as `tsc6` and the `typescript` module
- Astro 7.0.7
- Starlight 0.41.3
- Vitest 4.1.10

The alias layout is intentional: embedded tools resolve the TypeScript 6 programmatic API from `typescript`, while the native TypeScript 7 CLI remains independently callable.

Node 24.14.0 does not satisfy Angular 22. The final baseline is Node 24.18.0, and all results below must be reproduced on that version before the spike gate closes.

## Verified results

- A frozen clean pnpm install passed the configured supply-chain policy.
- The only approved dependency build script was `esbuild`.
- `pnpm peers check` reported no peer dependency issues.
- TypeScript 7 and TypeScript 6 both passed the isolated library and tooling projects.
- `astro sync && astro check` completed with zero errors, warnings, or hints.
- Vitest passed the spike unit test.
- `vp pack` emitted ESM, source maps, and declarations using the library tsconfig.
- A sequential Astro Starlight production build completed successfully.

## Required configuration boundaries

Use separate configs for publishable source, tooling, and framework applications:

- Publishable source: all strict source flags, `skipLibCheck: false`, `isolatedDeclarations: true`, no ambient framework types.
- Tooling: all strict source flags, no isolated declarations, `skipLibCheck: true` for optional third-party tool declarations.
- Astro/framework applications: native strictest preset plus all compatible source flags; native framework checker owns generated and embedded files.

`packages/likftc/vite.config.ts` is excluded from the shared tools project because the Svelte plugin and Vite+ expose distinct Vite type instances. Its behavior remains covered by `vp pack`, `svelte-check`, and the Svelte browser suite.

The Vue demo runs `vue-tsc` 3.3.7 against an application-local TypeScript 5.9.3 API because the current checker cannot load the native TypeScript 7 shim. Workspace TypeScript 6 and TypeScript 7 still check all demo `.ts` source, while `vue-tsc` owns strict checking of the embedded Vue SFC template and script.

The Qwik optimizer runs in separate build and browser-test configs. Its resolve and JSX transform conditions otherwise affect sibling entries, selecting Svelte's server runtime in browser builds and compiling React or Solid JSX as Qwik nodes. The main build clears the output directory first; the isolated Qwik CSR build appends its artifacts, and the two browser suites run serially without changing other framework resolution.

This is stricter at the package boundary than one global config because it prevents third-party declaration failures from encouraging source-level relaxations.

## Reproduced failures and decisions

### Vite+ type-aware lint hang

With Vite+ 0.2.4, `lint.options.typeAware: true` and `typeCheck: true` launched `oxlint-tsgolint` processes that did not exit under the TS7/TS6 alias layout. Multiple concurrent checks amplified CPU usage. The processes were terminated and a full process audit confirmed no matching processes remained.

Decision: disable both options. Keep Vite+ for Oxfmt, syntax-aware Oxlint, Vitest, and packaging; run TypeScript 7 and TypeScript 6 through explicit compiler tasks. Re-enable only after a pinned Vite+ upgrade passes a disposable compatibility spike.

### Astro dependency-cache race

Running `astro check` and `astro build` concurrently against one install reproduced an `ENOTEMPTY` rename failure in `node_modules/.vite/deps`.

Decision: serialize Astro sync, check, and build tasks in local and CI task graphs. Other independent package tasks may remain parallel.

### Global third-party declaration checking

A single global config with `skipLibCheck: false` attempted to validate optional and generated declarations owned by Astro, Starlight, Vite+, and storage drivers. Installing undeclared optional integrations would hide the boundary problem and enlarge the dependency graph.

Decision: keep `skipLibCheck: false` on every publishable declaration project and packed consumer fixture. Framework and tool configs may skip dependency declaration re-checking while preserving all source strictness flags.

## Final spike result

- Every passing source, package, browser, and documentation check was reproduced on Node 24.18.0.
- Serial Vite+ format and syntax lint exit without orphan `tsgolint` processes after type-aware lint was disabled.
- Vitest Browser Mode passes 17 identity tests across seven stable targets and experimental Qwik 2 in real Chromium.
- Angular 22, Svelte 5, and the dual TypeScript compiler paths pass their native checks.
- Vue SFCs pass strict `vue-tsc` checks through the documented TypeScript 5.9 application boundary.
- The Starlight production build and preview navigation pass, including keyboard-operable reduced-motion controls and the responsive width matrix.
- Stable Qwik 1.20.0 excludes Vite 8. Qwik 2 beta.36 supports Vite 8 and passes optimizer, package metadata, source, and browser checks; its SVG JSX declarations require isolated `skipLibCheck`, and direct Node evaluation requires unavailable optimizer globals. The adapter remains experimental, optimizer-only, and pinned to an exact peer.
