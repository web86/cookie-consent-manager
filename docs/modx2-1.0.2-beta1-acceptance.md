# MODX 2 1.0.2-beta1 combined transport candidate

> Historical evidence, superseded by [1.0.3-beta1](modx2-1.0.3-beta1-acceptance.md).
> Do not use this older candidate for stable 1.0.2 upgrades: its prerelease version ranks below stable 1.0.2.

Date: 2026-10-15. Integration branch: `release/modx2-1.0.2-beta1`.
Draft integration PR: [#7](https://github.com/web86/cookie-consent-manager/pull/7).
Base: `origin/main` at `44e4fef8891202512c12f5c0d1a4c4d649b3fcdc`.

Both original PRs remain open, unmerged and independently reviewable:

- [#4](https://github.com/web86/cookie-consent-manager/pull/4), original
  `95d4c1dadf1fa91203d45b97ff7ec965b19a9216`, cherry-picked as `bd51b0c`:
  register the unchanged service JSON outside Fenom parsing, preserving split
  and legacy rendering.
- [#6](https://github.com/web86/cookie-consent-manager/pull/6), original
  `c0747dcfd59fda81715bcf1b1c393d5f25e67193`, cherry-picked as `318d4e0`:
  validate schema 2 accept/accept-all against persisted system visibility and
  enabled services; hidden marketing remains false and forged grants fail.

All original code, tests and findings were retained. The beta metadata and
integration harness were added in `6e3774c` and `e8919a5`. Build source commit:
**`e8919a5d68fadaa8495571417446faf8bc874e20`**. Later acceptance-only commits
update test infrastructure/documentation; every archived runtime source hash is
also checked against the final working source. There are no runtime changes
beyond the two reviewed fixes.

## Artifact and reproducibility

Candidate: `cookieconsent-1.0.2-beta1.transport.zip`, **183,118 bytes**.

```text
SHA256 4dcd257d5c09ff10b0e57b9fb43b8227c7a5a5d68094c12f3d7c1abcd0657e21
```

Ignored local paths:

- `.local/beta102/build-a/cookieconsent-1.0.2-beta1.transport.zip`
- `.local/beta102/build-a/cookieconsent-1.0.2-beta1.transport.zip.sha256`
- `.local/beta102/build-b/cookieconsent-1.0.2-beta1.transport.zip`
- Matching `.inventory.json` and `.zip-inventory.json` beside each ZIP.

The signature was unused before this work. Existing local stable 1.0.1/1.0.2
artifacts were preserved; GitHub's only published release/tag was v1.0.0.
Metadata now explicitly declares version 1.0.2, release beta, index 1. The
changelog identifies a staging candidate; no stable promotion occurred.

Two independent native `modPackageBuilder` runs used separate disposable
containers and work/output directories, the same committed source and fixed
source epoch. Each archive was normalized with `_build/normalize.py` and passed
`_build/verify.php`. The ZIPs and source inventories are byte-identical.

Inventory: **71 native vehicles** — 14 object, 55 file, 2 script; **136 ZIP
entries**. All five canonical elements are present with unique-name update and
metadata-preservation policy. All 55 runtime files match their source hashes,
including Assets, the public audit wrapper, private receiver, logger and
validator. The native verifier checks path traversal, excluded paths, secret
patterns, settings defaults, file vehicle hashes and the archive checksum.
Private configs/credentials, customer data/logs, acceptance fixtures, tests,
repository metadata and dependency trees are absent. Existing supported
product mock-mode assets remain part of the normal native runtime inventory.

The immutable stable archive used for upgrade remains:
`cookieconsent-1.0.0.transport.zip`, SHA256
`0ed4563a2e92cf5e40ba1c269dc0d39bd0acdb6b3fb12a86f734983ce2f4b04b`.

## Actual native installation and preservation

The ZIP was uploaded and installed using authenticated **MODX Package Manager
processors**, not source-file copying. Targets are repository-owned disposable
MODX **2.8.8-pl** installations with independent databases; no customer system
was used. Native installation runs on PHP **8.2.34**, with PHP **8.1.34** native
reinstall and HTTP/Fenom acceptance as an additional runtime.

The native matrix has **24 PASS cases / 840 assertions**, zero failures:

- Fresh beta installation in an empty component database.
- Actual published stable 1.0.0 installation, owner configuration, then beta
  upgrade using the ZIP.
- A second pre-existing configured installation (including local 1.0.2 package
  history) explicitly installed the beta through Package Manager, preserving its
  original data.
- Same-beta native reinstallation, including PHP 8.1.
- Hash verification of **all installed runtime files** and the actual
  **database-stored sources of all five canonical elements** after install,
  upgrade and reinstall.
- Exact hashes of existing service IDs/configuration, category visibility,
  RU/EN translations/custom notices, snippet/chunk IDs and metadata, unrelated
  settings/elements/templates/resources, audit parameters/rate-limit key and
  historical/current monthly JSONL logs retained across transport operations.
- Genuine 1.0.0 browser consent captured before upgrade. Its raw storage,
  consent ID and fingerprints remain byte-identical after native upgrade and
  reload; there is no unnecessary renewed banner, and permitted analytics and
  Yandex Maps load through locally intercepted responses.

The installed package database reports version 1.0.2, release `beta`, index 1.
Native Package Manager's actual Readme and Changelog attributes equal the
repository sources and its pre-install dialog displays the beta changelog.
The test does not click its installation confirmation a second time.

## Combined HTTP, browser and audit behavior

Post-ZIP-install checks cover actual RU/EN contexts, standard MODX tags with the
built-in parser, Fenom split and legacy calls, `database` → `cache` request
markers, and full brace detection `pdotools_fenom_syntax=#\{#`. Compiled Fenom
cache is enabled. Valid pages contain exactly one registry in head, one CSS,
one deferred JS and one banner; no blank page or new Fenom parse error occurs.

The reported selection is accepted by the real installed audit receiver:

```json
{
  "event": "accept_all",
  "stage": "committed",
  "analytics": true,
  "marketing": false,
  "external_content": true,
  "providers": {"yandex": true, "mailru": true, "yandex_maps": true},
  "provider": null
}
```

Tests send the complete schema 2 envelope with fresh synthetic IDs and client
metadata. Example native acceptance ACK: HTTP **200**, event_id
`c98ed6b9-94a7-4667-8209-b58ed24a57b0`; that exact ID is found once in the
physical `2026-10-cookie-consent.log` JSONL file, with marketing=false and the
correct provider flags. Every tested browser accept-all checks its own matching
ACK and physical record. All eight visibility masks pass. Forged hidden grants,
unknown providers, missing visible grants and inconsistent actions return 400
without changing file length. Replay returns 409 and leaves one record.

Audit POSTs reach the real wrapper/receiver/logger and **are not intercepted**.
Vendor SDK/map responses are locally fulfilled or aborted, so no real analytics
events are sent. PHP fixture workers revalidate modified fixture cache files
immediately; native MODX resource and Fenom caching remain enabled and are
verified through response markers. Source and installed-ZIP acceptance are
separate: the preserved source harnesses may provision code in their dedicated
fixtures; native targets get Cookie Consent runtime and canonical sources only
from the actual transport ZIP.

## Test status and scope

The complete generated matrix is summarized in
`.local/beta102/evidence/summary.json` and detailed reports beside it.

- Combined original Fenom suite: **PASS**, 31 cases / 764 assertions, including
  original error reproduction and fixed default/full-detector controls.
- Combined original visibility/audit suite: **PASS**, 20 cases / 742 assertions.
- Native ZIP matrix: **PASS**, 24 cases / 840 assertions.
- PHP 8.1: **PASS**, native reinstall + installed Fenom/ACK/JSONL, and 11 PHP
  suites / 3,764 assertions including exhaustive visibility/provider states.
- PHP 8.2: **PASS**, existing PHP regressions, native contracts/projection and
  exhaustive visibility tests; final PHP/JS syntax sweep is recorded in summary.
- Installed-package broader browser, Manager, translation, audit Viewer/public
  API and HTTP regression results are listed individually in the summary.
- Production/affected-site/Safari acceptance: **NOT RUN**, no site URL or
  authenticated access provided.
- Live vendor delivery/published GTM execution and a full multi-server/TLS
  hosting matrix: **NOT RUN**. Local SDK/network fixtures test consent behavior
  without transmitting vendor analytics events.

The historical public test stand is now self-contained under
`tests/local/stand.html`; it supplies the optional form/ClientID and modal-map
controls used by the existing suite and contains no static registry. This
avoids coupling regressions to a changing marketing demo. The installed
Cookie Consent sources are untouched by fixture preparation.


All **16 installed-package regression groups passed: 453 cases / 2,741 assertions**.

| Group | Cases | Assertions | Result |
| --- | ---: | ---: | --- |
| browser | 281 | 1423 | PASS |
| categories | 23 | 200 | PASS |
| managerCategories | 4 | 73 | PASS |
| callbacks | 13 | 44 | PASS |
| maps | 9 | 42 | PASS |
| clientIdExample | 4 | 13 | PASS |
| localization | 4 | 112 | PASS |
| publicJson | 3 | 84 | PASS |
| liveGuard | 11 | 51 | PASS |
| providerParameters | 4 | 18 | PASS |
| pixels | 32 | 175 | PASS |
| frontend | 9 | 77 | PASS |
| viewer | 11 | 77 | PASS |
| managerUI | 7 | 227 | PASS |
| managerPermissions | 1 | 4 | PASS |
| http | 37 | 121 | PASS |

Package metadata UI adds 1 PASS case / 20 assertions. Final syntax: 100 PHP and
98 JS/MJS files pass; all new Python helpers parse. Final installed hashes on
PHP 8.1, PHP 8.2 and the broader regression instance still match all 55 runtime
files and five canonical database sources. There are **no failing final checks**.

## Staging recommendation

**GO for manual staging acceptance only.** The archive includes both fixes, is
reproducible and passes actual native installation/upgrade/reinstall and the
combined applicable test matrix. The committed sanitized evidence is
[modx2-1.0.2-beta1-evidence.json](modx2-1.0.2-beta1-evidence.json).
Manual staging should back up database, canonical element sources and logs;
verify this SHA256; install this exact beta through native Package Manager;
clear the site's MODX/HTML cache; then check its own templates, plugins,
contexts and actual audit acknowledgement/logs. The package replaces the five
canonical sources while retaining their identity/metadata; owner source edits
must be reviewed against the new canonical code.

A prerelease sorts below stable 1.0.2; use explicit Upload/Install on staging
that already has the local stable 1.0.2 candidate. Automatic newer-version
discovery is not claimed. Customer-specific final-output reparsing plugins,
proxies/CSP, real vendor
configuration and browser/hosting differences remain staging risks. The
closing `</head>` required for startup registration must exist. This is a beta
candidate for manual staging acceptance, not authorization for production.
No main merge, original PR merge, stable release, ZIP commit or production
deployment occurred.
