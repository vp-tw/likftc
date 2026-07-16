# `@vp-tw/likftc`

Fresh transition keys for list items that leave and return.

The root export provides the framework-neutral reconciliation API. Framework adapters are available
through `@vp-tw/likftc/react`, `/preact`, `/vue`, `/svelte`, `/solid`, `/angular`, `/web`, and `/qwik`.

Install this package with the framework runtime used by the application. Framework runtimes are optional
peers and remain external to the package output.

The public API is experimental until the v1 release candidate.

The Qwik adapter is experimental, optimizer-only, and requires the exact optional
`@qwik.dev/core@2.0.0-beta.36` peer while Qwik 2 remains in beta.
