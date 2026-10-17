# MODX 2 compatibility acceptance

Read [the result and limits](../../docs/modx2-version-compatibility.md) first.
These commands are only for repository-owned disposable Docker fixtures. They
refuse existing setup/build output. Preserve `.local/modx2-compatibility/` rather
than resetting databases or replacing archives under an installed signature.

Prerequisites: Docker, Python 3.9+, Node 22, `npm ci`, Playwright Chromium and
the complete PHP/Apache images `cookie-consent-modx3-php81:local` (PHP 8.1.34)
and `cookie-consent-matrix-php82:local` (PHP 8.2.34). The first image's historical
name does not contain a MODX installation: all CMS files come from official ZIPs.
Both images need pdo_mysql, mysqli, dom, mbstring, gd, zip and pcntl.

1. Download official MODX 2.8.4–2.8.8 `-pl.zip` into
   `.local/modx2-compatibility/download/`. URLs and SHA256 are in the committed
   evidence. Run `python3 tests/modx2-compatibility/audit.py`; inspect every diff
   under the ignored `api-diffs/` before installing anything.
2. Run `prepare.py`, then `driver.py setup`. Each case has an independent
   MariaDB container/volume/database, directory and loopback port.
3. Run `candidates.py`, then `build.py`. It creates immutable test-only pl2/pl3
   sources and native transports, normalizes ZIP metadata, verifies the inventory.
4. Run `targeted.php VERSION` and `requirements.php` via each case's web container.
   The former uses each original xPDO tree in a separate process and an empty
   private cache directory. For the latter set
   `CC_MATRIX_SOURCE_ROOT=/opt/cc-matrix/candidate-pl3` before final source changes.
   Preserve their JSON output as `evidence/targeted.json` (five results) and
   `requirements-candidate.json`. Do not suppress PHP stderr.
5. Run `node tests/modx2-compatibility/browser.mjs`. Its real ACK/JSONL test must
   never be replaced by a mocked audit response. `CC_MATRIX_RESUME=1` retains
   completed PASS and archives a failed attempt before retrying unfinished work.
6. Run `integrity.py` and `logs.py pre-upgrade`. Switch only m284p81 to Strict
   via `fixture.php mode strict`; the other fixture remains Legacy. Run
   `upgrade.py m284p81 m284p82`, then
   `node tests/modx2-compatibility/upgrade.mjs m284p81 m284p82`.
   The CLI preserves database dumps, active config files, snapshots and audit-key
   hashes. Component reinstall is not part of the CMS upgrade browser test.
7. `baseline.mjs` is a short regression on the existing release-test fixture
   `ui-refinement-banner2-pl1-a` on port 22888. It verifies its exact database and
   active directory before any operation and expects the original pl1 package.
   It preserves its initial snapshot and refuses overwriting the evidence.
   That fixture is already upgraded after this run; do not reset it to rerun.
8. After acceptance, synchronize requirements and release stamps in the working
   feature branch; run `final-build.py`. Both native builds must match the tested
   candidate byte-for-byte. It also saves final-source preflight boundary results.
9. Run `prepare.py --final`, `CC_MATRIX_FINAL=1 python3
   tests/modx2-compatibility/driver.py setup`, `node
   tests/modx2-compatibility/final.mjs`, and `integrity.py --final`.
   This is the focused fresh-final-ZIP/cache/vendor check, not another complete
   acceptance run. Record `upstream.php` output from each final container as
   `evidence/upstream-rss.json`: it reproduces the original RSS warning without
   loading the component.
10. Run `logs.py final` and `export.py`. Export fails for incomplete reports,
    failed assertions, changed original files, preservation failures, unexpected
    diagnostics or different candidate/final ZIP bytes. Raw logs, credentials,
    SQL dumps and full settings snapshots stay in ignored `.local/`.
11. Stop the new projects with `driver.py stop` and the same command with
    `CC_MATRIX_FINAL=1`. Keep the existing baseline infrastructure and all volumes.

The diagnostics gate classifies the original CMS warnings by exact source/message;
it does not claim an empty MODX error log. First-attempt test harness failures
are preserved separately from the completed acceptance results.
