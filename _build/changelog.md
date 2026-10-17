## 1.0.8

- Optional translated plain-text banner title; empty titles remain hidden.
- Bottom bar, bottom-right and bottom-left compact layouts with CSS mobile fallback.
- Existing consent, adapters, journal and Manager sidebar preview retained.

# Cookie Consent Manager 1.0.7-beta2 — MODX 2 manual upgrade test

- New unique test signature based on the accepted UI-refinement branch.
- Include SHA256 adapter preservation, private originals and installed PHP bundle generation.
- Include RU/EN settings/services/journal refinement and the existing pathname field in the journal table/CSV.
- Validate native fresh install and 1.0.6 upgrade with user settings, edited/deleted adapters, owner JS and historical JSONL retained.
- No public release, push or production deployment.

# Cookie Consent Manager 1.0.7-beta1 — MODX 2 local review candidate

- Ship private originals for services/ and synchronize with previous-version SHA256 before building. Retain local modifications, deleted supplied files and additional files; report conflicts without merging JavaScript.
- Capture legacy 1.0.6 manifest before native file copies. Keep compact per-version original checksums in the component directory; no database or source history system.
- Build production JS on the installed site with the existing PHP/Peast builder and lock. Exclude prebuilt JavaScript from transport; retain esbuild for CI and the existing CSS scheme.
- Preflight required permissions/dependencies. Refuse a fresh installation without a working bundle; retain the previous bundle/timestamp and show an error when an upgrade cannot build. Native transport can leave partial changes on failure.
- Preserve Strict/Legacy, fixed input order, initialization guard, maps, video, services, timestamp busting and existing administrative rebuild controls. Local native tests only; no main push, release or deployment.

# Cookie Consent Manager 1.0.6 — MODX 2

- Set stable component metadata to 1.0.6 (no prerelease suffix).
- Share editable RU/EN external-content placeholder text with safe {provider} substitution across videos and automatic generic embeds; retain visible Google Maps and Yandex Maps text overrides.
- Use one editable Cookie settings / Настройки cookie button label for built-in map, video and generic placeholders; preserve category targeting and existing user translations on upgrade.
- Update the RU/EN short guide and verify six HTML examples for local/inert external posters, landscape/portrait ratios, fixed iframe dimensions and responsive width.
- Preserve consent lifecycle, iframe activation/revocation, SDKs, adapter URL policies and administrative timestamp versioning. Build the native installable transport for testing; no GitHub publication, push, merge or deployment.

# Cookie Consent Manager 1.0.5-beta2 — MODX 2 staging candidate

- Package the completed adapter cache builder and saved timestamp URL versioning for real-site staging tests. No production release or real video playback claim.
- Use an explicit runtime transport allowlist and reject unexpected ZIP content. Exclude the ten test/demo mock SDK/map assets and Peast developer README. Keep all 21 administrative build inputs, including the referenced mock-marketing factory; production live behavior is unchanged.

Adapter-cache work included in beta2:
- Build the shared frontend bundle on authenticated Manager OnSiteRefresh and package install, from the release builder’s ordered manifest.
- Ship pinned PHP Peast 1.17.6 AST minification; no Node/npm/Composer required on the host.
- Lock builds, skip unchanged content and atomically publish JS. After publication save cookie_consent.bundle_version as a Unix timestamp; frontend selects cached/prebuilt from loaded MODX config without reading JS. Preserve previous file/version on errors and invalidate settings/resource caches without OnSiteRefresh recursion.
- Add the existing-ACL RU/EN build status, last success time and force-rebuild button.
- Extend the canonical short RU/EN guide with adapter editing and snippet/template/onAllowed video examples.

# Cookie Consent Manager 1.0.5-beta1 — MODX 2 video staging candidate

- Disabled-by-default YouTube, RUTUBE and VK Video service types in the existing category model.
- Native CookieConsentVideo snippet with reviewed HTTPS URL contracts and privacy-enhanced YouTube embeds.
- Trusted inert template embeds and explicit idempotent mountEmbeds(root) for AJAX/modal content.
- Backwards-compatible CookieConsentMap display and iframe parameters; safe local posters.
- RU/EN messages, inert Manager video previews, a short fifth guide section and provider/CSP reference.
- Existing categories_v2 consent, legacy first-visit behavior, SDK dispatcher and schema 3 audit remain intact.

# Cookie Consent Manager 1.0.4-beta4 — frontend module boundaries

- Extract existing SDK loading, queues, deduplication and Google Consent Mode into service-loaders.js.
- Extract existing map URL validation, inert placeholders, iframe lifecycle and dialog focus into embeds.js.
- Preserve public provider/consent APIs through delegation, Strict/Legacy permissions, categories_v2, fingerprints and audit schema 3.
- Keep one ordered, content-hashed frontend bundle and native MODX 2 transport; no video services or new template API.
- Update technical adapter source links and add beta3/candidate differential and native upgrade checks.

# Cookie Consent Manager 1.0.4-beta3 — legacy auto-load

