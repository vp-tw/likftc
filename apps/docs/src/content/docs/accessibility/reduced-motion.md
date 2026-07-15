---
title: Reduced motion
description: Preserve the lesson while respecting motion preferences.
---

Animation is the subject of Likftc's demos, so playback starts automatically when the operating system allows motion. Manual controls keep the identity lesson available without continuous motion.

The documentation defaults to the operating system's `prefers-reduced-motion` setting:

- Demos start playback on page load only when `prefers-reduced-motion` is not active.
- Manual **Next frame**, **Previous frame**, and **Reset** controls always work.
- **Play loop** is available only when motion is enabled. **Pause loop** stops at the current frame, and playback also stops when the document is hidden.
- Reduced mode removes spatial transitions but keeps identity keys, actual DOM-instance labels, presence phases, and frame diagnostics visible.
- Full motion is an explicit, per-demo override. It never changes the system preference.
- Status changes are announced through a polite live region without reading every animated item.

When implementing your own animation, treat reduced motion as a different presentation of the same state machine—not as a request to remove controls or hide instructional state.
