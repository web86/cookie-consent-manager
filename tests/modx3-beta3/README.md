# MODX 3 beta3 integration acceptance

Only the guarded disposable MODX 3.2.4 fixtures, aliases OFF. Keep the separate
MODX 2 checkout, databases, containers and artifacts unchanged. The Docker project
is `cookie-consent-modx3-beta3`; the guard marker remains the existing explicit
MODX 3 disposable marker. Use a new `.local/modx3` root for these fixtures and
preserve beta1/beta2 archives; never overwrite an existing installation to fake a
fresh-install or genuine-upgrade result.

1. `bash tests/local/setup.sh`: official MODX 3.2.4, isolated database volume,
   PHP 8.1 on ports 18888/18889/18890 and PHP 8.2 on 18891. Source/fixture paths
   are relative to this MODX 3 checkout. Old fixtures using these ports must be
   stopped, with their directories/volumes retained.
2. Preserve/provide the immutable beta2 native archive in
   `.local/modx3/artifacts/beta2-a`. Install it with
   `node tests/modx3/install.mjs cookieconsent3-0.1.0-beta2 .local/modx3/artifacts/beta2-a`.
3. Download the unchanged official `pdotools-3.1.0-pl.transport.zip` to the
   dedicated download directory. SHA256:
   `ae2be84f595bcdeb4660f4f422c52e8dc58f44135147dd42622826be5e68ae0f`.
   Run `node tests/modx3-beta3/dependencies.mjs` (native PM install).
4. On clean, run `control.php configure 18889`, `pages 18889`, `parser fenom all`
   through Docker PHP. `node tests/modx3-beta3/baseline.mjs` reproduces beta2's
   actual JSON compile error and hidden-marketing HTTP 400.
5. Build twice using existing `_build/build.php` in separate `compose run --rm
   --no-deps web` containers, output `/opt/cc-artifacts/beta3-a` and `beta3-b`.
   Normalize each with `_build/normalize.py`; native-verify each with
   `_build/verify.php`. Compare ZIP and both inventories byte-for-byte.
6. `node tests/modx3-beta3/native.mjs`: actual beta2 upgrade, fresh installation,
   configured-site upgrade, reinstall, installed file/DB hashes and HTTP/Fenom.
   `CC3_FOCUS_ONLY=1 node tests/modx3-beta3/native.mjs` repeats only the runtime
   matrix without relabeling reinstall as another genuine upgrade.
7. `node tests/modx3-beta3/upstream.mjs`: two independent PHP processes for
   `Hello {$name}` with compiled cache enabled. Cold succeeds; warm fails in
   unmodified pdoTools3. No Cookie Consent snippet/JSON/audit code is executed.
8. `node tests/modx3-beta3/php82.mjs`: installed hashes and real HTTP audit,
   cold Fenom, Reject/Customize/revocation. Its audit route forwards to the real
   backend with `route.fetch()` to capture ACK bytes before revocation reload;
   every event is checked against one physical JSONL record.
9. Run `node tests/modx3-beta3/php.mjs`, `node tests/browser.mjs` and
   `node tests/modx3/regression.mjs` sequentially for web setting mutations.
   PHP/Fenom clean-fixture work can run independently of web regression.
   Focused Manager checks can use a controlled fresh-fixture baseline and
   `CC3_MANAGER_SERVICE=fresh node tests/modx3/manager.mjs`.

Fixture cache-handler configuration uses the native namespaced xPDO file-cache
class. PHP workers use `opcache.revalidate_freq=0` so settings-file replacement is
immediately visible; MODX resource and pdoTools compiled caches remain enabled.
`control.php parser` and visibility/configuration changes clear the pdoTools
partition for a cold start; the warm request has no intervening cache clearing.
No pdoTools/Fenom source patch or deprecated alias is installed.

Reports are under `.local/modx3/evidence/`. Warm Fenom failures are real FAILs,
not expected successes. The package remains **NO-GO** for the requested full
staging acceptance while that dependency fails. Native runtime comes only from
actual transport packages; controls change synthetic settings/resources only.
