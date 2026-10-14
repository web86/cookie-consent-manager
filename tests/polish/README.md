# Commercial polish acceptance

Named disposable local MODX databases and loopback URLs only. Do not modify/publish v1.0.0 or deploy client sites. Package 1.0.1 is a local review candidate.

- performance.php: native snippet/settings SQL counts, 100 samples after warmup; file hashes measured separately.
- endpoint.php + http-performance.mjs: temporary loopback wrapper, independent RU/EN/live/mock requests and HTML equality; remove after measurements.
- network.mjs: own assets/AJAX/audit separately from controlled SDK traffic.
- settings.php: stable revision, one query, fresh reads after writes, missing-row fallback, context/mode and generated guide parity; transaction rollback.
- ui.mjs: real Manager RU/EN/390px/desktop guide, Escape/close/focus/draft, chevron keyboard/hit-area/independent checkbox, all-tab/view-only footer. Stock Gravatar requests are excluded and blocked.
- package.mjs: real Package Manager attributes and pre-install Readme/Changelog tabs; stops before confirmation.
- native.mjs: fresh with/without category, 1.0.0 upgrade, reinstall/uninstall and exact data/metadata retention.
- regression.mjs: sequential shared-main suites including all 256 existing provider combinations. Never race settings suites.

Harness distinguishes native browser chrome from the inert modal background. ExtJS Escape interference was reproduced (defaultPrevented=true, no cancel) and handled locally. No production performance/vendor delivery claim.
