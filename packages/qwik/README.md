# `@vp-tw/likftc-qwik`

Experimental Qwik 2 adapter for Likftc list transition identities.

```tsx
const entries = useLikftc(items, { getId: (item) => item.id });
```

Qwik 2 is currently in beta. Pin the exact peer version shown in this package until Qwik 2 reaches a stable release.

This package is optimizer-only and supports CSR builds. Qwik 2 beta's runtime ESM reads optimizer compile-time globals during direct Node evaluation, so bare Node imports, SSR, and hydration are not supported. Use the Qwik Vite optimizer for every application build.

The adapter source is checked with the repository's strict TypeScript 6 and TypeScript 7 settings. `skipLibCheck` is scoped to this package because Qwik 2 beta's SVG JSX declarations currently fail semantic checking in both compilers.
