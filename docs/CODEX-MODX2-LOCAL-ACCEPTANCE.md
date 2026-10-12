# Codex task: M2 acceptance + M3 service registry / maps (MODX 2 local)

## Goal

Complete and test the existing Cookie Consent Manager in a **real local MODX Revolution 2.8.8 installation**, without using live production credentials or contacting analytics providers during automated tests. Project is a private commercial product. Current base: `main` (inspect current HEAD first). Read existing README, consent-manager.js, adapters, PHP endpoint, mock demo, and historical M2 files.

**Suggested model:** GPT-6 High (or GPT-5.6 High if available). Reason: requires cross-cutting integration, browser network tests, and PHP security checks.

## Existing changes on main

- Auto-delete / prune was intentionally removed: never delete archival JSONL audit logs.
- Audit log directory now comes from MODX 2 system setting `cookie_consent.log_dir`. It MUST be absolute, writable, and outside DOCUMENT_ROOT; validate real paths and fail closed if unsafe. There must be no fallback to public or relative directories.
- Annual/monthly grouping is by filename `YYYY-MM-cookie-consent.log`, one immutable historical file per month, no retention-day cleanup. Temporary rate limiter state may be purged without touching audit records if needed.
- The M2 config contains origin, secret and rate limit, but no log_dir. Verify the new MODX adapter can initialize `MODX_API_MODE` without output, loading expected configuration and returning JSON responses.
- Logs record server UTC time, server REMOTE_ADDR IP, User-Agent, consent_id, event_id, event, stage, categories, policy_version, page. Review privacy protection and access restrictions.

## Implement / audit actual integration

1. Install a local MODX 2 site or use an existing disposable MODX 2 fixture. Never touch customer production data or production tracking IDs in live mode.
2. Add installation/update scripts for MODX 2 system settings (namespaced `cookie_consent.*`), first required setting `cookie_consent.log_dir`. Treat this as product's canonical log-directory source. Do not silently recreate or overwrite admin-selected settings on upgrade.
3. Build **configurable provider registry**: service key, user-facing name, category, purpose/description, enabled flag, loader, optional blocker/placeholder, provider host patterns for audits. Configure allowed services via MODX manager/system settings using a validated schema. Admin can add or disable services and their display in preferences without editing JS. Avoid allowing arbitrary executable JS or unsafe HTML from public/admin text fields; provider adapters / allowlisted module IDs are code-reviewed. Future extensions must be possible.
4. Add Google-related providers to registry and mock tests. Include **Google Analytics 4 / Google Tag Manager / Google Ads** as distinct services; each disabled by default until configured, and classify tags correctly (GTM is a container, not a consent category). Ensure GTM cannot boot nonconsented tags. Verify Google Fonts or reCAPTCHA if used, but do NOT auto-classify functional/security services as analytics: report discovered uses and recommend categories individually. No automatic external Google requests before respective consent.
5. Support **Google Maps and Yandex Maps** through a distinct **external-content/maps** category or explicit per-embed permission. Choosing analytics must NOT automatically load maps, and agreeing to open a map must NOT automatically enable analytics. Render a first-party accessible placeholder with map title, privacy explanation, provider name and a clear **Load map** button. On click, grant map-provider authorization explicitly, record the final user action in audit, and replace placeholder with the correct original iframe/script. Provide a persistent way to revoke map authorization. Do not load map iframe, thumbnail from Google/Yandex, SDK, or remote assets before consent. Mock maps must use only same-origin assets. Confirm original embed parameters safely (no script injection, URL allowlist).
6. Update cookie settings UI to list enabled providers under relevant categories; add category or provider toggles for external content with defaults OFF. Future services enabled by admin appear in interface and cannot activate before appropriate consent. Always-enabled necessary category stays locked. Keep original 4 button toggles supported.
7. Preserve earlier Yandex ID `23643118`, Mail.Ru `3265404`, optional Bitrix24 ClientID dependency. ClientID remains optional; forms must submit even without it. Never initialize duplicated scripts or rely on `window.onload = ...`. No noscript tracking pixels.
8. Extend same-origin PHP audit validator/schema for explicit map provider permissions and configurable category changes while keeping backward-compatibility with existing M2 JSONL records or documenting any schema bump + migration. Distinguish draft clicks from committed choices; IP alone is not unique identity; store stable random consent_id. Ensure no unauthenticated admin configuration mutations.
9. Update README (RU) with exact MODX 2 installation, required settings, logger path, safe mock/live procedure, map embed integration and privacy limitations. Include a migration guide from `popup_yurist` (must not be interpreted as prior analytics permission).

## Security / correctness gates

- Check existing `server/public/audit.php`, wrapper, validator, limiter for invalid input, unexpected JSON fields, CSRF/cross-origin, Origin / Fetch Metadata handling, DOS, symlink/path traversal, same-origin constraints, duplicate event IDs and concurrent append correctness. Distinguish file write failure from HTTP 200.
- Check whether accepting `data-cc-audit-url` from DOM can be abused; should only allow same-origin endpoint.
- If using `REMOTE_ADDR` behind reverse proxy, never trust arbitrary forwarded headers. Document trusted proxy configuration separately.
- Ensure consent persists on revisit, expires after configured lifetime, can be revoked, and scripts don't load on reload after revocation. Consider existing third-party cookies and limits of deletion.
- No secrets, production IPs, client PII, or production log files in repo.

## Required automated and manual tests

Test a matrix on **real local MODX 2 site**, using Playwright/browser DevTools network interception or fixture server, PHP 8.1+ and a writable private log folder:

- first visit: NO requests to third-party trackers or maps
- reject all, settings save with no selection: no tracker/network loads, JSONL committed event
- analytics only: only configured Yandex/Mail/Google mock analytics scripts; Bitrix optional ClientID populated; no maps or marketing
- marketing only: mock marketing loads, analytics/maps blocked
- map only (Google, Yandex separately): placeholder → click → only selected map loads; analytics stays off
- accept all / legacy accept, individual category toggles / revocation, reload/return visit, TTL expiry, policy version bump
- dynamic provider addition and disabling from MODX admin, UI reflects choices; no arbitrary JS execution
- audit positive: POST=200, monthly file created at setting path, valid JSONL, server-derived IP/UA, unique event_id, stable consent_id
- negative: invalid origin / method / content type / malformed JSON / excessive payload / invalid path / missing directory permissions / duplicate replay / limiter, concurrency & partial writes, failed audit endpoint
- no auto-purge of monthly logs, including files older than 180 days; `prune.php` absent
- test both normal page and any modal/map embeds; check responsive and keyboard navigation.

Capture test commands, assertion counts, browser network HAR summaries, representative sanitized log entries, known limitations and exact pass/fail gates. Don't claim success without actually running tests. If local MODX 2 isn't available, set up disposable instance or report exact blocker, and run the subset that is possible; no unsupported PASS claims.

## Deliverables

- Working changes in a feature branch `feature/modx2-provider-registry-maps`, clean commit(s).
- `docs/modx2-m2-maps-acceptance.md` with full instructions, actual results, redacted evidence, blocker list and release recommendation.
- `docs/service-registry.md` with schema/examples and extension guidance.
- Ensure test fixtures and maps are safe mock variants; do not push production content or secrets.
- Push branch to private repo if authorized; **do not deploy to production**. Do not merge to main until review, explicit acceptance and tests pass.
