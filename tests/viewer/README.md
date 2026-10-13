# Local Consent Audit Viewer acceptance

Use only the repository's disposable local MODX 2.8.8 fixtures. Native install the current immutable package (`_build/package.json`) before browser tests. Never point the seed/user helpers at a customer site.

```sh
node tests/viewer/browser.mjs
node tests/viewer/file-manager.mjs
node tests/viewer/file-manager-ui.mjs
node tests/viewer/large-http.mjs
```

PHP suites run inside the acceptance `web` container as `www-data`:

```sh
docker compose --env-file .local/private/compose.env -f tests/local/compose.yaml \
  exec -T --user www-data web php /opt/cc-source/tests/viewer/php.php
docker compose --env-file .local/private/compose.env -f tests/local/compose.yaml \
  exec -T --user www-data web php -d memory_limit=32M /opt/cc-source/tests/viewer/large.php
```

`large.php` creates and retains one explicit million-row synthetic fixture at `.local/private/viewer-million/`; the Reader does not create a copy or index. It performs two count/page scans and a full CSV stream to `/dev/null`, checks count/memory/source SHA, and preserves the fixture for the actual HTTP list test. HTTP tests use the same setting as writer tests, so run them sequentially with existing browser/HTTP suites. All browser helpers restore the prior log_dir/language in `finally`; old synthetic fixture versions are archived before seeding.

`browser.mjs` covers both formats/schemas, defaults, Find-only requests, exact totals, 50-row cursor pages, details/history, safe unknown event/XSS, CSV all matches/formula injection/quotes/newlines, direct HTTP ACL/traversal, read-only roles and RU/EN screenshots. File Manager tests create a headed log through the existing audit endpoint, inspect MIME, read via native processor and open the real editor without saving. `large-http.mjs` checks exact million total and a bounded 50-summary response.

Evidence lives under ignored `.local/viewer-evidence/`; explicit CSV downloads are synthetic acceptance artifacts, not hidden component PII copies. Permission fixtures use dedicated `cc-viewer-*` accounts/policies and do not alter existing customer roles.
