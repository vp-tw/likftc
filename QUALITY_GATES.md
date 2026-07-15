# Quality Gates

No risk is marked reduced until its gate has current evidence. Local and CI commands must be bounded, serial where they share caches, and responsible for terminating child processes.

## Fast pull-request gate

1. Frozen, policy-checked pnpm install on Node 24.18.0.
2. Oxfmt check and syntax-aware Oxlint without `tsgolint`.
3. Explicit TypeScript 7 and TypeScript 6 source checks.
4. Framework-native type checks for changed packages.
5. Core unit, property, type, and adapter contract tests.
6. Chromium browser identity tests for changed adapters.
7. Package build, export validation, full packed-tarball size budget, packed consumer install, and Node import smoke test; the experimental Qwik adapter substitutes optimizer build and browser execution for direct Node import.
8. Serial Astro sync/check/build.
9. Axe at 320/1440, reduced-motion interaction at 320, and overflow checks at 320/375/768/1024/1440/1920 across home and every framework guide.
10. Child-process teardown audit.

## Merge gate

1. All fast gates for every package.
2. Isolated minimum-version tarball fixture and current framework browser conformance suite.
3. Chromium, Firefox, and WebKit browser matrix.
4. Full 320, 375, 768, 1024, 1440, and 1920 viewport matrix.
5. Portrait, landscape, 200% zoom, long code, and long lifecycle-log cases.
6. Deterministic visual snapshots at settled or explicitly frozen states.
7. Bundle-size, dependency-count, and page network budgets.
8. Starlight link, search, CSP, and production preview smoke tests.

## Release gate

1. Changesets fixed-group dry run with coordinated package versions.
2. `publint`, Are the Types Wrong, and packed-tarball fixtures for every package.
3. Node 22.22.3 and 24.18.0 import and consumer checks.
4. Public API and migration review.
5. License, provenance, npm ownership, trusted-publishing, and secret-scope audit.
6. Alpha installation in an external fixture before beta; beta installation before stable.
7. No unresolved Critical or High risk in `RISK_REGISTER.md`.

## Timeouts and resource limits

- Workspace-wide compiler and build tasks run with Vite Task's concurrency limit set to one. Browser tests use one worker.
- Astro sync/check/build share one serial lane.
- Browser tests use a bounded worker count and close every context and browser in teardown.
- CI job and command timeouts are explicit; a timeout fails the gate.
- Teardown audits fail when `tsgolint`, browser, dev-server, compiler, or package-manager child processes remain.
- Timing retries may recover environmental startup only; assertions may not retry animation correctness.

## Evidence artifacts

- Machine-readable test reports and coverage.
- Packed tarballs and package-validation reports.
- Browser traces only on failure or first retry.
- Visual diff artifacts.
- Accessibility and responsive audit reports.
- Size and dependency-budget reports.
- Release dry-run manifest with versions, integrity, exports, and provenance status.
