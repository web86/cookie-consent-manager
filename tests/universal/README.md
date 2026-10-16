# MODX 2 universal services acceptance

Current model: visitors choose only three categories. New storage `categories_v2` and audit schema 3 contain no individual provider permissions. Legacy fingerprints/provider fixtures are used only to test one-time conservative migration and historical audit compatibility.

Use the named local disposable MODX 2 fixtures only. All vendor traffic in current browser suites is aborted or fulfilled locally. Do not run the historical published-container GTM probe as part of this suite.

```sh
npm run test:universal
php tests/universal/php.php
php tests/universal/audit-schema3.php
php tests/audit-visibility/php.php
python3 tests/fenom/regression.py
```

Browser suites share the main disposable database and must run sequentially. Manager UX also uses the clean native fixture: do not reset or run native lifecycle tests concurrently with this runner. `regression.mjs` accepts a list of paths to repeat only affected suites. It writes logs to ignored `.local/universal-evidence/regression`. Test helpers restore their settings; native Save is used whenever category composition/versioning is under test.

- `browser.mjs`: actual RU/EN Manager, creation/moving/removal, Save/reopen, preview isolation, validation, version increments, SDK launch/processing separation, custom JS/revocation, maps and texts.
- `matrix.mjs`: every supported public adapter in every category; no request before consent/rejection, all enabled members start, disabled stays blocked, no duplicate startup, extraneous provider fields do not gate execution.
- `audit.mjs`: exact Moscow conversion, unchanged UTC details, invalid/fractional timestamps, RU/EN and browser timezone independence.
- `php.php`: server registry/category/path/text/default/fallback and new audit contracts.
- `audit-schema3.php`: mixed historical/new append-only JSONL, no individual permissions, original UTC CSV.
- `set-registry.php`: CLI-only native Save mutation helper restricted to `cookie_consent_test`.

Native lifecycle requires clean fixtures and the built ZIP. Never run resets against other databases:

```sh
node _build/transport.mjs /var/www/html /opt/cc-artifacts/<new-build-directory>
# Copy output from the disposable build container into .local/artifacts, then:
python3 _build/normalize.py .local/artifacts/cookieconsent-1.0.4-beta2.transport.zip
python3 tests/transport/reset.py clean publiccore
CC_EVIDENCE_DIR=.local/universal-evidence/native node tests/beta33/native.mjs
node tests/public-registry/browser.mjs
```

The last command installs actual stable 1.0.0 and current transport on the disposable main site, verifies reversible browser migration and retained DB/log data, then restores its settings. It does not access customer websites. See the committed acceptance report for exact final artifact SHA and results.
