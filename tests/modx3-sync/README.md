# MODX 3 parity with MODX 2 1.0.6

Start from `modx3` at `1fd6872`; source contract is immutable `db0a722`.
The isolated compose project `cookie-consent-modx3-sync106` uses ports 20888–20892,
a separate database volume and `.local/modx3/`. Keep all preexisting fixtures and
artifacts. Setup prepares official MODX 3.2.4 with deprecated aliases off.

Baseline: install immutable beta3 on web/clean and beta2 on fresh; pdoTools 3.1.0
is installed through native Package Management. Existing PHP, browser, regression
and cold/warm suites run before source changes. Retain `evidence/baseline/`.
`pristine` is a separate genuinely unused fixture for beta4 clean installation.

Build twice with the existing `_build/build.php` through PHP8.1 `compose run`,
normalize both with `_build/normalize.py`, native-verify both, and compare archives
and inventories. Tests expect `.local/modx3/artifacts/sync106-a/` and `sync106-b/`.
Never overwrite a ZIP or install different bytes under an existing signature.

Run:

```sh
node tests/modx3-sync/local.mjs
node tests/modx3-sync/php.mjs
node tests/modx3-sync/bundle-php.mjs
python3 tests/modx3-sync/composition.py .local/modx3/artifacts/sync106-a/cookieconsent3-0.1.0-beta4.transport.zip
node tests/modx3-sync/native.mjs
node tests/modx3-sync/embeds.mjs
CC3_EMBED_SERVICE=php82 node tests/modx3-sync/embeds.mjs
node tests/modx3-sync/web.mjs
```

Native suites mutate settings/resources only on explicitly guarded disposable
fixtures; runtime comes from actual native ZIPs. Native `native.mjs` is a one-time
genuine upgrade/clean-install test, not a reset/reinstall mislabeled as upgrade.
Web suites run sequentially because they share one database. Run embeds serially
on clean/PHP8.2 (they share a database), separately from web/pristine operations.
The PHP8.2 fixture has OPcache revalidation set to zero, like PHP8.1. Its audit
origin is changed temporarily to its actual port and restored afterward.

Existing assertions are retained. Shared source assertions change provider-level
consent expectations only where 1.0.6 explicitly changes the contract to category
consent; old baseline results remain separately recorded. SDK fixture keeps its
original eight services; all video adapters have their own full matrices.
No failing warm Fenom result is changed to PASS/SKIP. Real playback is independent:
`node tests/video-embeds/real-playback.mjs`; an HTTP 200 iframe is insufficient.

The final documentation/changelog artifact is built into `sync106-final-a` and
`sync106-final-b`. Preserve earlier candidate installations. Prepare unused final
fixtures with `python3 tests/modx3-sync/prepare-final.py` (setup starts only the
primary services). Then run:

```sh
CC3_NATIVE_FINAL=1 CC3_FINAL_FOLDER=.local/modx3/artifacts/sync106-final-a node tests/modx3-sync/native.mjs
node tests/modx3-sync/final-diff.mjs
node tests/modx3-sync/uninstall.mjs
node tests/modx3-sync/guide-final.mjs
node tests/modx3-sync/php-differential.mjs
```

`final-diff` requires identical executable elements and 230 identical runtime
files; only generated guide text differs from the fully tested earlier candidate.
The final exact archive gets genuine beta2/beta3 upgrade, reinstall, fresh install,
uninstall/reinstall and desktop/mobile RU/EN guide checks on new fixtures.
Real SDK differential can retain transient vendor bootstrap differences: keep the
first-failure evidence even if a repeat passes; never remove processing requests
from assertions to manufacture a pass.
