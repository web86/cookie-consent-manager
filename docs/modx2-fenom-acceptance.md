# CookieConsentAssets Fenom compatibility acceptance

Date: 2026-10-15. Base: `main` at `44e4fef`. Branch:
`fix/modx2-fenom-json-output`. Issue: [#3](https://github.com/web86/cookie-consent-manager/issues/3).

The runtime change is confined to `server/modx2-assets-snippet.php`: register the
existing safely encoded `cc-service-registry` block using
`regClientStartupHTMLBlock()` and return only the existing CSS/deferred-JS tags.
The schema, projection, JSON escaping, bundles, content-hash URLs, fingerprint
calculation, consent/category versions and browser storage code are unchanged.
`CookieConsent`, Banner, Texts and BannerRenderer need no runtime changes.

## Evidence and cause

The independent local HTTP site on port 18988 runs genuine MODX 2.8.8-pl,
PHP 8.2.34, pdoTools 2.14.1 (upstream commit
`a7a9a3366249c6689cefba5c2b901ada43a7df79`) and its locked Fenom 2.12.0.
Both MODX resource cache and compiled Fenom cache are enabled. It is an isolated
clone of this repository's synthetic MODX 2 acceptance fixture, with its own
`cookie_consent_fenom` DB and filesystem. It is **not** a clone of the affected
customer website. Dependencies are unmodified upstream sources; no template
engine/parser stand-ins are used.

With `pdotools_fenom_syntax=#\{#`, the exact recommended Fenom split calls on the
original code return HTTP 200 with **zero response bytes**, cold and warm, in
both actual RU/EN contexts. The new log entry is:

```text
(ERROR @ /opt/cc-private/core/components/pdotools/model/pdotools/pdotools.class.php : 999) Unexpected token ':' in 95e7b16c7b39d2bbb4cb08c9943f718e line 1, near '{"schema":' <- there
```

The original legacy integration renders under the same configuration. The
original simple split template also renders under the upstream default syntax
detector. Therefore this test confirms the returned-JSON failure mechanism,
including the reported error location, **not the unavailable production
configuration**. pdoTools documents its configurable
[page parser and Fenom settings](https://docs.modx.pro/en/components/pdotools/parser).

`modScript::process()` can pass snippet output back through pdoParser/Fenom;
JSON string escaping protects user delimiters but leaves necessary structural
braces. MODX 2.8.8 `modResponse::outputContent()` inserts startup HTML after
`resource->prepare()` completes parsing. Registration therefore keeps the JSON
outside those parser passes. The unmodified legacy wrapper registers only the
returned CSS/JS, while Assets separately registers one JSON block. Native MODX
registration deduplicates identical blocks. Both modes produce one registry in
`head`, one CSS, one deferred JS and one banner. Split Banner stays at its call
site; the deferred bundle sees the registry even when MODX inserts it after the
bundle tag.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Original configured Fenom failure, RU/EN, cold/warm | PASS (failure reproduced) | Empty HTTP 200; exact error above |
| Original default-detector simple split control | PASS | Rendered page; avoids overclaiming failure scope |
| Fixed standard MODX split, Fenom split, Fenom legacy | PASS | 31 HTTP/browser cases; 764 assertions, zero failures |
| RU/EN, cold/warm, default/full brace detection | PASS | Fixed pages report `database` then `cache`; no new MODX errors on valid requests |
| Unique registry/banner/CSS/JS; correct placement/hash URLs | PASS | Browser DOM, native API and exact content-hash checks |
| Existing registry bytes and consent fingerprints | PASS | Equal to original legacy output in RU/EN |
| Previously stored consent after fix/reload | PASS | Raw localStorage unchanged; no renewed banner; permitted analytics/Maps load |
| Fresh visits, rejection, reopening, analytics-only, Maps grant/reload | PASS | Intercepted live-mode URLs; no third-party requests before consent |
| Invalid server registry and malformed browser JSON | PASS | Safe empty registry / no providers; no Fenom error or external request |
| Native MODX snippet API/legacy deduplication/escaping/settings | PASS | 20 assertions |
| Existing PHP regressions | PASS | 11 suites, including public registry projection, audit, localization, SSR, configuration and category compatibility |
| Source syntax | PASS | 96 PHP files, 95 JS/MJS files; both new Python scripts parse |
| Affected website / its staging clone / production logs | NOT RUN | No URL, access or actual settings/template supplied |
| PHP 8.1 specifically | NOT RUN | PHP 8.2.34 used (within requested PHP 8.1+ target) |
| Native transport install/upgrade and historical full Manager/browser matrices | NOT RUN | No package build; only direct source snippet provision in the isolated DB |

Reproduction: [tests/fenom/README.md](../tests/fenom/README.md). Raw generated
reports: `.local/fenom/evidence/results.json` and `regression.json`; persisted
profiles remain ignored. All vendor SDK/map responses and audit POSTs were
fulfilled locally. No real analytics events were sent. No existing fixture,
production template, consent state or cache was modified. No transport ZIP was
built/published, no deployment or main merge performed.

## Risk and release decision

The implementation has low scope: one existing JSON block changes delivery
channel. Templates need the documented closing `</head>` for MODX injection;
this is already required by the legacy integration. Plugins that reparse final
HTML in `OnWebPagePrerender` after script injection are outside this verified
path. Existing consumers of the Assets *return value* must now inspect the
registered startup HTML too; projection/performance test helpers were updated.

The genuine MODX 2/Fenom implementation gate passes in this isolated site,
including legacy compatibility and cache behavior. **NO-GO for production
release** until the affected website's staging clone confirms its actual parser
settings, templates, plugins and delivery behavior. Production acceptance is
NOT RUN, not a claimed real-site PASS. The change is ready for PR review and
that staging verification.
