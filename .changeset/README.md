# Changesets

Every user-visible package change requires a changeset. The stable `@vp-tw/likftc` package and experimental `@vp-tw/likftc-qwik` package release in one fixed version group so their compatible versions cannot drift.

Do not run `changeset publish` from a developer machine. Release publishing uses reviewed CI trusted publishing after package and provenance gates pass.
