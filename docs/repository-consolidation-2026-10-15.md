# MODX 3 development integration — 2026-10-15

`modx3` integrates #8 (native beta3 implementation) and #10 (CSP FAQ). Package metadata remains **`cookieconsent3 / 0.1.0 / beta / 3`**. Native MODX 3 namespaces, xPDO 3 vehicles/builders and aliases OFF are preserved. No MODX 2 branch was merged into this implementation; only the reviewed Fenom registration and visibility behavior was intentionally ported in #8. Both beta3 documentation and CSP troubleshooting are present.

**Original acceptance remains 510 PASS / 4 FAIL. Full staging/release gate remains NO-GO.** Integration does not promote beta3 to stable or production ready. The unchanged [acceptance report](modx3-beta3-acceptance.md), [machine evidence](evidence/modx3-beta3-results.json) and [exact reproduction](../tests/modx3-beta3/README.md) remain accessible. Track the dependency fix and mandatory revalidation in [issue #11](https://github.com/web86/cookie-consent-manager/issues/11).

## Consolidation verification

- PHP 8.1.34 and 8.2.34: **22 suites / 7,528 assertions / 0 failures**.
- Browser/provider matrix: **281 scenarios / 1,423 assertions / 0 failures**.
- Focused native-runtime matrix: **26 cases / 466 assertions: 22 PASS / 4 FAIL**. The only failures are RU/EN × split/legacy warm compiled Fenom cache, HTTP 500. Native tags cold/warm, cold Fenom, all visibility masks, real HTTP ACK/physical JSONL, forged grants, wrong origin, replay and schema 1 checks pass.
- Independent `Hello {$name}` probe without Cookie Consent reconfirms cold PASS / warm FAIL on PHP 8.1 and PHP 8.2 with official unmodified pdoTools3 3.1.0. Compiled cache stayed enabled; assertions were not weakened.
- Syntax: **100 PHP / 108 JS or MJS / 19 Python files**, PASS.
- Existing native transport verifier: PASS, **71 namespaced vehicles / 55 runtime files / 136 ZIP entries**.
- SHA256: `b762e36d19449f76b4cac1ac4a9fa82aad9e80757875959d778806b2a9d6687f`, **188,950 bytes**. No rebuild or artifact alteration. Runtime sources match the verified inventory.
- Canonical `server`, `assets`, `core` and `_build` trees match the verified #8 head exactly. Native builder/verifier match the original `modx3` base.

Commands: `node tests/modx3-beta3/php.mjs`, `node tests/modx3-beta3/upstream.mjs`, `node tests/browser.mjs`, the focused `CC3_FOCUS_ONLY=1` native matrix, syntax checks and `_build/verify.php` against the existing ZIP. The historical install/upgrade lifecycle evidence was preserved; it was not relabeled as a new run.

Rerun harness notes: the clean fixture shares its database/runtime with the PHP 8.2 port. An initial run retained origin 18891 and produced fixture-origin 403s; its baseline was restored to 18889 before the recorded final run. Concurrent diagnostic cache refreshes were stopped. The original browser response-body read also stalled during navigation; a temporary copy of the focused harness used the existing PHP 8.2 suite's `route.fetch()` capture of real ACK bytes before fulfillment. It added a backend HTTP 200 assertion and retained all original HTTP, payload, cache and physical JSONL assertions. Each request reached the real backend once. No runtime/test-source bypass was committed. The final four failures are retained as FAIL, not expected successes.

[Sanitized consolidation summary](evidence/repository-consolidation-2026-10-15.json). Customer production/Safari/live vendor acceptance and native PHP 8.2 Package Manager install remain NOT RUN as stated in the original report.

## Preserved history and cleanup gates

Remote rollback tags preserve the canonical heads before consolidation:

| Tag | Original SHA |
| --- | --- |
| `rollback/consolidation-2026-10-15/main` | `44e4fef8891202512c12f5c0d1a4c4d649b3fcdc` |
| `rollback/consolidation-2026-10-15/modx3` | `23cff8760e3a1c565ec6a8952d73b0e2aa53630c` |

Remote `archive/consolidation-2026-10-15/` tags preserve every temporary branch head:

| Archive tag suffix | Original branch | SHA |
| --- | --- | --- |
| `modx2-fenom-json-output` | `fix/modx2-fenom-json-output` | `95d4c1dadf1fa91203d45b97ff7ec965b19a9216` |
| `modx2-hidden-categories` | `fix/modx2-accept-all-hidden-categories` | `c0747dcfd59fda81715bcf1b1c393d5f25e67193` |
| `modx2-integration` | `release/modx2-1.0.2-beta1` | `7d9a270b4258bf717da51532741500b8b31e5227` |
| `modx3-beta3` | `fix/modx3-fenom-audit-beta3` | `12a6df9fd782ebf558c5f44a9ebaf4246cf42bc0` |
| `modx2-csp-faq` | `docs/modx2-csp-faq` | `3a9d080f58fe4eb2f53275c326aa58d51e5402e1` |
| `modx3-csp-faq` | `docs/modx3-csp-faq` | `236a5f577ab671d81dc6554b1a8adedd6c91c330` |

These are archival Git references, not stable release publications. The six original branch heads are eligible for deletion only after PR #7/#8/#9/#10 are merged, #4/#6 are explicitly closed as superseded, canonical verification succeeds and no worktree depends on an obsolete branch. Deletion must use the recorded heads as leases and stop if a remote head has changed. Older local feature heads are all ancestors of `main`. The existing worktrees now use `main` and `modx3`; ignored artifacts, dependencies, fixtures and logs remain in place.

Both CSP sections are preserved. Original acceptance documents, sanitized machine evidence, SHA256 references and the exact upstream probe remain byte-identical to their integration sources. PR #7/#8 evidence links are pinned to immutable commits so removal of branch names cannot break those links. No third-party vendor code, package family, native builder, runtime or verified transport was changed during consolidation; only status documentation was added afterward. Credential-marker and excluded-path checks found no new package secrets, local artifacts or customer data. No deployment or stable release publication was performed.
