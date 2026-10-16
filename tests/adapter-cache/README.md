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
Build one development transport with the native `_build/build.php`, no version
change, then normalize and verify it. Install through native Package Management.
A development ZIP rebuilt under the same signature and normalized timestamps may
need the disposable Apache opcode cache reset before reinstall; never report a
partial install as a pass. The transport is a test fixture, not a release artifact.

Copy this source checkout to an isolated container directory (default
`/tmp/cc-adapter-source-clean`, override `CC_ADAPTER_CONTAINER_SOURCE`) so
`native.php` can restore exactly the original adapter after mutations. Then:

```sh
CC_ADAPTER_CONTAINER_SOURCE=/tmp/cc-adapter-final node tests/adapter-cache/native.mjs
CC_FRONTEND_EXPECTED=.local/adapter-cache/production.js node tests/universal/regression.mjs
CC_FRONTEND_EXPECTED=.local/adapter-cache/production.js node tests/legacy-autoload/browser.mjs
CC_FRONTEND_EXPECTED=.local/adapter-cache/production.js node tests/legacy-autoload/matrix.mjs
```

`frontend-asset.mjs` retains exact deployed-code and version assertions for either
the default esbuild prebuilt or the explicit PHP candidate. For PHP it verifies
the complete JS body, its content hash and the exact ordered source fingerprint;
only the successful-build timestamp is allowed to differ. It never accepts any
arbitrary bundle as an alternative.

Native lifecycle: reset only `clean`/`publiccore`, run
`tests/beta33/native.mjs`, then run `tests/adapter-cache/install.php` inside
clean/publiccore to verify exactly one plugin/event and a ready cache.
The existing video native suite tests RU/EN, standard/Fenom cold/warm pages and
real audit ACK/JSONL. Do not run DB suites concurrently. Three real playback gates
remain SKIP until actual playback is independently demonstrated.
