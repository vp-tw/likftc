# RFC 0002: Self-contained CSR Demo Contract

- Status: Accepted
- Target: Likftc 1.0 documentation
- Scope: Starlight framework guides and production inline demo modules

## Decision

Every supported framework is built as a production CSR entry with a stable ES module and a direct debugging page. A guide loads exactly one route-specific module into an inline host and does not control its runtime state.

The inline demo owns:

- the untreated and Likftc-backed panes;
- previous, next, play or pause loop, and reset controls;
- `System`, `Reduced`, and `Full` motion modes;
- the deterministic frame sequence;
- DOM-instance, presence-collision, and transition-key diagnostics.

All demos share scenario data, controls, diagnostics, presentation, and Shadow DOM mounting through the private `apps/demos` workspace. Each framework entry point implements only its native rendering and ownership behavior.

A private FLIP layer measures keyed rows before and after each frame update and uses the Web Animations API to visualize retained movement and fresh entry. It teaches the identity contract but is not exported as adapter API. The readable default updates state every 1,000 ms while moves and exits last 3,000 ms. Range controls expose both values while preserving the original demo's deliberately interrupted timing.

The active list always owns exactly three layout rows. An exiting DOM is retained as an absolutely positioned overlay in its previous grid slot, so it can finish independently without occupying a fourth row or changing panel height.

## Inline isolation

The shared shell attaches an open Shadow DOM to the inline host, injects its styles into that root, and passes an ordinary `HTMLElement` target to the framework adapter. Runtime CSS cannot affect Starlight, while the demo participates in the document's natural height and uses the page's only vertical scrollbar.

The previous iframe design isolated CSS but introduced a nested viewport, fixed-height clipping, and a second scrollbar. Auto-resizing would have retained a cross-document lifecycle solely to solve a layout problem created by that boundary. Inline Shadow DOM provides the required isolation without messaging or resize coordination.

The guide and demo therefore exchange no application messages. A future multi-runtime comparison would require an explicit ownership and performance design before implementation.

## Deployment model

Vite builds stable framework modules and standalone debugging pages:

```text
/demos/react.js                 /demos/react/index.html
/demos/preact.js               /demos/preact/index.html
/demos/vue.js                  /demos/vue/index.html
/demos/svelte.js               /demos/svelte/index.html
/demos/solid.js                /demos/solid/index.html
/demos/angular.js              /demos/angular/index.html
/demos/web.js                  /demos/web/index.html
```

The output is copied into the Starlight public tree and deployed under the same origin. Demos accept no external HTML, credentials, code, or user-controlled script URLs.

## Deterministic evidence

Animation completion is not correctness evidence. Manual controls advance the shared four-frame sequence without relying on animation completion:

1. Render A, B, and C.
2. Update to D, A, and B after the selected state interval; C exits outside layout flow.
3. Update to C, D, and A after another interval; C returns while its longer exit is still running.
4. Update to B, C, and D; then loop to A, B, and C while prior exits and FLIP transforms remain active.

Every state update removes the last item, shifts the two retained items downward, and adds one item at the top. Correct motion therefore has one visual direction. The untreated pane's reused exiting DOM starts from its old bottom slot and moves upward to the returning top slot, making the identity error visible as an opposite-direction movement.

Each row exposes its logical or transition key, actual DOM instance, layout slot, and visual-presence phase. Browser tests assert that the untreated pane reuses and moves each old DOM on re-entry. In the first corrected collision, old C remains on `k:2` while a different DOM instance enters on `k:4`; later collisions continue allocating fresh keys without changing the three-row layout.

`Play loop` starts automatically when the active motion preference permits animation and advances at the selected state interval. Each new First/Last measurement interrupts the previous transform from its current visual position. `Pause loop` stops at the current frame, playback stops when the document becomes hidden, and timing changes apply to the next frame.

## Motion policy

- `System` follows `prefers-reduced-motion`.
- `Reduced` applies state changes with `0s` transition duration.
- `Full` explicitly overrides the system preference for that demo only.
- Entering reduced motion cancels active Web Animations API animations.
- Demos start loop playback on page load when the active motion preference allows animation.
- Reduced motion disables loop playback; manual stepping and diagnostics remain available.
- Reset remounts the runtime and returns to the initial frame.

## Responsive and accessibility contract

- Wide layouts show both panes side by side; narrow layouts stack them in document order.
- Controls have at least 44 by 44 CSS-pixel targets.
- Every inline demo has a framework-specific accessible label.
- Status updates use one polite live region.
- Identity is communicated with text and keys, not color alone.
- Keyboard operation, axe checks, and document-level overflow checks must pass.

## Performance contract

- A framework guide loads only its selected framework module.
- A guide loads only its selected framework runtime.
- Browser checks enforce a 350 kB transfer budget per demo, with a 1.3 MB exception for Angular.
- Fonts are self-hosted and limited to the Latin variable-font files used by the demos.

## Acceptance gates

1. Every production framework demo renders three corrected rows on the initial frame.
2. Three consecutive same-ID re-entries move each untreated exiting DOM while the corrected pane keeps distinct old and new DOM instances.
3. At a collision, full motion reuses the untreated exiting DOM, cancels its stale exit state, and moves that same DOM with FLIP; system-reduced and explicit reduced motion create no animations, disable the loop, and cancel active animations.
4. Timing controls expose a 250–1,200 ms state interval and an 800–3,200 ms shared motion duration. Defaults are 1,000 ms and 3,000 ms, and the UI warns when motion no longer outlasts the state interval.
5. Every frame contains three in-flow rows per pane, retained exits are absolute overlays, and list height is invariant across the loop.
6. Framework guides contain no iframe, and the inline host has no independent horizontal or vertical overflow.
7. All six responsive widths have no document-level horizontal overflow.
8. Home and framework guides pass axe without ignored rules.
9. Browser console warnings, errors, failed resources, and transfer-budget violations fail validation.
