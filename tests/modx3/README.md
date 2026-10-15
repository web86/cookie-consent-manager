# MODX 3 native acceptance

Only the explicitly marked disposable `cookie-consent-modx3-beta3` project.
Do not point the helpers at customer sites or reuse MODX 2 DBs/volumes.

```sh
bash tests/local/setup.sh
npm ci
node _build/user-guide.mjs --check
node _build/frontend.mjs
docker compose --env-file .local/modx3/private/compose.env -f tests/modx3/compose.yaml \
  exec -T web php /opt/cc-source/_build/build.php /var/www/html /opt/cc-artifacts/new-build
python3 _build/normalize.py .local/modx3/artifacts/new-build/cookieconsent3-0.1.0-beta3.transport.zip
docker compose --env-file .local/modx3/private/compose.env -f tests/modx3/compose.yaml \
  exec -T web php /opt/cc-source/_build/verify.php /opt/cc-artifacts/new-build/cookieconsent3-0.1.0-beta3.transport.zip
node tests/modx3/install.mjs cookieconsent3-0.1.0-beta3 .local/modx3/artifacts/new-build
docker compose --env-file .local/modx3/private/compose.env -f tests/modx3/compose.yaml \
  exec -T web php /opt/cc-source/tests/modx3/control.php provision
node tests/browser.mjs
node tests/modx3/regression.mjs
node tests/modx3/final.mjs
```

Use a new output directory for identical reproducibility builds; use a new
signature for changed payloads. Existing artifacts are never overwritten.
The `lifecycle.mjs` harness intentionally uses the immutable beta1/beta2 pair
and the dedicated clean fixture. `fresh.mjs` requires an unused fresh fixture;
do not reset an existing database to manufacture a PASS. `manager.mjs` asserts
the initial clean-fixture category versions and should be run before provisioning
its consent baseline.

Environments: web 18888 (`cookie_consent_modx3_test`), clean 18889
(`cookie_consent_modx3_clean`), fresh 18890 (`cookie_consent_modx3_fresh`).
All have a fixed root core, aliases OFF and separate site/private mounts.
Guard checks marker, connection destination, CMS version and DB before mutation.
Generated credentials stay in each ignored private/manager.json, never evidence.
The fixture owner protects core HTTP access; the package does not install rules.

Existing provider, category, callbacks, maps, SSR, HTTP, Viewer, permission and
guide assertions are retained and run through MODX 3 fixture helpers. Historical
MODX 2/beta package migration runners are outside this acceptance; their reset
entry point is disabled. Never use manual sync to replace native runtime files.
Evidence directories are under `.local/modx3/`; exported reports contain only
synthetic snapshots/hashes and bounded assertions, without credentials/HARs.
