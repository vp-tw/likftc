# Support Policy

## Stable API

Starting with v1, the framework-neutral core and the React, Preact, Vue, Svelte, Solid, Angular, and Web adapters follow semantic versioning. Supported framework and Node.js ranges are declared in `packages/likftc/package.json` and backed by the compatibility matrix.

The Qwik adapter is experimental while Qwik 2 remains a prerelease. `@vp-tw/likftc/qwik` may change in a Likftc minor release until its experimental label is removed. It remains client-only and optimizer-only during that period.

## Deprecation

A stable API scheduled for removal is deprecated in a minor release and removed no earlier than the next major release. The documentation and changelog identify its replacement. Security fixes and upstream framework changes that make an API impossible to support may require a faster response, which will be documented with the release.

## Dependencies

Dependabot checks npm dependencies monthly. Every update must pass the full framework, type, browser, package, and current-version consumer gates before merging. Peer ranges are changed only when the current-version consumer fixtures pass; automated pull requests do not widen support claims by themselves.

## Reporting Issues

Report reproducible problems through [GitHub Issues](https://github.com/vp-tw/likftc/issues). Include the Likftc version, adapter import, framework version, browser or Node.js version, and a minimal reproduction when possible.

## Dependency policy

Maintain the current framework versions. Prereleases, including alpha, beta, and release candidates, are eligible; a stable channel is not required. Keep the one-day minimum release age, strict peer checks, and supply-chain policy.

Vite+ manages its Vite alias and bundled Vitest runner. Upgrade that set together with `vp migrate` from the project-local CLI, including matching browser and coverage providers. Dependabot version updates do not independently advance those managed pins; security updates remain eligible. The exact Vitest override also constrains security remediation; advance the Vite+ bundle and matching providers together before accepting such an update. Keep Angular packages and Astro/Starlight synchronized when peers require matching versions.

The optional Qwik Vitest exception applies only to the exact tested rc/runner combination and the core/optimizer exports used here. It does not declare support for Qwik's testing export. Exact Vite peer exceptions refer to the Vite version reported by `vp toolchain`, not the version of its aliased package. Every pin change must rerun the full acceptance matrix.

Octane's exact alien-signals dependency is upgraded from 3.2.0 to 3.2.1 and verified by compiler and browser tests. Separately, the alien-signals declaration patch makes explicitly undefined graph links legal under `exactOptionalPropertyTypes`; the patch does not change runtime code. Remove it when upstream declarations pass the strict compiler checks without the patch.

This migration pins `vue-tsc` and its language-core dependency to 3.3.11 by explicit maintainer decision. Version 3.3.12 includes an inline `@plugins` arbitrary-code-execution fix; upgrading the checker remains a follow-up. This exception does not change the release-age or trust policy.
