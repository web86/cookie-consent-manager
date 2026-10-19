# MODX 3 banner title and position - 1.0.8

Review branch: `codex/modx3-banner-layout`, based on current `modx3`
`4815e645bf6d231a4da72a8f773c5f25aaa5f71c`. Version 1.0.8 was confirmed by the user.

## Behavior and compatibility

`banner_title` uses the existing Texts dictionary and plain-text validation.
Missing translations inherit the base language; an explicit empty value suppresses
fallback. The PHP renderer adds an escaped h2 inside the existing text container
only for a non-whitespace title. There is no new template or visitor JavaScript.

`options.banner_position` accepts `bottom`, `bottom-right`, `bottom-left`.
Old four- and six-field options remain valid and resolve to bottom. Settings are
saved by the existing Manager transaction. No database migration is added.
The new appearance section precedes the journal inside Advanced settings.

Only compact layouts get a class. They share 400px responsive rules; left/right
position is the difference. At 650px and below both use the existing bottom bar
with safe-area padding. Long cards scroll within the viewport, including buttons.
Default CSS is retained verbatim before appended opt-in rules. An empty title
with default layout produces byte-identical existing renderer fixture output.
Custom color/font/button CSS selectors still apply. Integrator position overrides
may intentionally supersede the selected layout, as with existing site CSS.

Sidebar preview source and its resulting HTML are unchanged by either setting.
Consent runtime, callbacks, adapters, SHA256 policy, PHP build/cache mechanism,
journal reader and canonical HTML template are unchanged. Native Manager saves
retain policy/category versions, current frontend consent and executable bundle.

Native MODX 3 namespaces, installer, vehicles, requirements and global-alias checks
are preserved. Deprecated aliases were disabled before native package installation.
Shared source and rendering contracts match MODX 2 review commit
`9a6f15c554a304c8d11dd55fb8e43f39960d61b2`; all six corresponding screenshots are byte-identical.
The histories remain separate: no MODX 2 commit is merged/cherry-picked into MODX 3.

## Validation

- New PHP contracts: 118 assertions PASS.
- Existing local regression: 17 suites PASS, including pinned MODX 2 source and 24 rendering profiles.
- Browser matrix: 151 cases / 1867 assertions PASS (RU/EN, Strict/Legacy,
  empty/short/long, all layouts, 1440/650/390/320px, reload/revoke/settings).
- Real Manager: 5 cases / 93 assertions PASS; title/position persistence,
  RU/EN, exact sidebar HTML equality, no new PHP or JS errors, retained consent.
- Existing native UI regression: 15 cases / 167 assertions PASS.
- MODX 3.2.4 / PHP 8.2 native upgrade 0.1.0-beta6 -> 1.0.8 and reinstall PASS:
  settings/translated texts, historical logs, owner files and adapters preserved.
- Two independent native ZIP builds are byte-identical. Closed transport and
  corruption/injection rejection: 475 assertions PASS, 231 runtime files.

See [machine evidence](evidence/modx3-banner-layout-results.json) for package SHA256
and compact results. ZIPs are under the root checkout's ignored
`.local/banner-layout/deliverables/`; no ZIP is tracked or published.

## Screenshots

| Layout | Desktop | Mobile 390px |
| --- | --- | --- |
| Bottom | [image](screenshots/banner-layout/bottom-desktop.png) | [image](screenshots/banner-layout/bottom-mobile.png) |
| Right | [image](screenshots/banner-layout/bottom-right-desktop.png) | [image](screenshots/banner-layout/bottom-right-mobile.png) |
| Left | [image](screenshots/banner-layout/bottom-left-desktop.png) | [image](screenshots/banner-layout/bottom-left-mobile.png) |

## Limits

Chromium was tested. External SDK/player responses were controlled; real external
delivery/playback and physical-device safe-area rendering were not verified.
Existing sites' arbitrary CSS cannot be exhaustively tested. Native UI regression
includes intentional failed-build cases and confirms retention of the prior bundle.
All native checks used a new disposable database/site; old fixtures remain intact.
No changes to main/modx3, pdoTools/Fenom, deployment or public release were made.

## Changed files

- `README.md`
- `_build/changelog.md`
- `_build/frontend-manifest.json`
- `_build/package.json`
- `assets/components/cookieconsent/manager.js`
- `assets/components/cookieconsentmanager3/css/cookie-consent.css`
- `assets/components/cookieconsentmanager3/css/cookie-consent.min.css`
- `assets/components/cookieconsentmanager3/scss/cookie-consent.scss`
- `docs/evidence/modx3-banner-layout-results.json`
- `docs/modx3-banner-layout-acceptance.md`
- `docs/screenshots/banner-layout/bottom-desktop.png`
- `docs/screenshots/banner-layout/bottom-left-desktop.png`
- `docs/screenshots/banner-layout/bottom-left-mobile.png`
- `docs/screenshots/banner-layout/bottom-mobile.png`
- `docs/screenshots/banner-layout/bottom-right-desktop.png`
- `docs/screenshots/banner-layout/bottom-right-mobile.png`
- `server/lexicon/en/default.inc.php`
- `server/lexicon/ru/default.inc.php`
- `server/src/CookieConsentBannerRenderer.php`
- `server/src/CookieConsentSettings.php`
- `server/src/CookieConsentTexts.php`
- `server/src/CookieConsentVersion.php`
- `tests/adapter-updates/control.php`
- `tests/banner-layout/README.md`
- `tests/banner-layout/browser.mjs`
- `tests/banner-layout/fixture.php`
- `tests/banner-layout/install.php`
- `tests/banner-layout/native.mjs`
- `tests/banner-layout/php.php`
- `tests/modx3-sync/contracts.mjs`
- `tests/modx3-sync/php-differential.mjs`
- `tests/release-test/control.php`
- `tests/ui-refinement/native.mjs`
