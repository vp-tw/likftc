# ADR 0001: TypeScript 7 CLI with TypeScript 6 Compatibility API

- Status: Accepted for the rewrite baseline
- Date: 2026-07-13

## Context

TypeScript 7 is the primary compiler requested for the rewrite, but its 7.0 release does not provide the programmatic API required by Astro, Vue, Svelte, Angular, Vite+, and related language tooling.

## Decision

- Install native TypeScript 7 under `@typescript/native` and invoke its `tsc` CLI explicitly.
- Install `@typescript/typescript6` as the `typescript` package alias and expose its compiler as `tsc6`.
- Check publishable source with both compilers.
- Let framework-native checkers resolve the TypeScript 6 compatibility API.
- Do not use Vite+ 0.2.4 `tsgolint` for type checking; explicit compiler tasks are the correctness boundary.

## Consequences

The workspace carries two compiler implementations temporarily. CI must identify which compiler owns every check. The arrangement can be simplified only after TypeScript 7 provides a supported programmatic API and every framework tool in the compatibility matrix adopts it.
