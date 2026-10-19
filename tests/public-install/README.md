# MODX 3 first public native acceptance

Scope: new `cookieconsentmanager3-1.0.8-pl5` installs. No historical package,
migration, third-party-extra transport or compatibility layer is involved.
User explicitly limited publication GO to the new native scope; Fenom/pdoTools3
3.1.0 warm-cache and real external video-playback limitations remain documented.

Fixtures are under `.local/modx3-first-public/`, with independent MariaDB 11.8
containers/volumes, site trees and loopback ports 23120–23123. Existing paths,
outputs and nonempty setup state are refused. Official complete MODX 3.1.2 and
3.2.4 trees are reused from `.local/modx3-matrix/download/`; no Composer update.
Docker images: `cookie-consent-modx3-php81:local`,
`cookie-consent-matrix-php82:local`. Confirm explicit 10.220.20–23.0/24 networks
are unused before creating the projects. Source mount is read-only.

```sh
node _build/version.mjs --check
node _build/user-guide.mjs --check
node _build/frontend.mjs
python3 tests/public-install/prepare.py
python3 tests/public-install/driver.py setup
python3 tests/public-install/build.py
node tests/public-install/contracts.mjs
node tests/public-install/browser.mjs
node tests/public-install/adapters.mjs
python3 tests/public-install/php.py
python3 tests/public-install/check-requirements.py
python3 tests/public-install/check-syntax.py
CC_VIDEO_BUNDLE=.local/modx3-first-public/unit-php82/adapter-cache/production.js node tests/video-embeds/browser.mjs
CC_VIDEO_BUNDLE=.local/modx3-first-public/unit-php82/adapter-cache/production.js node tests/placeholder-texts/browser.mjs
python3 tests/public-install/diagnostics.py
python3 tests/public-install/export.py
python3 tests/public-install/driver.py stop
```

Redirect the two JS suites to `video-php.log` and `placeholder-php.log` in the
fixture root for export. `browser.mjs`/`adapters.mjs` accept a single case name;
independent cases may run concurrently. Keep per-case evidence authoritative.
Deprecated aliases are disabled before package installation. The same ZIP is
installed on all four sites and two independent native builds must match.

The recorded campaign preserved initial test-format failures. Empty PHP arrays
serialize as `[]`, and Composer pretty versions may start with `v`. Native
installation completed before the second mistaken expectation. The flag
`CC_PUBLIC_CONTINUE=1` was used only to continue those installations: it verifies
the single expected package record and immutable archive before proceeding, and
links the original attempt in `fresh_install_proof`. It never resets databases
or claims a second fresh install. A new normal campaign does not need this flag.

Raw settings, credentials, logs and CMS setup remain ignored. Export contains
counts, signatures, source hashes and sanitized test results. External SDK/iframe
traffic is fulfilled locally; real audit ACK bytes reach the actual backend and
are correlated with physical JSONL. No external publication or deployment occurs.
