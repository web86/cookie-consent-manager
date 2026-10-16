# Shared placeholder texts (MODX 2, 1.0.6)

Run from the repository root:

```sh
php tests/universal/php.php
php tests/video-embeds/snippets.php
node tests/placeholder-texts/browser.mjs
node tests/placeholder-texts/manager.mjs
```

`browser.mjs` uses the real PHP renderer, snippet and translation resolver in an
isolated browser with every network request intercepted. It covers RU/EN,
Strict/Legacy, all three optional categories, stock/custom translations, Google
and Yandex overrides, the three video providers and a named generic instance.
It checks category focus, no permission from a button click, preconsent requests,
activation and revocation, unavailable/malformed keys and compatibility with a
retained beta2 bundle after a failed administrative rebuild. It then executes all
six HTML blocks from
`docs/modx2-embed-display-examples.md` and measures the rendered iframe sizes.
Use `CC_VIDEO_BUNDLE=.local/adapter-cache/production.js` to repeat against the
PHP-minified bundle produced by `php tests/adapter-cache/php.php`.

`manager.mjs` uses only the existing disposable localhost:8888 MODX 2 database.
Run it sequentially with other native suites. It restores settings in finally.
It checks the three visible notice fields and one button field, historical embed
translation fallbacks, translated preview, saving without consent version
changes, and preservation through the native CLI installer in both UI languages.
The container source and installed runtime must contain this candidate. For an
existing fixture, copy `_build/transport-files.json` entries to the actual
`MODX_CORE_PATH` / assets paths, then run `server/bin/install-modx2.php` to update
MODX elements. The CLI installer alone does not copy runtime files. This focused suite does not build a transport. The no-vendor assertion excludes the stock MODX Manager Gravatar
profile image and checks all requests from the preview frame.

Developer-supplied placeholder HTML is deliberately preserved. These tests use
the automatic placeholder for generic templates; changing trusted author HTML is
outside the text update. Adapter URL policies, lifecycle code, SDKs, timestamp
logic remain unchanged. Stable version metadata is verified separately.
