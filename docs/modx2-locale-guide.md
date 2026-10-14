# Frontend messages and custom integration guide — 1.0.2 review

The production bundle contains `runtime.js`, `provider-registry.js` and
`consent-manager.js`. Its only consumers of `web86Runtime` call `message()`;
none reads `.config` or locale. PHP uses the MODX context cultureKey and existing
saved text overrides/fallbacks to render banner text, ARIA, error messages and map
templates. Those PHP paths are unchanged.

Standard Assets now emits one data block:

```html
<script type="application/json" id="cc-service-registry">…technical registry…</script>
<link rel="stylesheet" href="…cookie-consent.min.css?v=…">
<script src="…cookie-consent.min.js?v=…" defer></script>
```

The former `cc-public-config` block with `{ "locale": "ru" }` is removed.
`web86Runtime` exposes only `message()`, which reads PHP-rendered data-cc-message
nodes. The compatibility registry source snippet also omits locale JSON. The
retired installed Registry element is retained by transport and remains unused
by split/legacy integration. The minimal service registry and consent identity
are unchanged; no data/consent migration, policy or category version increment.

## Compatibility

`assets/js/cookie-consent/i18n.js` and `lexicons.json` remain historical standalone
development sources. They are not inputs of the production bundle or shipped
public transport files; neither is needed by current MODX integration. They were
not deleted or modified. Old reports/archives are preserved.

For an explicitly maintained standalone use, i18n.js still exposes web86I18n with
ready/t/config/locale. Its owner must either provide its own legacy cc-public-config
strings, or serve lexicons.json beside i18n.js on the same origin and set html lang
(fallback en). It does not obtain saved MODX text overrides automatically. These
requirements apply only to that historical standalone helper; do not add it to
the standard bundle integration. Old matching source versions must be maintained
as a set rather than mixing historic translation logic with current CMP sources.

Site code that independently relied on cc-public-config or web86Runtime.config
must now provide its own locale configuration or use its own html lang/PHP output.
The CMP does not expose context locale as JSON. Existing PHP-localized pages and
documented onAllowed/getConsent/openSettings APIs are unaffected. Cached old HTML
can still contain the inert JSON; new runtime ignores it. Clear normal MODX and
HTML/CDN caches after upgrade. The bundle retains content-hash cache busting.

## Built-in RU/EN guide

The single source `_build/user-guide.json` now includes a section immediately
after template integration: «Подключение собственных JavaScript-сервисов» /
“Integrating custom JavaScript services”. Both locales use the same paragraph/code
structure and three examples: guarded local module import, service-specific
permission and unsubscribe.

The guide distinguishes visible category grants from permission for an enabled
registered instance with matching fingerprint, explains analytics/marketing/
external_content, restored consent, asynchronous guards, revocation and limits
of already-dispatched requests. Owner code belongs in site chunks/JS modules;
onAllowed does not register arbitrary services in Manager. Controlled SDKs should
use a registered instance key when available. Test custom integrations separately.

Regenerate with `npm run build:guide`; verify with
`node _build/user-guide.mjs --check`. Derived Package Manager Readme, PHP guide and
manifest are generated together, never edited manually. Manager renders code as
textContent in the existing accessible dialog; no runtime parser/UI dependency.

This is an unpublished **1.0.2** review candidate. The immutable 1.0.1 candidate,
published 1.0.0, main and release history must remain unchanged. Use backup and
native MODX Package Manager on a disposable/staging installation before deployment.
