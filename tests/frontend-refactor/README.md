# MODX 2 frontend refactor acceptance

The baseline is immutable beta3 commit `ab78ef1365c95514d57b4b63922539e6ac5ea395`.
`baseline.json` was captured before extraction. The untracked user inventory was
preserved separately. No MODX 3 or production target is used.

Use the pinned npm dependencies and the repository's existing disposable MODX 2
fixtures. Keep beta1/beta2/beta3 transport ZIPs and inventories unchanged in
`.local/artifacts`. Build the candidate through `_build/transport.mjs`, normalize
two independent native builds into `.local/frontend-refactor/final-a` and
`final-b`, and copy the verified ZIP/inventory into `.local/artifacts`.

```sh
node tests/frontend-refactor/equivalence.mjs
node tests/frontend-refactor/build.mjs
node tests/frontend-refactor/acceptance.mjs --native
node tests/frontend-refactor/manager.mjs
```

- `equivalence.mjs`: same fake origin, DOM, fixed clock/UUID, storage and SDK
  responses in separate Chromium contexts for beta3 and candidate; compares
  persistence/audit/init/queues/URLs/map HTML/focus/cookies/API and CSP.
  Every request is locally fulfilled. `--focused` runs adapter/category and map
  lifecycle cases; `CC_REFACTOR_CANDIDATE` selects a saved intermediate bundle.
  Registry acceptance and completed script responses are checked explicitly.
- `build.mjs`: manifest input/output hashes, reproducibility, unchanged legacy
  files/mocks/native objects, exact runtime changes, version/guide generation,
  shared Manager URL validator and immutable beta3 archive.
  `CC_REFACTOR_ARTIFACTS` can point to a new native build before delivery.
- `acceptance.mjs --native`: resets **only the named disposable clean/publiccore
  fixtures**, archives their previous files, then runs native lifecycle and all
  current browser/Manager/Fenom/SDK/PHP suites sequentially. Public real SDK
  source is downloaded by the existing direct-vendors test with verified TLS;
  telemetry is locally intercepted. Never run concurrent suites sharing these DBs.
  `--native --native-only` repeats final artifact lifecycle/install gates;
  `CC_REFACTOR_EVIDENCE` selects an independent evidence directory.
- `manager.mjs`: exact installed runtime hashes and read-only final Manager
  source help/Preview isolation. Run after native installation, with the standard
  fixture services restored.

Evidence stays in ignored `.local/frontend-refactor`. The committed acceptance
report distinguishes final results, corrected harness/setup attempts and SKIPs.
Account delivery, real container tags, other browsers and customer hosting remain
manual release gates. Tests do not push, merge, release or deploy.
