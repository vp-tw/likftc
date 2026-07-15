# ADR 0002: Isolate Compiler and Astro Tasks

- Status: Accepted for the rewrite baseline
- Date: 2026-07-13

## Context

The compatibility spike reproduced two process risks:

- Vite+ 0.2.4 type-aware checking left `tsgolint` processes running under the dual-TypeScript alias layout.
- Concurrent `astro check` and `astro build` commands raced while renaming Vite's shared dependency cache.

## Decision

- Vite+ owns formatting, syntax-aware Oxlint, Vitest, packaging, and task orchestration.
- Explicit TypeScript 7, TypeScript 6, and framework-native commands own type correctness.
- `astro sync`, `astro check`, and `astro build` run serially against one workspace installation.
- CI tasks have explicit timeouts and teardown audits for compiler and browser child processes.
- Local full checks use bounded concurrency and never launch duplicate workspace-wide compiler tasks.

## Consequences

The fastest possible unified `vp check` path is intentionally not used. The selected workflow is more observable and prevents one experimental integration from exhausting a developer machine or CI runner.
