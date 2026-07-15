# Likftc Design System

## Direction

Likftc is precise, kinetic, and crafted. The site should feel like a technical instrument for inspecting identity, not a generic developer landing page. Motion explains lifecycle behavior; it is never a decorative page-wide effect.

## Typography

- Display and interface: self-hosted Bricolage Grotesque Variable.
- Code and diagnostics: self-hosted JetBrains Mono Variable.
- System sans-serif fallbacks remain available for unsupported glyphs and CJK text.
- Headlines use compact line-height and deliberate line breaks. Body copy keeps a readable measure rather than filling wide screens.

## Color

- Paper and ink establish the main reading surface.
- Acid yellow marks active identity and focus.
- Electric blue marks stable, retained identity.
- Coral marks exit, reset, and destructive lifecycle events.
- Meaning is always repeated with text, shape, or position; color is not the only signal.
- Solid color fields and borders are preferred over decorative gradients, glass effects, and excessive shadows.

## Composition

- Use an editorial grid with visible alignment and asymmetric emphasis.
- Keep documentation navigation familiar through Starlight's accessible frame.
- Avoid repeated floating cards. Group content through rules, spacing, and hierarchy.
- Comparison demos stay side by side when space permits and stack in source order on narrow screens.
- Framework demos render inline in the documentation flow. Their open Shadow DOM isolates runtime styles without introducing a nested viewport or scrollbar.

## Motion

- The system preference is the default for every demo.
- Demos start loop playback on page load when motion is enabled. The readable default is a 1,000 ms state interval with 3,000 ms FLIP, enter, and exit motion. Inline range controls can tune both values without changing the three-row viewport. The four-frame A/B/C → D/A/B → C/D/A → B/C/D loop moves active rows downward; only incorrect DOM reuse moves a returning row upward. Exiting rows leave layout flow immediately, so interrupted movement exposes incorrect DOM reuse without changing layout height.
- Reduced mode disables loop playback and spatial transitions while preserving state updates, generated keys, DOM-instance labels, event logs, reset, and manual frame stepping.
- Full motion may be enabled per demo only and must be labeled as an override.
- Animation checkpoints used by tests are deterministic and never depend on an arbitrary sleep.

## Responsive and accessibility constraints

- Target WCAG 2.2 AA.
- Controls have a minimum 44 by 44 CSS-pixel target; primary demo controls use 48 pixels.
- Visible focus must remain distinct in both themes.
- No horizontal page overflow at 320, 375, 768, 1024, 1440, or 1920 CSS pixels.
- Code regions scroll internally without expanding the page.
- The page retains one logical `h1`, a working skip link, keyboard navigation, and useful live-region announcements.
- Demos remain understandable at 200% zoom and without animation.

## Anti-patterns

Do not use gradient text, glass panels, oversized rounded containers, repetitive icon-card grids, decorative terminals, tiny uppercase labels, generic hero blobs, or uniform reveal animations. Do not hide the untreated example on mobile; the comparison is the teaching surface.
