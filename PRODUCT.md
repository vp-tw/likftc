# Product

## Register

brand

## Users

Likftc serves frontend application developers and library authors across React, Vue, Svelte, Solid, Preact, Angular, Web Components, and experimental Qwik 2 support. These users need to build, teach, or maintain list animations where items can enter, exit, move, and re-enter before earlier transitions finish.

Their primary job is to preserve correct element identity throughout a list animation lifecycle without coupling application data identifiers to framework-specific transition behavior. They should be able to understand the problem, compare untreated and corrected behavior, install the relevant adapter, and verify the result in a few minutes.

## Product Purpose

Likftc is a framework-neutral list animation identity and lifecycle solution. It assigns stable transition identities while items are present, retires those identities when items leave, and issues fresh identities when the same logical item re-enters. Thin framework adapters expose that behavior through native conventions.

Version 1 focuses on client-side rendering. SSR rendering and hydration semantics are outside the supported scope, while every package must remain safe to import in a server process.

Success means every supported framework provides the same documented semantics, a runnable before-and-after demo, public integration code, and a tested migration path. The documentation should make identity reuse and lifecycle conflicts observable, not merely describe them.

## Brand Personality

Precise, kinetic, and crafted. The brand should feel technically rigorous and visibly designed, with distinctive typography and motion that explains the product rather than decorating it.

## Anti-references

Avoid generic AI-generated developer-tool aesthetics: cream SaaS templates, gradient text, decorative glass panels, oversized rounded cards, repetitive icon-card grids, tiny uppercase section labels, arbitrary terminal styling, generic editorial layouts, and motion applied uniformly without instructional purpose.

Do not make the documentation look like an unmodified theme. Astro Starlight provides the documentation foundation, while Likftc owns the visual identity, examples, and interaction model.

## Design Principles

1. Make identity visible. Show generated keys, actual DOM instances, overlapping exit and re-entry presences, frame changes, and state diagnostics so the underlying problem can be understood directly.
2. Compare before teaching. Every framework guide should place untreated and corrected behavior under the same controls, data, timing, and viewport.
3. Share semantics, respect frameworks. Keep one core lifecycle contract while exposing idiomatic APIs for each framework.
4. Let motion carry information. Animation demonstrates ordering, interruption, and identity reuse; decorative motion must not compete with those signals.
5. Design beyond the theme. Typography, composition, examples, and responsive behavior should form a recognizable Likftc identity without compromising documentation usability.

## Accessibility & Inclusion

Target WCAG 2.2 AA. Support keyboard navigation, visible focus, sufficient contrast, color-independent meaning, screen readers, touch input, zoom, and responsive layouts across narrow mobile screens, tablets, laptops, and wide desktops.

Respect `prefers-reduced-motion` by default. Animation demos start continuous playback on page load only when the operating system allows motion, and must remain educational in reduced-motion mode through manual frame controls, persistent identity labels, generated-key inspection, and presence-collision diagnostics. Disable continuous playback for users requesting reduced motion unless they explicitly enable full motion for that individual demo without changing their system or site-wide preference.
