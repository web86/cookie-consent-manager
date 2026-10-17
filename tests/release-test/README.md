# Manual-release acceptance

Use only the existing isolated adapter-updates Docker projects and NEW
`ui-refinement-rt2-*` / `ui-refinement-rt3-*` cases. Never reset/reuse an old DB/site,
replace an installed signature with different ZIP bytes, or target customer sites.
The generic control checks the exact DB destination before bootstrap. MODX 3 uses
native classes with deprecated aliases disabled by the existing fixture finish step.

1. Bump `_build/package.json`; run `node _build/version.mjs` and
   `node _build/frontend.mjs`. Keep existing UI/frontend/adapter contracts.
2. Build with the platform's native `_build/build.php` twice into separate NEW
   output folders; normalize both with `_build/normalize.py`.
3. Run the local, transport and real installed-upgrade suites:

```sh
node tests/release-test/local.mjs
python3 tests/release-test/verify.py /path/a.transport.zip /path/b.transport.zip UI_SOURCE_COMMIT
python3 tests/release-test/native.py 2 unique-run /opt/cc-updates/artifacts/NEW/cookieconsent-1.0.7-beta2.transport.zip
node tests/release-test/web.mjs 2 .local/release-test/modx2/native-unique-run.json
```

Substitute platform 3 / cookieconsent3-0.1.0-beta6 for MODX 3. The original reference
checkouts must remain under `.local/modx2-safe-adapter-updates` and
`.local/modx3-safe-adapter-updates`; the running containers mount them at
`/opt/cc-source` and mount this working checkout at `/opt/cc-reference`.
Existing old ZIPs are used exactly: 1.0.6 and 0.1.0-beta4. No uninstall is performed.
Every native case stores complete before/after snapshots without secret setting
contents. It validates initial SHA baseline, settings/registry/texts, logs, owner
files, edits, deletions, failed-build retention, normal PHP error deltas and reinstall.

The web suite changes only those new fixtures and uses controlled external SDK/player
responses; real delivery/playback is a manual gate. It verifies callbacks, owner JS,
6 iframe instances, Strict/Legacy persistence, exact served bundle hash, no visitor
build, forced build and native cache clear without recursion.

After the web suite, point only the disposable project's active symlink at its
`original` upgraded case, gracefully reload Apache and run the existing full UI suite:

```sh
CC_UI_MODX=2 CC_UI_CASE=ui-refinement-rt2-unique-run-original \
 CC_UI_OUT=.local/release-test/modx2/ui node tests/ui-refinement/native.mjs
python3 tests/ui-refinement/inventory.py /path/candidate.inventory.json 2 ui-refinement-rt2-unique-run-original
python3 tests/release-test/evidence.py 2 unique-run
```

Save verify.py output to `.local/release-test/modxN/transport.json` and installed
inventory output to `installed-inventory.json` before evidence.py. PHP error
snapshots distinguish setup diagnostics/intentional parse failures from new normal
install/upgrade errors. Full snapshots and failed attempts remain in ignored
`.local/release-test/`; compact final evidence goes under docs/evidence.
