# Historical standalone i18n archive

Unchanged beta4 `i18n.js` / `lexicons.json`, retained together for reproducible
compatibility tests and historical integrations. Not maintained as a current CMP
integration, not public assets, not included in the production bundle or transport.
Current MODX localization is PHP-rendered.

`node tests/locale-guide/examples.mjs` still executes RU, EN and inline override
cases from these files. To inspect older public paths use immutable beta4 git
commit `de41eaa0f976c54c0d2836b605c7474ad874c472`.

Native upgrades do not delete historical files from sites. Owners of manually
connected scripts must review their templates/chunks/CDN before removing script
references. See [service adapter maintenance](../../docs/modx2-service-adapters.md).
