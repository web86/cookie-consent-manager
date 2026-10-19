# modstore release acceptance

These scripts create a new disposable Docker project in `.local/modstore-matrix`, using locally verified official MODX archives and existing PHP 8.1/8.2 images. They refuse existing sites/databases. Existing projects are never reset. The preparation script currently expects the two sibling MODX source worktrees under `.local/modstore2` and `.local/modstore3`.

Run `prepare.py`, then `run.py setup`. Build each variant with its native `_build/build.php`, normalize its ZIP, and run `_build/verify.php` and `static.py ZIP`. `run.py fresh` exercises install, forced rebuild, cache event, parse failure and repair. `browser.mjs` covers Strict/Legacy and all three positions, consent changes, SDK request gates, maps/videos/custom services and receiver validation. External SDK responses are intercepted; this verifies load gating rather than actual provider delivery/playback.

`run.py upgrade` uninstalls the clean candidate, installs the previous immutable ZIP, edits a user adapter, adds a custom adapter and foreign JS/CSS-directory files, then upgrades and reinstalls. It checks exact user SHA-256, history, cleanup and rebuild failure. `run.py remove` verifies native removal preserves edits and foreign files.

`http-router.php` is exclusively a test fixture for an internal PHP listener at the configured site-origin port. It allows the ordinary production HTTP checker to reach the test receiver without environment-based URL rewriting. It is never installed by a transport package.

Keep per-case evidence and failures. Historical suites pinned to older source commits remain historical comparisons; they are not substitutes for this release matrix.

Final acceptance also adds two clean final-signature installations via `final-fresh.py`. Use `native-checks.py`, `manager.mjs`, `error.mjs` and `units.py` for the recorded HTTP/restore, real Manager, error-response and target-PHP checks. Run standalone regressions with `node tests/modstore/local.mjs`. The current adapter-update local entry point delegates to this suite; old immutable comparisons remain available as historical scripts.
