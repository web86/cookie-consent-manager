# Adapter update acceptance

Use only the isolated cookie-consent-adapter-updates project, port 22888 and newly named cc_adapter_* databases. Existing fixtures/artifacts are never reset. Official MODX 2.8.8 is reused from the local download; the PHP image is the existing acceptance image. Secrets remain under ignored .local/adapter-updates/private.

Standalone:

```sh
php tests/adapter-updates/php.php
node tests/adapter-updates/local.mjs
```

Native setup:

```sh
python3 tests/adapter-updates/prepare.py /absolute/reference/repository build
docker compose --env-file .local/adapter-updates/private/compose.env -f tests/adapter-updates/compose.yaml up -d
docker exec cookie-consent-adapter-updates-web-1 php /opt/cc-source/tests/adapter-updates/setup.php build
docker exec -w /opt/cc-updates/cases/build/site/setup cookie-consent-adapter-updates-web-1 php index.php --installmode=new --config=/opt/cc-updates/cases/build/private/setup.xml
docker exec cookie-consent-adapter-updates-web-1 php /opt/cc-source/_build/build.php /opt/cc-updates/cases/build/site /opt/cc-updates/artifacts/final-a
python3 _build/normalize.py .local/adapter-updates/artifacts/final-a/cookieconsent-1.0.7-beta1.transport.zip
python3 tests/transport/composition.py .local/adapter-updates/artifacts/final-a/cookieconsent-1.0.7-beta1.transport.zip
python3 tests/adapter-updates/native.py unique-run-name /opt/cc-updates/artifacts/final-a/cookieconsent-1.0.7-beta1.transport.zip
```

Do not reuse a case name or replace an installed archive with different bytes. The harness retains first failures. Candidate install uses real modTransportPackage::install / native script/object/file vehicles as www-data. Setup runs against new DBs only. Repeat builds use new folders and the existing ZIP normalizer.

The native matrix covers fresh, 1.0.6 upgrades, one/several edits, shared helper, deletion, extra file, syntax failure, write permissions, same-version reinstall and first-install failure/repair. No post-copy restoration of user adapters is accepted. Deliberately missing/invalid required inputs must keep the previous working bundle/version and show an error; an initial install with no working bundle must fail, without claiming full native rollback.

Sequential/conflict tests use separately named beta2 test archives with changed original bytes. These are fixtures, not deliverable releases. Source parity, real installed Strict/Legacy/maps/video/services and Manager RU/EN/cache-clear/force are checked separately. External responses are intercepted; real delivery/video playback remain release gates.
