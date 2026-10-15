# MODX 2 1.0.3-beta1 transport candidate

Date: 2026-10-15. Draft integration PR: [#7](https://github.com/web86/cookie-consent-manager/pull/7).
The existing PR branch remains `release/modx2-1.0.2-beta1` to preserve review history.
This candidate supersedes 1.0.2-beta1, which sorts below installed stable 1.0.2.

Actual `_build/package.json` metadata: **version 1.0.3, release beta, release_index 1**.
Native signature: **cookieconsent-1.0.3-beta1**. Changelog updated inside the package.
Build source commit: `1794d6850d7ab271c9b49e1fbe7dcf99ef2def26`.
Subsequent commits contain only acceptance harness/evidence/documentation updates.

Both integrated fixes remain unchanged: Fenom JSON registration from PR #4 and
visibility-aware strict HTTP audit validation from PR #6. All **55 runtime file
hashes and 14 native object definitions** equal the previous beta inventory,
including the five canonical database element sources. Marketing permissions
and audit validation have no functional changes. Original PRs remain unmerged.

## Artifact and independent builds

ZIP: `.local/beta103/build-a/cookieconsent-1.0.3-beta1.transport.zip`
(183,286 bytes), with adjacent checksum/source inventory/ZIP inventory.

```text
SHA256 3e4b5a6227429516ea90a186f954ad875fe4da0c067c0c7796ab197dfc46a02b
```

Two independent native `_build/build.php` runs used separate disposable
containers and separate work/output directories (`build-a`, `build-b`). Both
were normalized with `_build/normalize.py`, then passed `_build/verify.php`.
Both ZIPs, source inventories and normalized ZIP inventories are byte-identical.
This is a rebuilt package with new native metadata, not a renamed old ZIP.

Inventory: **71 native vehicles** (14 object, 55 file, 2 script), **136 ZIP entries**.
Verification covers file payload hashes, canonical update/preservation policy,
defaults, forbidden private/config/log/test paths, secret patterns and SHA256.
Existing stable/beta artifacts are preserved; ZIPs remain ignored and uncommitted.
Only GitHub release v1.0.0 exists; no new release/tag was created.

## Native stable 1.0.2 upgrade

The original stable artifact `.local/artifacts/cookieconsent-1.0.2.transport.zip`
was installed through authenticated native MODX Package Manager processors on a
reset, repository-owned disposable **MODX 2.8.8-pl / PHP 8.2.34** installation.
Stable artifact SHA256:
`dc01bd4c6d5b5e96888a6c6707a92d134daadea7fe506ea741152783153cc506`.

The configured stable installation had custom service IDs/options, hidden
marketing, RU/EN texts, element descriptions/properties, unrelated elements
and settings, audit configuration/key, historical JSONL and a real current-month
HTTP audit record. Browser consent/fingerprints were captured before upgrade.

After uploading/scanning the new ZIP, native checks confirmed:

- Stable row: 1.0.2, empty release, index 0, installed.
- Candidate row: 1.0.3, release `beta`, index 1, initially uninstalled.
- `getComparableVersion()` returns `1.0.3-beta1`; native `compareVersion()`
  confirms it is newer than stable 1.0.2.
- Native Package Manager `getlist` selects the candidate as the current package;
  `version/getlist` puts it before stable 1.0.2. Its changelog identifies 1.0.3-beta1.
- The real native install succeeds and an independent test plugin records
  **OnPackageInstall action 1 (`ACTION_UPGRADE`)** for this signature.

All six component settings, custom service IDs/visibility/translations/texts,
five canonical element IDs/metadata, unrelated elements/settings, audit
configuration/rate-limit key and both `2020-01` and `2026-10` JSONL files retain
their exact snapshot hashes across upgrade. Every installed runtime file and
database-stored canonical source matches the new ZIP inventory. Raw browser
consent, consent ID and fingerprints remain identical; analytics and Yandex Maps
restore without a renewed prompt. Same-beta native reinstall also preserves data.

This proves local native upgrade discovery after upload/scan. Automatic remote
provider update notifications are outside this test; this beta was not published.

## Results on the actual installed ZIP

**25 PASS cases / 778 assertions / 0 failures**:

| Check | Result |
| --- | --- |
| Two independent normalized builds; native verification of each | PASS |
| Runtime/canonical definitions unchanged from previous combined beta | PASS |
| Stable 1.0.2 recognized and upgraded to 1.0.3-beta1 by native PM | PASS |
| Configuration, elements, browser consent, fingerprints and logs preserved | PASS |
| Fresh native installation on MODX 2.8.8 / PHP 8.2.34 | PASS |
| Native reinstall and installed Fenom/HTTP/audit on PHP 8.1.34 | PASS |
| RU/EN; standard tags; Fenom split/legacy; cold/warm MODX cache | PASS |
| Exactly one registry, CSS, JS and banner; no Fenom errors | PASS |
| All eight category visibility combinations | PASS |
| Production selection: analytics=true, marketing=false, external_content=true; all three enabled providers=true | PASS |
| Actual HTTP 200, matching event_id, one physical monthly JSONL record | PASS |
| Forged grants, unknown/missing providers and inconsistent stage rejected | PASS |
| Replay rejected with 409 and no duplicate record | PASS |
| Customer deployment, actual Safari and live vendor delivery | NOT RUN |

Main upgrade matrix: 21 cases / 592 assertions. Fresh/PHP 8.1 matrix: 4 cases /
186 assertions. HTTP audit requests reach the real installed wrapper, receiver,
validator and logger; foreign analytics/map responses are locally fulfilled.
Only upstream pdoTools 2.14.1 / Fenom 2.12.0 dependencies are provisioned separately;
Cookie Consent runtime and database sources arrive exclusively from native ZIPs.

Detailed sanitized evidence: [modx2-1.0.3-beta1-evidence.json](modx2-1.0.3-beta1-evidence.json).
Local reports: `.local/beta103/evidence/`. The broader regression matrix in the
[previous report](modx2-1.0.2-beta1-acceptance.md) remains historical evidence for
the byte-identical runtime; its 16 browser/Manager/public API groups and PHP unit
suites were not repeated for this metadata-only rebuild.

## Reproduce and recommendation

Prepare disposable fixtures with `python3 tests/beta102/prepare.py` (archives old
fixture files and resets only explicitly guarded test databases). Build using
the existing local/transport compose files plus `tests/beta103/compose.yaml`,
service `beta103-builder`, with independent output directories. Run
`node tests/beta103/native.mjs`, then
`CC_BETA103_FRESH_ONLY=1 node tests/beta103/native.mjs`.
The immutable stable 1.0.2 ZIP and pinned upstream pdoTools dependency are prerequisites.

**GO for manual staging acceptance.** Remaining risks are customer-specific
templates/plugins, CSP/proxies, real vendor configuration and browser behavior.
Use this SHA256 and native Package Manager; verify the target site's own HTTP
ACK and JSONL write. No main/original PR merge, stable release, ZIP commit or
production deployment was performed.
