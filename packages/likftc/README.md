# `@vp-tw/likftc`

Fresh transition keys for list items that leave and return.

The root export provides the framework-neutral reconciliation API. Framework adapters are available
through `@vp-tw/likftc/react`, `/octane`, `/preact`, `/vue`, `/svelte`, `/solid`, `/angular`, `/web`, and `/qwik`.

Install this package with the framework runtime used by the application. Framework runtimes are optional
peers and remain external to the package output.

The framework-neutral core and stable adapter APIs follow semantic versioning starting with v1.

The Octane adapter is experimental and was tested with `octane@0.1.17` plus `@octanejs/vite-plugin@0.1.17`. Octane itself is alpha; other versions are use-at-your-own-risk, and verified combinations are welcome as issues or PRs.

The Qwik adapter is experimental, optimizer-only, and was tested with
`@qwik.dev/core@2.0.0-beta.41` while Qwik 2 remains in beta. Other versions are
use-at-your-own-risk, and verified combinations are welcome as issues or PRs.
