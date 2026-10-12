# Local HTTP-server journal matrix

Only disposable MODX 2.8.8 acceptance fixtures are used. Create them with the existing transport prepare/reset helpers, build the current package plus the next-index test upgrade, and run `tests/transport/native.mjs` before this matrix. Credentials and keys remain under ignored `.local/` paths.

```sh
docker compose --env-file .local/private/compose.env \
  -f tests/local/compose.yaml -f tests/transport/compose.yaml \
  -f tests/servers/compose.yaml up -d --build clean fpm nginx proxy
node tests/servers/journal.mjs
```

Ports: 8889 Apache, 8891 nginx with PHP-FPM, 8892 nginx reverse proxy to Apache. Both PHP services mount the same disposable clean fixture; run tests sequentially because they share its database. After `reset.py`, recreate FPM/nginx/proxy to refresh bind mounts. The proxy sends forwarded headers and `Via`; the Manager check's test-only Docker routing also traverses the proxy. Production requests use the trusted audit origin directly.

Each server tests website-relative and private absolute storage, actual Manager button → POST → JSONL, IP/User-Agent/consent_id, a preserved historical sentinel, absence of automatic `.htaccess`/probe creation and unchanged custom administrator rules. A deliberately readable historical webroot log returns 200 and does not block audit. The fixture's core HTTP policy is provisioned by the test site owner, not by the package.

Evidence is written to `.local/log-policy-evidence/servers.json` and screenshots. Existing component settings are restored in `finally`; controlled acceptance directories and test events are retained. These tests are not safe to point at an existing customer site.
