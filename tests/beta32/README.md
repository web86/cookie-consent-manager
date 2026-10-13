# beta32 acceptance

Use only the named disposable local MODX 2.8.8 databases. Shared main tests must run sequentially; clean/publiccore native fixtures are independent. Owner-provided map source is transcribed with compacted formatting/comments, not claimed byte-identical. Actual client TV/backend/API/key/hosting is not present.

- callbacks.mjs: real split/legacy pages, before-initialize registration, restored consent, late registration, per-category grant/once, exceptions/rejections, unsubscribe, service/fingerprint checks, draft/audit isolation, live withdrawal guard.
- maps.mjs: the actual consent-adapted map logic and user chunk on real MODX, with locally fulfilled Yandex SDK/server endpoint test doubles. Checks SDK/network gate, authorized point/polygon/line/fallback behavior against the functional original baseline, shared SDK/once/rescan, reload, and withdrawal during local script/SDK/data waits.
- native.mjs: beta31 → beta32 through genuine native Package Manager, fresh category handling, reinstall/uninstall; an unmanaged CookieConsentCustomScripts chunk with properties/category/source must survive unchanged.

The native transport includes no client map code, no custom chunk vehicle and no new provider/editor/event plugin. The examples must be applied separately to the client site's myyandexcoordstv after backup and staging validation. Released ZIPs are immutable; no main merge or production deployment.
