# MODX 2 adapter cache acceptance

Start from `codex/modx2-video-embeds` at `c5fdf83`. Never use production DBs.

Local, without MODX or Docker:

```sh
npm run test:adapter-cache
node tests/adapter-cache/build.mjs --native # requires a local test inventory
CC_VIDEO_BUNDLE=.local/adapter-cache/production.js node tests/video-embeds/browser.mjs
CC_REFACTOR_CANDIDATE=.local/adapter-cache/production.js node tests/video-embeds/differential.mjs
```

`php.php` runs with an empty PATH (including worker processes), real filesystem
failures, invalid JS/manifest paths, a deterministic held lock, competing PHP
workers, frontend reads with all sources removed, and a prebuilt fallback. It
retains `production.js` for exact installed-code assertions. Run as a non-root user
when testing permissions. On macOS, old log-directory suites need canonical
`TMPDIR=/private/tmp`, because `/var` is a symlink.

For actual Manager/PM tests use only the existing named disposable MODX 2 fixtures.
Build the candidate transport with the native `_build/build.php`, then normalize
and verify it. `_build/transport-files.json` is the closed runtime allowlist;
`tests/transport/composition.py <zip> [MODX-core]` tests its exact ZIP closure and
rejects injected fixtures, debug files and modified runtime bytes. The test/demo
`mock/` directory is repository-only. `tests/transport/production.mjs` proves
live SDK/maps/video/Strict/Legacy/Preview on a clean installation without it. Install through native Package Management.
A development ZIP rebuilt under the same signature and normalized timestamps may
need the disposable Apache opcode cache reset before reinstall; never report a
partial install as a pass. The transport is a test fixture, not a release artifact.

Copy this source checkout to an isolated container directory (default
`/tmp/cc-adapter-source-clean`, override `CC_ADAPTER_CONTAINER_SOURCE`) so
`native.php` can restore exactly the original adapter after mutations. For a
timestamp-only follow-up on an already installed fixture, `native.php sync`
updates just BundleManager and CookieConsentAssets from that snapshot; a new
transport is unnecessary. The web container’s `/opt/cc-source` must also point
to the candidate checkout: `manager-i18n.mjs` reinstalls directly from it. Set
`saved_bundle_timestamp` to the installed `cookie_consent.bundle_version` value
after the native test. Then:

```sh
CC_ADAPTER_CONTAINER_SOURCE=/tmp/cc-adapter-final node tests/adapter-cache/native.mjs
CC_FRONTEND_EXPECTED=.local/adapter-cache/production.js CC_FRONTEND_VERSION="$saved_bundle_timestamp" node tests/universal/regression.mjs
CC_FRONTEND_EXPECTED=.local/adapter-cache/production.js CC_FRONTEND_VERSION="$saved_bundle_timestamp" node tests/legacy-autoload/browser.mjs
CC_FRONTEND_EXPECTED=.local/adapter-cache/production.js CC_FRONTEND_VERSION="$saved_bundle_timestamp" node tests/legacy-autoload/matrix.mjs
```

`frontend-asset.mjs` retains exact deployed-code and version assertions for either
the default esbuild prebuilt or the explicit PHP candidate. For PHP it verifies
the complete JS body, its content hash and the exact ordered source fingerprint;
the administrative header is used only to compare source fingerprints. URL versions
come from `CC_FRONTEND_VERSION` (the saved MODX timestamp), or the fixed release
version for the prebuilt. It never accepts any
arbitrary bundle as an alternative.

Native lifecycle: reset only `clean`/`publiccore`, run
`tests/beta33/native.mjs`, then run `tests/adapter-cache/install.php` inside
clean/publiccore to verify exactly one plugin/event and a ready cache.
The existing video native suite tests RU/EN, standard/Fenom cold/warm pages and
real audit ACK/JSONL. Do not run DB suites concurrently. Three real playback gates
remain SKIP until actual playback is independently demonstrated.
