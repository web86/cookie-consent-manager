# Custom JS data-* regression

Run in each MODX branch:

```sh
php tests/custom-js-attributes/php.php
node tests/custom-js-attributes/browser.mjs
node tests/modstore/local.mjs
node tests/video-embeds/differential.mjs
```

The PHP suite covers canonical validation, object/array identity, duplicate raw
JSON members (including escaped spellings and long strings), byte limits,
public serialization, processor input and category composition comparisons.
The isolated Chromium suite serves the production bundle and
`tests/fixtures/custom-js-attributes.js` entirely through local responses. The
fixture reads `document.currentScript` at execution time. No Ahrefs account,
analytics SDK or external request is used.

Native Manager/API/consent checks use a **disposable** Modstore fixture, following
`tests/button-translations/README.md`. Mount this branch at `/opt/cc-source` and
use an independent database, site, Compose project, case directory and output
directory. Build, normalize and verify the candidate using the existing build
scripts. Never overwrite an existing ZIP or point these tests at a user site.

```sh
node tests/custom-js-attributes/native.mjs CASE_DIR CONTAINER_CANDIDATE_ZIP
```

This installs/reinstalls the candidate, seeds fixture settings, drives the real
Manager, tests authenticated API rejection, checks installed file hashes and
the MODX-generated production bundle, and saves screenshots/results under
`CASE_DIR/evidence/custom-js-attributes/`. Manager core's Gravatar/MODX requests
are intercepted and recorded; no external response is allowed through.

For the previous transport upgrade check, use a **separate fresh fixture** with
no candidate already installed. Downgrade is outside this test's scope.

```sh
node tests/custom-js-attributes/upgrade.mjs FRESH_CASE_DIR CONTAINER_CANDIDATE_ZIP CONTAINER_PREVIOUS_ZIP
```

The upgrade test obtains consent with the actual previous package, installs the
candidate and checks exact settings bytes, raw stored consent, fingerprints,
absence of a repeat banner and one execution of each permitted local script.
Script order is intentionally ignored because the existing runtime uses async.
The native suite separately tests category-version changes through the real
save processor, including attribute addition/edit/removal, order-only updates,
empty attributes, unrelated categories and repeated apply calls.

Windows hotfix integration requires a separate combined regression after merge;
these tests do not claim Windows/PHP JIT coverage.
