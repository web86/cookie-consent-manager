# MODX 2 1.0.4-beta2 acceptance

Run only against the repository's disposable local MODX fixtures. Browser tests mutate
the main test database and restore their settings in `finally`; run them sequentially.
All third-party traffic is locally fulfilled or aborted. No real vendor account is used.
Do not reset/run the native clean fixture during `test:universal`: Manager UX also
uses that fixture. Complete native lifecycle tests before starting browser regressions.

```sh
node tests/beta1042/accept.mjs
docker compose --env-file .local/private/compose.env -f tests/local/compose.yaml exec -T web php /opt/cc-source/tests/beta1042/urls.php
npm run test:universal
```

`accept.mjs` uses native Manager Save, the actual installed frontend bundle and the
real JSONL receiver/Viewer. It compares served bundle bytes to the workspace hash;
an older cached bundle fails the test. It checks both acceptance buttons, immediate
SDK request and `init`, storage/schema 3 audit, reload, revocation, hidden categories,
disabled services, previous refusal, moved services, grouped analytics, remote custom
JS, reassigned maps, version invalidation and Manager version/tooltip/error messages.
`urls.php` provides shared positive/negative vectors for PHP/browser parity.

For a baseline, install the immutable beta1 transport and check out its source before
running `CC_ACCEPT_BASELINE=1 node tests/beta1042/accept.mjs`. That mode skips new beta2
UI and HTTPS features. It does not reinterpret a successful beta1 run as a reproduced bug.

After building and normalizing beta2, run the native beta1 → beta2 test:

```sh
node tests/beta1042/upgrade.mjs
```

It installs the two real ZIPs sequentially on the main disposable site, restarts the
test web container to discard OPCache, preserves existing consent bytes, settings and
audit data, verifies the new bundle hash and checks beta1's ZIP is unchanged. Beta1 and
beta2 transport files and their inventories must already exist in `.local/artifacts/`.
It leaves beta2 installed and restores the original settings.

Reports and fixture screenshots are written to ignored `.local/beta1042-evidence/`.
The committed acceptance report contains only sanitized results.
