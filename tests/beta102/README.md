# 1.0.2-beta1 combined transport acceptance

Only repository-owned disposable MODX 2 fixtures are supported. Keep the
published 1.0.0 archive immutable. No customer URLs, production changes or
source-file replacement are used during native package acceptance.

1. Run the preserved `tests/fenom` and `tests/audit-visibility` source suites
   against the combined branch (each README describes its separate fixture).
2. Reset **only** `clean` and `publiccore` using
   `python3 tests/transport/reset.py clean publiccore`. This archives their prior
   files. Existing main fixture `web` is used as a configured upgrade target.
3. Provision the unmodified pinned pdoTools dependency from the source-suite
   README into the clean/private and publiccore/public core component paths.
   Do not copy Cookie Consent runtime or canonical element sources.
4. Commit the combined runtime and beta metadata. Build in two new output paths:

```sh
docker compose --env-file .local/private/compose.env -f tests/local/compose.yaml -f tests/transport/compose.yaml -f tests/beta102/compose.yaml run --rm --no-deps beta-builder php /opt/cc-source/_build/build.php /var/www/html /opt/cc-beta/build-a
python3 _build/normalize.py .local/beta102/build-a/cookieconsent-1.0.2-beta1.transport.zip
docker compose --env-file .local/private/compose.env -f tests/local/compose.yaml -f tests/transport/compose.yaml -f tests/beta102/compose.yaml run --rm --no-deps beta-builder php /opt/cc-source/_build/verify.php /opt/cc-beta/build-a/cookieconsent-1.0.2-beta1.transport.zip /opt/cc-clean/core
# Repeat in build-b and compare archive SHA256 and both inventories.
```

5. Start optional PHP 8.1 server using the existing local PHP 8.1 image, sharing
   only the clean fixture, and run tests sequentially against it:

```sh
docker compose --env-file .local/private/compose.env -f tests/local/compose.yaml -f tests/transport/compose.yaml -f tests/beta102/compose.yaml up -d beta81
CC_BETA_PHP81=1 node tests/beta102/native.mjs
```

The native runner uploads the **actual ZIP** and calls authentic MODX Manager
Package Manager processors with authenticated sessions. It tests fresh beta,
published stable 1.0.0 → configured beta upgrade, reinstall and an existing
configured main installation. Every installed runtime file hash and five
DB-stored canonical source hashes must match the native source inventory.
Snapshots preserve settings, translations/texts, IDs/metadata, unrelated
objects/settings, audit parameters/rate key and historical/monthly log hashes.
Browser storage/fingerprints are captured from actual 1.0.0 and compared after
native upgrade, with no manually manufactured consent. HTTP tests use actual
audit responses and read matching records from the real monthly JSONL file.
Third-party requests are fulfilled locally; no vendor events are transmitted.

The native acceptance also covers RU/EN, standard/Fenom split and legacy,
cold/warm cache, registry/assets/banner singletons, all visibility masks and
strict forgery/replay checks. PHP 8.1 is verified through native reinstall and
HTTP/Fenom/audit execution. The test front controller and pdoTools are fixture
infrastructure; Cookie Consent files and snippets come only from the ZIP.

After native installation, run applicable existing main browser/Manager/viewer,
translation, permission, public-API and HTTP regression suites sequentially.
Evidence is under `.local/beta102/evidence`. Test helpers may seed synthetic
settings/pages/logs but must not replace installed component runtime files.
Final artifact and acceptance details belong in the release report under docs.
