# MODX 2 legacy auto-load acceptance

Run only against the repository's disposable local MODX fixtures, sequentially
with every other suite sharing their database. Vendor traffic is intercepted;
no production telemetry, account, merge, push or deployment is involved.

Build/normalize the current native transport, install it with
`CC_INSTALL_SERVICES=web node tests/transport/install-current.mjs`, then run:

```sh
npm run test:legacy
node tests/legacy-autoload/direct-vendors.mjs
node tests/legacy-autoload/upgrade.mjs
# After recreating the beta81 fixture to refresh its clean bind mounts:
node tests/legacy-autoload/php81.mjs
node tests/beta1042/accept.mjs
npm run test:universal
```

`browser.mjs` uses native Manager Save, deployed-bundle SHA verification, actual
same-origin audit ACK/JSONL and locally fulfilled vendor scripts. It distinguishes
network requests from SDK initialization, verifies no CMP Google consent signals before
choice, preserved site defaults and ordinary parameters, then explicit signals after Accept, synchronous callback revocation,
reject/reload, partial/refused/expired/stale/historical/malformed consent, storage
failure, hidden/disabled services, admin version changes and RU/EN warning.
`matrix.mjs` checks 10 adapters in each of the 3 assigned categories, including
maps and custom JS, before any click and after rejection/reload. Evidence is under
`.local/legacy-autoload-evidence/`.

`upgrade.mjs` installs immutable beta1 and beta2 in turn, followed by the current
candidate, preserving exact consent bytes, settings, IDs and audit data. It leaves
the current candidate installed and restores component settings. Do not run it
concurrently with other browser or native suites.

Real vendor delivery, real GTM container consent checks, Safari and client hosting
are separate production gates. Controlled SDK responses prove our loading and
initialization contract, not vendor processing or collection success.

`direct-vendors.mjs` downloads public real SDK JavaScript over verified TLS with
curl, replays identical bytes in Chromium and locally answers every telemetry
request. It compares direct and legacy installation separately for GA4, Ads,
GTM and Yandex: actual runtime initialization, first-party cookie names/attributes,
attempted requests, ordinary config, absence of CMP consent commands, independent
site denied/granted states and explicit reject/reload. Synthetic IDs are defaults;
optional CC_TEST_GA4_ID/ADS_ID/GTM_ID/YANDEX_ID use only approved test accounts.
A synthetic GTM container proves bootstrap parity, not the execution of real
container tags or receipt in a vendor account. These remain production gates.
