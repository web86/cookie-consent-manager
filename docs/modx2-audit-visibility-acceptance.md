# Hidden category accept-all audit fix

Date: 2026-10-15. Base: main `44e4fef`. Branch:
`fix/modx2-accept-all-hidden-categories`.
Issue: [#5](https://github.com/web86/cookie-consent-manager/issues/5).
The separate Fenom JSON fix remains in [PR #4](https://github.com/web86/cookie-consent-manager/pull/4);
this branch is independently based on main and does not include it.

The reported production Safari request legitimately granted analytics and
external content, kept hidden marketing false, and allowed Yandex, Mail.Ru and
Yandex Maps. The validator required all three categories regardless of their
server configuration, so the receiver returned `400 invalid_payload` before
writing a record. Both `accept_all` and the compatible schema 2 `accept` action
shared this incorrect assumption.

## Change and trust boundary

- The MODX wrapper reads `cookie_consent.options` directly from
  `modSystemSetting`, alongside the validated service registry. It uses the
  existing options validator/category resolver, including the old service-based
  visibility fallback for options without explicit categories. Request, user
  and context overrides are never used.
- The HTTP adapter and logger pass that trusted visibility to the validator.
  The new optional arguments preserve the historical all-visible behavior of
  independent callers that do not supply visibility.
- Schema 2 accept/accept-all requires every visible category to be true and
  every enabled provider in those categories to be true. Hidden categories
  must remain false; hidden provider permissions may be false or omitted and
  cannot be granted. Enabled services remain required even if another service
  in the same category is already allowed. A visible category with no services
  still requires the category grant.
- Schema 2 events generally cannot grant a hidden category. Existing strict
  field/type/ID/action/target/provider checks remain intact, including rejection
  of unknown/disabled provider keys, inconsistent actions and missing grants.
  Invalid trusted visibility fails closed. Origin and replay/rate checks are
  unchanged.
- Legacy schema 1 field sets and action semantics remain unchanged, including
  the original requirement for analytics and marketing on accept/accept-all.
  Persisted consent, fingerprints, category/policy versions, audit schemas,
  frontend behavior, provider IDs and marketing permissions are unchanged.

Changed runtime files are `server/modx2-public-endpoint.example.php`,
`server/public/audit.php`, `server/src/CookieConsentAuditLogger.php` and
`server/src/CookieConsentEventValidator.php`. All four must be delivered together
in a later reviewed release, including the installed public wrapper. An old
custom wrapper that omits visibility retains the old strict behavior; there is
no fallback to trusting browser-supplied category configuration.

## Genuine execution evidence

An isolated local MODX **2.8.8-pl** site on port 18989 uses PHP **8.2.34**,
upstream pdoTools **2.14.1** at
`a7a9a3366249c6689cefba5c2b901ada43a7df79` and its locked Fenom **2.12.0**.
It has separate `cookie_consent_audit_visibility` DB, private config/logs and
site/cache paths. It clones the repository's synthetic local fixture, not the
affected website. Source files are provisioned directly; no package is built.

With original main's four audit files, the reported selection returns HTTP 400
`{"ok":false,"error":"invalid_payload"}`; the monthly file does not change and
there is no matching record. After installing the fixed source in this clone,
the same selection with a fresh synthetic event ID returns HTTP 200 with
`ok=true`, the **same event_id** and a server timestamp. Reading the actual
`YYYY-MM-cookie-consent.log` JSONL file finds exactly one matching event with:

```json
{
  "event": "accept_all",
  "categories": {
    "necessary": true,
    "analytics": true,
    "marketing": false,
    "external_content": true
  },
  "providers": {"yandex": true, "mailru": true, "yandex_maps": true},
  "provider": null
}
```

The real audit POST reaches the public MODX wrapper, adapter, validator, rate
limiter and file logger. Audit responses are **not intercepted**. Replaying it
returns 409 and leaves one record. Vendor SDK/map traffic is fulfilled locally;
no real vendor analytics events are transmitted. The fixture's public wrapper
and private PHP files are switched between original/fixed versions, restarting
only its own container to eliminate stale OPcache ambiguity.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Original production selection failure | PASS (reproduced) | Actual HTTP 400, unchanged file length, zero matching records |
| Fixed exact selection | PASS | Actual HTTP 200, matching event_id, correct physical monthly JSONL record |
| RU/EN standard tags, Fenom split and legacy pages | PASS | Fresh contexts; cold `database` and warm `cache` response markers; real browser accept-all and log verification |
| All eight visibility masks | PASS | Enabled analytics/marketing/Maps services; cold/warm Fenom pages; browser flags/provider permissions equal server visibility |
| Forged or inconsistent payloads | PASS | 400; no log append; disabled/unknown providers, hidden grants, omitted visible providers, bad fields/types/actions/IDs |
| Origin/replay | PASS | Forged origin 403; duplicate 409; exactly one matching record |
| Stale cached page | PASS | Receiver uses updated DB visibility without clearing resource cache; old grant rejected, corrected selection accepted |
| Conflicting context settings | PASS | System visibility wins over context configuration |
| Legacy options and schema 1 | PASS | Service-derived visibility fallback; unchanged old schema acceptance/rejection |
| HTTP/browser total | PASS | 20 cases, 742 assertions, zero failures |
| PHP tests | PASS | 11 suites, 3,764 assertions: new exhaustive matrix 3,115 + ten existing suites 649 |
| Syntax | PASS | 96 PHP files and 95 JS/MJS files; new Python scripts parse |
| Production Safari / affected-site acceptance | NOT RUN | User provided the original observation; no site URL, config or authenticated access supplied for independent checks |
| PHP 8.1 specifically / native transport install-upgrade / full historical Manager matrix | NOT RUN | PHP 8.2 source fixture used; these paths are not claimed |

`tests/audit-visibility/php.php` exhausts all 8 visibility masks × 8 category
states × 16 provider states for each of `accept_all`, `accept`, `save_settings`,
then checks production selection, old schemas and malformed/forged cases.
No current marketing setting is changed merely to accept the reported payload.

Reproduction: [tests/audit-visibility/README.md](../tests/audit-visibility/README.md).
Generated evidence is in `.local/audit-visibility/evidence/results.json` and
`regression.json`; real synthetic logs remain in the private ignored fixture.
No production changes, merge, deployment or transport ZIP publication occurred.
The code is ready for PR review and affected-site staging verification; actual
production acceptance remains NOT RUN.
