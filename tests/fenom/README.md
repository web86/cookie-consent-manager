# MODX 2 / pdoTools / Fenom regression

This suite uses genuine MODX 2.8.8, upstream pdoTools 2.14.1 at
`a7a9a3366249c6689cefba5c2b901ada43a7df79`, and its locked Fenom 2.12.0.
It clones only the existing **disposable** `cookie_consent_test` database/site
into `cookie_consent_fenom`, with separate site/private/cache paths and port
18988. It never accepts a customer URL or connects to production. The existing
MODX 2 Docker database/image and ignored `.local/site`, `.local/private` are
prerequisites; do not substitute a customer database. MODX 3 fixtures are separate.

Prepare the pinned upstream dependency under ignored local paths:

```sh
curl -fL https://codeload.github.com/modx-pro/pdoTools/zip/a7a9a3366249c6689cefba5c2b901ada43a7df79 -o .local/download/pdotools-a7a9a33.zip
unzip -q .local/download/pdotools-a7a9a33.zip -d .local/download
curl -fL https://getcomposer.org/download/2.8.12/composer.phar -o .local/download/composer.phar
php .local/download/composer.phar install --no-dev --no-plugins --no-scripts --working-dir=.local/download/pdoTools-a7a9a3366249c6689cefba5c2b901ada43a7df79/core/components/pdotools
python3 tests/fenom/prepare.py
docker compose --env-file .local/private/compose.env -f tests/fenom/compose.yaml up -d fenom
node tests/fenom/acceptance.mjs
python3 tests/fenom/regression.py
```

`prepare.py` refuses to overwrite an unmarked directory or an existing database.
Marked fixtures can be reused; `acceptance.mjs` resets only their synthetic
snippets/settings/templates/resources/cache. Never use `--remove-orphans` on
this shared local Compose network. If interrupted during the initial clone,
inspect the partial fixture manually; preparation deliberately does not drop a
DB to recover. No transport ZIP is built or installed by this suite. Component
source snippets are provisioned directly in this dedicated acceptance DB.

The original Assets snippet comes from main commit `44e4fef`. The runner first
proves a cold/warm empty HTTP 200 response and the exact Fenom error at line 999
with `pdotools_fenom_syntax=#\{#`. This supported setting makes pdoTools detect
all brace expressions and exposes its subsequent parsing of JSON returned by
the snippet. It then confirms that the original simple split page **passes**
with upstream's default detector. This does not assert that the affected
production site used this setting; its configuration is unavailable.

Fixed tests cover actual RU/EN contexts, default/full brace detection, built-in
modParser split templates, pdoParser/Fenom split and legacy templates, actual
`database` → `cache` response markers, exact tag counts/head placement and
content hashes, literal template delimiters, unchanged registry/fingerprints,
a returning visitor's original consent restored in a separate browser context,
reject/reopen/analytics/Maps grants and reload, invalid server/client JSON, and
new MODX/Fenom log errors. Fresh browser contexts have no inherited consent;
returning contexts use isolated saved browser storage from the original legacy
integration. All external requests are fulfilled locally or aborted. Analytics
SDKs, maps and audit POSTs are intercepted; no vendor events are transmitted.

`native.php` checks real MODX registration, deduplication, legacy repeated calls,
unchanged saved settings and safe JSON escaping. `regression.py` runs 11 existing
PHP suites plus that native suite, and lints every source PHP/JS file. Evidence
is saved under `.local/fenom/evidence/`, including ignored synthetic persisted
browser profiles. The release report is `docs/modx2-fenom-acceptance.md`.

Affected-site / production HTTP, authenticated logs, actual hosting behavior,
transport installation/upgrade, and PHP 8.1 specifically are **NOT RUN** here.
No production URL, access or configuration was provided. Tests ran on PHP 8.2.
