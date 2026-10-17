# MODX 3 version matrix

Only new `.local/modx3-matrix/` fixtures are allowed. These runners do not use
`tests/modx3/compose.yaml`, its databases, or other projects. Every matrix cell
owns a compose project, MariaDB container/volume, database, site, credentials and
logs. Apache binds to `127.0.0.1:21800–21811`; MariaDB has no published port.
Browser routing intercepts external SDKs and iframe responses locally. It tests
adapter initiation and consent gating, not vendor account acceptance/playback.

Download the six **full official distributions** (not GitHub source archives) to
`.local/modx3-matrix/download/modx-VERSION-pl.zip`, from
`https://modx.s3.amazonaws.com/releases/VERSION/modx-VERSION-pl.zip`.
Versions: `3.1.2`, `3.2.0`, `3.2.1`, `3.2.2`, `3.2.3`, `3.2.4`.
Do not run Composer update or replace the bundled xPDO dependencies.

```sh
python3 tests/modx3-matrix/analyze.py
# Review api-diff.txt before installing a CMS.
docker build -t cookie-consent-modx3-php81:local tests/modx3
docker build -t cookie-consent-matrix-php82:local tests/modx3-matrix
python3 tests/modx3-matrix/prepare.py
python3 tests/modx3-matrix/driver.py setup m324p81
python3 tests/modx3-matrix/candidates.py
```

`candidates.py` creates ignored source copies with the proposed range. It does
not change tracked release requirements. pl2 is a local predecessor used to test
a genuine Package Manager upgrade to pl3. Neither candidate is published.
Build both with native `_build/build.php` inside the new m324p81 container,
using `/opt/cc-matrix/candidate-plN` as source and `/opt/cc-matrix/artifacts/plN`
as output. Also build the unchanged pl1 baseline from `/opt/cc-source` into
`/opt/cc-matrix/artifacts/baseline`. Normalize each new ZIP with
`_build/normalize.py`. Never overwrite an existing ZIP or change bytes under
an already installed signature.

```sh
python3 tests/modx3-matrix/run.py
# Both must complete all 23 browser groups before the CMS upgrade:
python3 tests/modx3-matrix/upgrade.py m312p81 m312p82
node tests/modx3-matrix/upgrade.mjs m312p81 m312p82
```

The CMS upgrade preserves generated config files, overlays the official 3.2.4
distribution and runs its CLI setup in `upgrade` mode. It dumps only the case's
own database into its private directory first. It compares component settings,
logs, element IDs and the owner adapter before/after, then checks the installed
frontend and Manager without reinstalling the component. `--continue` is only
for the guarded pre-overlay safety stop; it requires the original snapshot to
remain identical. It must not be used to repeat a completed upgrade.

After acceptance, widen tracked metadata/build/preflight together, generate the
runtime version and run `requirements.php` in PHP 8.1 and 8.2 containers. This
checks the real preflight boundary with the official xPDO autoloader, including
rejection below 3.1.2 and at/above 3.3.0. Full allowed paths are exercised through
native Package Manager in every browser cell. Build the final artifact in a new
output directory and verify its checksum and native inventory.

The accepted release uses **pl4**, with pl2/pl3 reserved as unpublished test
predecessors. Run the exact final ZIP again on entirely new installations after
regenerating both runtime version and frontend manifest. The extra native
assertion checks `frontend-manifest.package_version` and the adapter checksum
state against the installed runtime version.

For this second campaign, use `.local/modx3-matrix-final/`, reuse only the public
download cache, and set the following before `prepare.py` and `run.py`:

```sh
export CC_MATRIX_DIRECTORY=.local/modx3-matrix-final
export CC_MATRIX_PROJECT_PREFIX=cc3-matrix-final
export CC_MATRIX_PORT_BASE=21900
export CC_MATRIX_WORKERS=3
export CC_MATRIX_SIGNATURE=cookieconsent3-1.0.8-pl4
export CC_MATRIX_ARTIFACTS=.local/modx3-matrix/artifacts/release-pl4
export CC_MATRIX_PRIOR_SIGNATURE=cookieconsent3-1.0.8-pl3
export CC_MATRIX_PRIOR_FOLDER=.local/modx3-matrix/artifacts/pl3
export CC_MATRIX_BASELINE_FOLDER=.local/modx3-matrix/artifacts/baseline
export CC_MATRIX_EXPECTED_VERSION=1.0.8-pl4
```

The CLI CMS upgrade and browser upgrade check use the same directory override.
`export.py` refuses incomplete matrices or migrations. Export the final campaign
with `CC_MATRIX_FINAL=1` and
`CC_MATRIX_SHARED_EVIDENCE=.local/modx3-matrix`; it writes a separate final JSON
and preserves the initial acceptance report. `CC_MATRIX_RESUME=1` is restricted
to an interrupted browser run with passing completed groups: it preserves the
old JSON with exclusive creation, verifies the installed signature and continues
on the same site without replaying the fresh-install assertion or resetting DBs.

Run the strict native lifecycle campaign on another fresh directory,
`.local/modx3-matrix-lifecycle/`, project prefix `cc3-matrix-lifecycle`, ports
22000–22011, with the same pl3/pl4 artifact paths and `CC_MATRIX_NATIVE_ONLY=1`.
It runs four groups per cell: fresh native installation with aliases OFF, the
expected rejection of audit setup without Origin, valid setup with Origin and
`partial=false`, then native upgrade/reinstall with a **nonempty seeded private
consent log**, a modified adapter and exact before/after hashes. It also checks
that custom JS stays blocked before consent and that both pre/post-upgrade HTTP
deliveries return 200. Upgrade its two 3.1.2 cases to 3.2.4 afterward; this adds
Strict CMS migration with real private log and audit queue/key preservation to
the full campaign's Legacy migration.

API helpers must send the real Manager Origin/Referer. `success=true` alone is
insufficient for Save: assert `partial=false`, the requested log directory and
`auditStatus.state=ready`. The negative missing-Origin control expects partial
Save and audit HTTP 503 **before** valid setup. Subsequent consent requests must
be accepted. Earlier raw evidence is retained and annotated as preliminary,
not independently used as a release gate.

Docker may exhaust its default network address pools when many disposable stacks
are retained. After a campaign has completed, use `driver.py archive` with its
directory override: this first preserves Docker logs, then uses compose `down`
without `--volumes`/`--rmi`. Sites, credentials, SQL snapshots and named DB volumes
remain available for review. Never use global prune or modify other projects.

Evidence is append-only at the run level. A failed installation caused by an
incomplete PHP image may continue only after verifying the case's database has
zero tables. It is neither unsupported PHP nor a PASS. A configured site or
nonempty failed database must be preserved and investigated. Runners refuse to
reset an existing accepted site. Root cannot validate permission-denial tests:
run `tests/adapter-cache/php.php` as `www-data`.

Stop only these compose projects after testing; preserve their private data and
evidence for review. Never publish these older MODX installations. Technical
compatibility does not replace updating MODX to a maintained secure version.
