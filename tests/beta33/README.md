# beta33 acceptance

Run only against named local disposable MODX 2.8.8 fixtures. Main fixture suites run sequentially. Native clean/publiccore are separate.

- php.php: explicit defaults, exact booleans/counters, legacy visibility and retired clientId normalization/rejection, SSR 0/1/2 services.
- public.mjs: category-only and scoped callbacks, SSR cold/warm with JS off, hidden/visible service groups, online/offline hide/show epochs, per-map gates.
- manager.mjs: real RU/EN Manager labels, keyboard/collapse persistence, auto-reveal invalid field, add/rerender, native Get/Save/Preview/conflict/validation.
- clientid.mjs: absence of core form integration, owner chunk tested with controlled SDK/queue and optional target. No real Bitrix/Yandex destination.
- native.mjs: true Package Manager fresh with/without existing category, beta32 upgrade, canonical code replacement, metadata and user data retention, reinstall/uninstall.
- migration.mjs: eight prior visibility combinations plus clientId false/absent, real beta32 browser consent before native upgrade, unchanged other fingerprints and blocked old Yandex fingerprint. CC_RELEASE_SIGNATURE selects stable artifact for the same migration test.

Older matrix expectations are updated only where the explicit visibility contract or removal of core ClientID deliberately changes behavior. Historical beta reports and immutable ZIPs remain intact.
