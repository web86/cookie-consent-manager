1.0.0 (2026-10-14): First stable native MODX 2 release. Includes independent category visibility, accessible collapsible Manager groups, legacy visibility migration, per-category consent invalidation, removal of core Metrika ClientID/form integration, consent-controlled callbacks and maps, VK/Meta adapters, separate Google Consent Mode v2 states, PHP localization, minimal split frontend bundles, local audit setup and Audit Viewer/CSV. Normalize fresh MODX empty translation dictionaries before editing and after Save; reject malformed arrays without data loss. Stable native preserved-backup recovery supported. No production deployment or real vendor delivery claim.

beta33: Explicit category visibility independent of services, native one-time migration preserving beta32 visibility. Per-category consent versions invalidate hidden/re-enabled grants without changing provider fingerprints. Manager independent accessible category visibility/collapse controls; public SSR/preview/runtime/map gates share flags. Remove core Metrika ClientID/form integration; migrate historic boolean clientId without fingerprint aliases, requiring service reapproval. User-owned chunk example.

beta32: Add onAllowed(category, callback, {service}) using validated committed consent and provider fingerprints. Once per subscription per page, unsubscribe, isolated callback failures, live stillAllowed guard for asynchronous work before reload. User-owned custom-script chunk and JS-map adaptation examples only; no arbitrary JS Manager or managed custom chunk.

beta31: GTM uses marketing + its own fingerprint, without the all-category gate. Separate Consent Mode v2 states before container; tag consent-check warning. VK Ads and Meta Pixel marketing adapters, disabled defaults and Manager cards/instances. Shared Mail.Ru SDK, reject cross-category duplicate IDs. Meta per-ID autoConfig off/init/trackSingle, consent revoke and pending-event cancellation. Remove automatic settings launcher and map revoke controls; use manual opener/API and general preferences. Native transport only; no production delivery claim.

beta30: Fix real MODX Manager config serialization. MODX modError converts empty config objects to arrays; normalize only empty arrays before editing and after Save, reject malformed/non-empty arrays. Preserve provider IDs/boolean options; field-level RU/EN ID errors and focused validation. Consent, frontend, audit and receiver unchanged.

beta29: Assets generates safe public JSON directly; five canonical vehicles, no Registry installation/update/removal. Legacy integrations retained. Manager documents split integration, removes cache backup UI hint, suspends preview on a full-width Log tab. Viewer summaries include validated IP, four columns, primary Find button; search/CSV/ACL unchanged.

beta28: Document the PHP translation placeholders in the source chunk. Native category vehicle reuses/creates CookieConsent; only newly installed canonical elements receive its ID. Upgrade/reinstall retain existing categories and metadata and replace source in place. No integration or runtime changes.

0.1.0 beta26
WARNING / ВНИМАНИЕ: canonical code updates in place. Back up DB/elements/static sources/runtime/logs before install.
Static banner localization is PHP-only using context cultureKey, saved overrides and stock fallbacks. CookieConsentAssets (once in head) outputs minimal data, one content-hashed CSS and one deferred JS bundle; CookieConsentBanner (once before closing body) outputs ready markup and minimal dynamic templates only. Legacy CookieConsent remains a separate supported integration. Never mix the two methods or repeat tags; no MODX plugin/event rewriting/dedup infrastructure is installed. Runtime guard prevents repeated JS initialization. Bundles are generated/verified at build time using locked esbuild 0.28.2; no Manager/fixture/vendor SDK code in the bundle. Provider consent/fingerprints/GTM/maps/audit semantics and beta24 journal settings remain intact.

0.1.0 beta24
WARNING / ВНИМАНИЕ: code of CookiesPopup, CookieConsent, CookieConsentRegistry and CookieConsentMap WILL BE REPLACED. Back up DB/elements/static source files before installation. IDs/types, settings, saved translations and logs are retained.
One Save applies journal settings at the end of Main. New/changed directories use an exclusive temporary local PHP write/lock/read/cleanup test, without HTTP self-request or consent events. Journal path failure returns an explicit partial Save and retains the previous path; other valid settings persist. Fresh native installs derive MODX_CORE_PATH cache/logs on the target host; upgrades retain custom or intentionally empty paths. Existing paths do not undergo unnecessary write checks. Log tab contains only filters/results/CSV/table/details/pagination; all supported event types have RU/EN labels. Public receiver Origin/schema/HMAC/rate/replay/ACK behavior is unchanged. Preserve logs when manually clearing core/cache and include them in backups.

0.1.0 beta23
WARNING / ВНИМАНИЕ: code of CookiesPopup, CookieConsent, CookieConsentRegistry and CookieConsentMap WILL BE REPLACED. Back up DB/elements/static source files before installation. IDs/types, settings, saved translations and logs are retained.
Hide inactive optional categories in SSR/public JS/draft Manager preview; necessary stays visible. Provider fingerprint, schema 1/2, map and GTM gates retained. Audit self-request diagnostics distinguish redirects/status/TLS/network/invalid acknowledgements; success requires the same event_id and matching monthly record. Explicit managed-origin selection uses the authenticated Manager public address without trusting Forwarded headers; existing key/rate are retained, external private configuration is never overwritten. TLS verification remains enabled and redirects are never followed.

0.1.0 beta21
WARNING / ВНИМАНИЕ: code of CookiesPopup, CookieConsent, CookieConsentRegistry and CookieConsentMap WILL BE REPLACED. Back up DB/elements/static source files before installation. IDs/types, settings, saved translations and logs are retained.
Canonical CookiesPopup/CookieConsent/CookieConsentRegistry/CookieConsentMap source update via native UPDATE_OBJECT=true and UNIQUE_KEY=name; IDs/type/user metadata retained, no new stock tree copies. Explicit pre-install code-replacement warning, native preserved backup verification and CLI restore. Structural chunk with safe context-localized server rendering before JS; saved text overrides/options preserved. Consent Audit Viewer remains included.

0.1.0 beta19
Read-only Consent Audit Viewer with exact server filters, 50-row cursor pages, safe details/history and streamed UTF-8 CSV. Separate cookie_consent_view_logs permission (default false). Storage settings collapsed below table. New monthly logs have a text MIME header under existing locks; old logs stay unchanged and all readers accept both formats with diagnostics.

0.1.0 beta15
Server-independent journal paths and real POST/JSONL check. Removed HTTP protection probes and automatic journal guards. Site administrators own HTTP access policy. Ordinary settings Save ignores the unsaved journal draft and tolerates unchanged unavailable audit paths. Filesystem safety/replay/rate limiting retained.

0.1.0 beta13
Fix website-relative journal paths, custom Apache guards and unconfigured Save. Unified journal check/enable with precise diagnostics. Public preferences/preview/text editor show categories only; provider fingerprints/audit remain internal, legacy partial permissions never expand automatically.

0.1.0 beta7
Simplified Manager UX and fixed ExtJS scrolling/duplicate uncached snippet parsing. Added unified CookieConsent and inert CookieConsentMap APIs. Confirmed reconsent action, native DB Registry audit key, private/verified Apache log storage and POST→JSONL check. Preserve legacy translations/settings/elements/consents/logs and expose bounded API diagnostics.

0.1.0 beta5
Simplified native object/file/script vehicles. Removed custom lifecycle storage, package-state settings, Setup Options and filesystem rollback. Preserved active user elements with separately named versioned stock samples; audit setup is performed in the CMP. Backup/restore limitations are explicit.
