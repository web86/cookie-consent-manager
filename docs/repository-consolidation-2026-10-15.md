# MODX 2 repository consolidation — 2026-10-15

`main` integrates #7 (MODX 2) and #9 (CSP FAQ). Package metadata is `cookieconsent / 1.0.3 / beta / 1`. #7 contains patch-identical copies of #4 (`95d4c1d` → `bd51b0c`) and #6 (`c0747dc` → `318d4e0`), plus native metadata, install/upgrade tests and acceptance documentation. Their original commits remain archived; they are superseded rather than merged a second time. MODX 3 was integrated independently into `modx3`.

Published stable GitHub release remains **v1.0.0**. The source candidate **1.0.3-beta1** is tested for **manual staging acceptance only**, with customer production/Safari/live vendor delivery still NOT RUN. The original [25 PASS / 778 assertions report](modx2-1.0.3-beta1-acceptance.md), [machine evidence](modx2-1.0.3-beta1-evidence.json), [Fenom report](modx2-fenom-acceptance.md) and [visibility report](modx2-audit-visibility-acceptance.md) remain unchanged. The historical 1.0.2 transport is an upgrade test input, not a newly published GitHub release.

## Consolidation verification

- PHP: **13 suites / 3,871 assertions / 0 failures** (12 Fenom/general suites plus exhaustive visibility validation).
- Browser/provider matrix: **281 scenarios / 1,423 assertions / 0 failures**.
- Syntax: **101 PHP / 99 JS or MJS files**, PASS.
- Existing native transport verifier: PASS, **71 vehicles / 55 runtime files / 136 ZIP entries**.
- SHA256: `3e4b5a6227429516ea90a186f954ad875fe4da0c067c0c7796ab197dfc46a02b`, **183,286 bytes**. No rebuild or artifact alteration. Runtime sources match the verified inventory.
- Canonical `server`, `assets`, `core` and `_build` trees match the verified #7 head exactly. No MODX 3 integration commits entered `main`.

Commands: `python3 tests/fenom/regression.py`; the existing `tests/audit-visibility/php.php` inside its disposable container; `node tests/browser.mjs`; `_build/verify.php` against the existing beta ZIP. The historical native lifecycle matrix was retained rather than needlessly rebuilding/reinstalling the same transport.

[Sanitized consolidation summary](evidence/repository-consolidation-2026-10-15.json). MODX 3 remains NO-GO with the independent pdoTools3 blocker in [issue #11](https://github.com/web86/cookie-consent-manager/issues/11).

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
