# MODX 2 video/template acceptance

Immutable baseline: `baseline.json`, beta5 `d8bb0661b6ad13b51e4c5e2b1799918f9ef53ffa`.
`baseline-results.json` records the pre-change run, including the original real-SDK
Google `/a` parity failure. Existing assertions were not filtered to hide it.

```sh
node tests/video-embeds/registry.mjs
php tests/video-embeds/urls.php
node tests/video-embeds/contracts.mjs
php tests/video-embeds/snippets.php
node tests/video-embeds/browser.mjs
node tests/video-embeds/differential.mjs
node tests/video-embeds/build.mjs
CC_REFACTOR_EVIDENCE=.local/video-embeds/acceptance node tests/frontend-refactor/acceptance.mjs --native
node tests/video-embeds/native-browser.mjs
CC_REFACTOR_EVIDENCE=.local/video-embeds node tests/frontend-refactor/manager.mjs
node tests/video-embeds/real-playback.mjs
```

Run native/Manager/Fenom/shared-database suites **sequentially**, only against the
repository's named disposable MODX 2 fixtures. Native acceptance now requires six
canonical elements and explicitly tests fresh beta5 (without Video) -> current.
Old SDK runtime/storage/audit code stays unchanged except the public mount facade.

`differential.mjs` preserves the original differential scenarios, explicitly
asserts the new mount function, and removes only that added API name from the
otherwise exact old/candidate snapshot comparison. It does not normalize requests,
consent, audit, scripts, map DOM, focus, errors or provider contracts.

`browser.mjs` controls every request locally and covers each video type in each
category, strict/legacy, saved/expired/stale choices, generated URL contracts,
posters, keyboard/modal focus, category audit, AJAX, repeat mounting and 1000-node
removal with CDP garbage collection / WeakRef checks. `--static` and `--generic`
select the incremental pre-adapter stage gates; final runs use no filter.

`native-browser.mjs` executes installed PHP snippets through actual standard and
Fenom parsers in RU/EN with cold/warm resource caches. It checks mixed maps/videos,
RUTUBE p+t, iframe attributes, inert posters/Preview, and real ACK/event_id/one JSONL
row per event. Never run it concurrently with universal or native reset suites.

Actual playback is an independent opt-in network gate. `real-playback.mjs` records
PASS only when a real video's currentTime advances while playing, otherwise SKIP.
Set `CC_VK_OFFICIAL_EMBED` to an owner-supplied official Share/embed URL for VK; no
hash is fabricated. HTTP 200 alone is not playback proof. Keep unresolved playback
and vendor behavior gates visible in the release report.

Build via the real native builder into **new** container output directories, copy
into `.local/video-embeds/final-a` and `final-b`, normalize with the stock script,
and retain both archives. Never overwrite beta5. `build.mjs` checks all manifest
hashes, old object/default invariants, six-element delta, one production bundle,
immutable beta5 ZIP, and independent normalized archive reproducibility.
