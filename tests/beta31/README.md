# beta31 local acceptance

Run on the disposable MODX 2.8.8 fixtures prepared by `tests/local`/`tests/transport`. Never point the helpers at production. Docker helpers enforce named test databases. Settings are restored in finally blocks; previous fixture trees are archived by native resets.

- `php.php`: registry IDs, duplicate Mail.Ru/VK ID rejection and category visibility; removed launcher/map controls.
- `gtm.mjs`: owner-authorized **real published** GTM-WJD8XJD6. Requires one Custom HTML tag incrementing `window.__ccGtmTest` and an analytics Custom HTML test incrementing `window.__ccGtmAnalyticsTest`, with Additional Consent Checks requiring `analytics_storage`. No GA account or pixel delivery is needed. Only this container's gtm.js is allowed externally; other external requests are locally fulfilled. Consent Mode commands are checked before gtm.js, and consumed states in the real GTM runtime are observed. Do not substitute a production container. It never changes the GTM workspace.
- `pixels.mjs`: network-intercepted controlled fbq/_tmr SDKs, per-ID events, all four marketing/analytics states, 16 pixel provider subsets, pending SDK withdrawal, fingerprints, opener/API, maps RU/EN/cache and real PHP audit ACK + record. No fictional IDs reach vendors.
- `manager.mjs`: actual Manager GET/fields/Save/reopen RU/EN, additional instances, near-field Mail.Ru/VK conflict, direct backend rejection and GTM warning.
- `native.mjs`: native PM clean installs, existing category, beta30 upgrade, reinstall, uninstall and preservation. Archive beta30 must exist in `.local/release`.
- `summarize.py`: refuses failing suites, verifies all 256 provider combinations and safe HAR origins, two byte-identical final builds and immutable beta30, then publishes the immutable beta31 ZIP/evidence. Raw HAR, POST, JSONL, keys, credentials and downloaded SDK source are not exported.

Run shared main-fixture suites sequentially because they intentionally change the same registry/text/language settings. Native clean/publiccore fixtures may run independently. Finish source/build changes before installing and testing the final candidate; reusing a development signature after changing generated resolver code can require restarting the fixture's OPcache. Released beta signatures must never be rebuilt with different bytes.
