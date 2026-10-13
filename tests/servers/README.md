# Local HTTP-server journal matrix

Only disposable MODX 2.8.8 acceptance fixtures are used. Create them with the existing transport prepare/reset helpers, build the current package plus the next-index test upgrade, and run `tests/transport/native.mjs` before this matrix. Credentials and keys remain under ignored `.local/` paths.

```sh
python3 tests/servers/prepare-tls.py
docker compose --env-file .local/private/compose.env \
  -f tests/local/compose.yaml -f tests/transport/compose.yaml \
  -f tests/servers/compose.yaml up -d --build clean fpm nginx proxy
node tests/servers/journal.mjs
```

Ports: 8889 Apache, 8891 nginx with PHP-FPM, 8892 nginx reverse proxy to Apache. Both PHP services mount the same disposable clean fixture; run tests sequentially because they share its database. After `reset.py`, recreate FPM/nginx/proxy to refresh bind mounts. The proxy sends forwarded headers and `Via`; the Manager check's test-only Docker routing also traverses the proxy. Production requests use the trusted audit origin directly.

Each server tests website-relative and private absolute storage, actual Manager button → POST → JSONL, IP/User-Agent/consent_id, a preserved historical sentinel, absence of automatic `.htaccess`/probe creation and unchanged custom administrator rules. A deliberately readable historical webroot log returns 200 and does not block audit. The fixture's core HTTP policy is provisioned by the test site owner, not by the package.

Evidence is written to `.local/log-policy-evidence/servers.json` and screenshots. Existing component settings are restored in `finally`; controlled acceptance directories and test events are retained. These tests are not safe to point at an existing customer site.


The beta23 HTTPS matrix uses ports 8893 (TLS reverse proxy → internal nginx → PHP-FPM), 8894 (HTTP 301 to HTTPS), and 8895 (untrusted certificate). Test DNS aliases are cc-tls.test/cc-untrusted.test. `prepare-tls.py` creates ignored fixture CA/certificates; PHP trusts that CA through a test-only INI mount and keeps peer/name verification enabled. Browser ignores fixture CA errors only in the isolated test context; PHP never disables TLS checks. HTTPS is explicitly set by the internal nginx vhost, not inferred by component code from a client Forwarded header. No TLS keys/INI are packaged. Delete/renew only these generated fixture certificates when expired.

`node tests/beta21/audit.mjs` temporarily replaces the disposable public wrapper with `failure-router.php`, waits for OPcache revalidation, tests safe status/JSON/record errors, and restores it in `finally`. It requires CC_DB_PASSWORD and never belongs on a live site. The script proves no redirect target call, no secret/body/IP diagnostic leak, and same-key managed-origin correction after a real 301. Separate Manager origins / host rewriting by a proxy require a reviewed hosting configuration; the component does not trust arbitrary Forwarded headers.


Beta24 uses local Save only. The matrix then sends actual browser POST events and checks matching ACK/records. The proxy fixture denies the historical PHP audit-check User-Agent; `tests/beta24/proxy.mjs` proves self-request 403 vs browser 400/200 and no fabricated monthly event from Save. Journal settings now appear at the end of Main, not below the Viewer. `audit_enable`/`audit_test` compatibility APIs do local I/O only and have no UI button.
