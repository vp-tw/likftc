# Support Policy

## Stable API

Starting with v1, the framework-neutral core and the React, Preact, Vue, Svelte, Solid, Angular, and Web adapters follow semantic versioning. Supported framework and Node.js ranges are declared in `packages/likftc/package.json` and backed by the compatibility matrix.

The Qwik adapter is experimental while Qwik 2 remains in beta. `@vp-tw/likftc/qwik` may change in a Likftc minor release until its experimental label is removed. It remains client-only and optimizer-only during that period.

## Deprecation

A stable API scheduled for removal is deprecated in a minor release and removed no earlier than the next major release. The documentation and changelog identify its replacement. Security fixes and upstream framework changes that make an API impossible to support may require a faster response, which will be documented with the release.

## Dependencies

Dependabot checks npm dependencies monthly. Every update must pass the full framework, type, browser, package, and minimum-version gates before merging. Peer ranges are changed only when their boundary fixtures pass; automated pull requests do not widen support claims by themselves.

## Reporting Issues

Report reproducible problems through [GitHub Issues](https://github.com/vp-tw/likftc/issues). Include the Likftc version, adapter import, framework version, browser or Node.js version, and a minimal reproduction when possible.
