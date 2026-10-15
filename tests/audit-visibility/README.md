# Hidden category audit acceptance

Only the named disposable MODX 2 fixture is used. The harness clones the
repository's existing synthetic `.local/site`, `.local/private/core` and
`cookie_consent_test` database into separate `.local/audit-visibility` paths and
`cookie_consent_audit_visibility`. It never accepts a production URL/DB and
refuses to replace an unmarked directory or existing database. The existing
local MODX 2 image/database and `.local/private/compose.env` are prerequisites.

Use pinned upstream pdoTools 2.14.1 and its locked Fenom 2.12.0 dependency:

```sh
curl -fL https://codeload.github.com/modx-pro/pdoTools/zip/a7a9a3366249c6689cefba5c2b901ada43a7df79 -o .local/download/pdotools-a7a9a33.zip
unzip -q .local/download/pdotools-a7a9a33.zip -d .local/download
curl -fL https://getcomposer.org/download/2.8.12/composer.phar -o .local/download/composer.phar
php .local/download/composer.phar install --no-dev --no-plugins --no-scripts --working-dir=.local/download/pdoTools-a7a9a3366249c6689cefba5c2b901ada43a7df79/core/components/pdotools
python3 tests/audit-visibility/prepare.py
docker compose --env-file .local/private/compose.env -f tests/audit-visibility/compose.yaml up -d audit-visibility
node tests/audit-visibility/acceptance.mjs
python3 tests/audit-visibility/regression.py
```

The browser/HTTP runner provisions only this marked clone. It switches the four
changed audit runtime files between original main `44e4fef` and current source,
restarting only its own container to avoid OPcache ambiguity. Original snippets
are used; the separate Fenom JSON fix in PR #4 is not included. pdoParser uses
its upstream default detector with page parsing and compiled cache enabled.
Resources are genuinely cached; `[^s^]` proves `database` then `cache` execution.
Do not use `--remove-orphans` on the shared local Compose network.

The production selection first returns 400 with no append under original code.
Fixed requests reach the actual public wrapper, HTTP adapter, validator, limiter
and logger: ACK `event_id` is checked, then the matching record is read from the
physical current UTC monthly file with the production JSONL reader. Invalid
requests leave the file length unchanged; replay returns 409 with one record.
Vendor traffic is fulfilled locally, but audit POSTs are **not** intercepted.
No real analytics events are sent. Audit config/key and logs stay ignored and
private outside the fixture webroot; synthetic IDs appear only in evidence.

Coverage includes RU/EN standard MODX and Fenom split/legacy pages cold/warm,
all eight visibility combinations with enabled analytics/marketing/Maps
services, original options without explicit categories, schema 1, hidden and
missing grants, disabled/unknown providers, malformed/extra fields, origin,
replay, stale resource cache and conflicting context configuration. Unit tests
exhaust every combination of three category flags and four enabled provider
permissions for `accept_all`, `accept` and `save_settings` across all eight
visibility masks. Malformed trusted configuration fails closed.

`regression.py` runs the new PHP matrix plus ten existing PHP regression suites,
and lints all PHP/JS sources. Evidence is under
`.local/audit-visibility/evidence/{results,regression}.json`. Full findings:
`docs/modx2-audit-visibility-acceptance.md`.

Production/Safari acceptance, the affected site's clone/settings, PHP 8.1
specifically, native transport install/upgrade and the historical full Manager
matrix are NOT RUN. This verifies genuine MODX 2.8.8 / PHP 8.2 source execution,
not a deployment or package upgrade. No main merge, deployment or transport ZIP
publication is performed.