- Existing Show legacy Accept now permits enabled services in visible assigned categories on positively known first visits. Strict mode remains the default.
- Keep effective runtime permission separate from persisted categories_v2 choice and schema 3 audit. No automatic consent record or accept event.
- Legacy first visits leave Google Consent Mode untouched (no denied/granted commands or custom GTM consent flags) and preserve ordinary GA4/Ads configuration, like direct installation. Explicit choices and rejection still apply Google consent signals; pending CMP Google work is discarded on legacy rejection without deleting site commands.
- Saved refusal, partial choice, stale versions, expired/invalid/historical records and unavailable storage never qualify for the legacy exception. Explicit rejection stops managed work immediately and reloads safely.
- Share runtime eligibility across SDKs, custom JS, maps and onAllowed/stillAllowed; preserve deduplication, async guards and revoke queues.
- Add RU/EN privacy warning and local Chromium/native regression coverage. No video implementation or frontend extraction.

# Cookie Consent Manager 1.0.4-beta2 — acceptance and Manager usability

- Share the visible-category acceptance path for Accept and Accept all; preserve their distinct historical audit event names.
- Show the active runtime package version, accessible category classification tooltip and hidden-category diagnostics.
- Use the clear Service name label in service creation and settings.
- Support reviewed HTTPS JavaScript URLs as well as local custom_js paths; share PHP/Manager/frontend validation rules and normalized duplicate checks. Report script location errors instead of unrelated counter ID errors.
- Bust Manager asset caches by content hash. Keep categories_v2, schema 3 audit, category visibility and consent versioning unchanged.
- Reproduce and compare both button modes on native MODX with real receiver/Viewer and locally fulfilled SDK requests. Beta1 transport remains immutable.

# Cookie Consent Manager 1.0.4-beta1 — category-only staging candidate

- Visitors choose only analytics, marketing and external_content. Every enabled adapter follows its assigned category; no individual provider grants or mandatory original-category dependencies.
- Native Save versions changed category processing composition. Preserve complete legacy grants conservatively; archive the original browser choice locally. Historical JSONL schemas 1/2 remain unchanged; new category-only events use schema 3.
- Add one service dialog, editable categories, validated local custom_js files, map placeholder text controls, dynamic-category map templates and modal-safe category preferences.
- Keep Google Consent Mode processing signals separate from adapter launch. Display Moscow time in the audit table; details, JSONL and CSV retain UTC.
- Beta for staging acceptance; no production deployment or vendor-delivery claim.

# Cookie Consent Manager 1.0.3-beta1 — staging candidate

- Rebuild the combined MODX 2 fixes with version 1.0.3, release beta, index 1 so native Package Manager ranks this candidate above installed stable 1.0.2.
- Preserve the exact runtime and canonical element sources from 1.0.2-beta1; no functional changes to Fenom handling, consent permissions or audit validation.
- Supersedes 1.0.2-beta1 for staging upgrades; independently rebuilt from native package metadata, not renamed.

# Cookie Consent Manager 1.0.2-beta1 — staging candidate

- Fix MODX 2 pdoTools/Fenom blank pages by registering the service registry JSON after resource parsing; preserve split and legacy integration.
- Validate schema 2 accept/accept_all against persisted system category visibility and enabled providers; hidden categories remain false and forged grants remain rejected.
- Preserve consent schemas/fingerprints, service configuration, translations, element metadata and existing audit data.
- Beta only: install on staging and verify templates, consent restoration and the actual audit endpoint before any production rollout.

# Cookie Consent Manager 1.0.0

## Возможности

- Независимое управление видимостью категорий согласия и настройками отдельных сервисов.
- Мультиязычный баннер и Manager с пользовательскими текстами, поиском журнала и экспортом CSV.

## Интеграции

- Поддержка Яндекс.Метрики, Top.Mail.Ru, GA4, GTM, Google Ads, VK Ads Pixel, Meta Pixel, Google Maps и Яндекс.Карт.
- Пользовательские JavaScript-интеграции через `onAllowed()` и безопасные заглушки iframe-карт до согласия.

## Безопасность

- Загрузка сервисов после разрешения, сохранённый выбор посетителя и отзыв согласия через общие настройки.
- Серверный аудит согласий с проверкой событий, защитой от повторной отправки и сохранением существующих журналов.

## Совместимость

- Нативная установка и обновление через MODX Package Manager; сохранение настроек, переводов, параметров сервисов и метаданных элементов.

**Перед обновлением сделайте резервную копию:** пакет заменяет исходники CookiesPopup, CookieConsent, CookieConsentAssets, CookieConsentBanner и CookieConsentMap. Split-подключение Assets/Banner и legacy CookieConsent — альтернативы, их нельзя использовать одновременно. При обновлении со старых версий изменённая конфигурация Метрики требует повторного согласия; получение ClientID для форм вынесено в пользовательский пример. HTTP-доступ к журналам ограничивает владелец сайта.
