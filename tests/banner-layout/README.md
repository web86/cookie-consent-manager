# Banner title and position acceptance

Run from the review checkout; no additional dependencies are needed.

```sh
php tests/banner-layout/php.php
node tests/release-test/local.mjs
CC_BANNER_BASE=/absolute/pinned/platform/reference node tests/banner-layout/browser.mjs
CC_UI_MODX=2 CC_UI_CASE=ui-refinement-banner2-NEW node tests/banner-layout/native.mjs
CC_UI_MODX=2 CC_UI_CASE=ui-refinement-banner2-NEW node tests/ui-refinement/native.mjs
```

Use platform 3 and a `ui-refinement-banner3-NEW` case for MODX 3. The read-only
baseline must be the matching source platform, before the banner changes.
The browser matrix covers RU/EN, Strict/Legacy, all positions, empty/short/long
titles and 1440/650/390/320 px. External SDK/player responses are controlled.
Screenshots wait for the existing opacity animation to finish. Output directories
can be selected with `CC_BANNER_OUT` and `CC_BANNER_NATIVE_OUT`.

Native tests require a NEW isolated fixture in the existing adapter-updates
Docker project, an installed candidate package, and that fixture selected by its
active symlink. They reject other fixture names. They save via the real Manager,
compare sidebar HTML, reload settings, retain existing frontend consent and check
that service data, adapters, bundle, policy and category versions do not change.
They restore the initial settings in `finally`; the fixture's initial production
test page/registry is created only in that disposable database.

Build twice with the platform's native `_build/build.php`, using separate fresh
output directories, then normalize each outer ZIP with `_build/normalize.py`.
Compare bytes and run `tests/transport/composition.py` to verify the closed
allowlist and rejection of injected test files/corrupted payloads. Use the native
installer on a NEW fixture first with the original package and then the candidate;
never overwrite an installed signature with different bytes. MODX 3 tests must
disable deprecated global aliases before installing either component version.
Do not target customer sites or alter archived fixture databases/packages.
