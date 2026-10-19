> Historical migration campaign. Do not rerun for the first public release. The current fresh-install checks are in `tests/public-install/`; historical migrations and official third-party transport testing are out of scope.

# MODX 2 package identity acceptance

Read [migration limits and release decision](../../docs/modx2-package-rename.md).
Do not run these tools against customer sites. Fixtures have independent databases,
volumes, loopback ports and explicit private Docker subnets. Existing paths/output
are refused; no reset/drop/uninstall or prune is used. Confirm the generated subnet
range is unused before starting it.

Inputs: repository dependencies and Playwright Chromium; Docker images
`cookie-consent-modx3-php81:local` (PHP 8.1.34),
`cookie-consent-matrix-php82:local` (PHP 8.2.34), `mariadb:10.6`;
official MODX 2.8.4/2.8.8 extraction trees in
`.local/modx2-compatibility/download/`; original unchanged pl3 archive/inventory in
`.local/modx2-compatibility/artifacts/release/`. Preserve earlier acceptance output.
The `modx3` in an image name is historical; the CMS comes from the official MODX 2 ZIP.

Clone `https://github.com/QupeDev/cookieconsent.git` to
`.local/package-rename-foreign`, check out audited commit
`2fb353a5ebf7974f38be080f5fbcb8baef3ccef8`, inspect its files before running
`foreign-seed`. This seed copies both original file trees and creates its native
namespace/settings/category/chunk/plugin. It does **not** claim to install an
official Modstore transport or ClientConfig. The foreign banner remains disabled.
The exact official-install coexistence gate remains open.

Commands (new final fixtures only):

```sh
node _build/version.mjs --check
node _build/user-guide.mjs --check
node _build/frontend.mjs
python3 tests/package-rename/prepare.py --final
CC_RENAME_FINAL=1 python3 tests/package-rename/driver.py setup-parallel
CC_RENAME_FINAL=1 python3 tests/package-rename/build.py -rc
CC_RENAME_FINAL=1 node tests/package-rename/browser.mjs
CC_RENAME_FINAL=1 node tests/package-rename/fresh.mjs
python3 tests/package-rename/candidate.py
python3 tests/package-rename/upgrade-build.py
CC_RENAME_FINAL=1 node tests/package-rename/lifecycle.mjs
python3 tests/package-rename/php.py
```

`browser.mjs` accepts a single case name to run independent combinations concurrently.
Every case's `browser.json` is authoritative; do not use a shared summary as a lock.
No automatic rerun of an already installed fixture is supported. `fresh.json` saves
four scenarios per case with their assertion counts; `lifecycle.json` records true same-family
native ACTION_UPGRADE using a test-only 1.0.9-pl1 ZIP. Never distribute that ZIP.

`upstream-cache.php`, run via each fresh case's web container, reproduces the
original xPDO cache-manager mkdir race without bootstrapping the component. Save
its stdout as `evidence/upstream-cache.json` before running `diagnostics.py`.
Raw logs, credentials, setup files, private config, database snapshots and full
settings remain ignored under `.local/`. `export.py` validates the final SHA256,
source inventory, all required result files and installed source integrity, then
writes only sanitized evidence to `docs/evidence/modx2-package-rename.json`.

Additional checks from `tests/adapter-updates/local.mjs` were run for PHP-produced
JavaScript semantics, video, placeholder texts and differential behavior. Initial
fixture path/sandbox failures remain in the ignored attempt logs. The placeholder
fixture path was corrected and both esbuild/PHP variants rerun successfully. A
first test-only successor incorrectly expected MODX to erase the prior installed
timestamp; official `previousVersionInstalled()` and install processor source show
it retains it and determines ACTION_UPGRADE by same-name family membership. The
final lifecycle assertions verify this actual behavior and preserve both records.

After export, stop only these projects, preserving all volumes and evidence:

```sh
CC_RENAME_FINAL=1 python3 tests/package-rename/driver.py stop
python3 tests/package-rename/driver.py stop
```

No branch merge, publication or deployment is part of this harness.
