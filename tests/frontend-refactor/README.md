# MODX 2 frontend differential and native acceptance

Current work compares beta5 against immutable beta4 commit
`de41eaa0f976c54c0d2836b605c7474ad874c472` using
`service-adapters-baseline.json`. See [SERVICE-ADAPTERS.md](SERVICE-ADAPTERS.md)
for the adapter extraction workflow. The original beta3 `baseline.json` and
beta4 acceptance reports remain historical evidence; select that baseline
explicitly with `CC_REFACTOR_BASELINE=tests/frontend-refactor/baseline.json`.

Use the pinned npm dependencies and existing disposable MODX 2 fixtures. Keep
beta1/beta2/beta3/beta4 ZIPs and inventories unchanged in `.local/artifacts`.
Build through `_build/transport.mjs` into two new container folders, normalize
copies in `.local/service-adapters/final-a` and `final-b`, and copy the matching
verified ZIP/inventory into `.local/artifacts` without replacing old versions.

```sh
node tests/frontend-refactor/equivalence.mjs
node tests/frontend-refactor/build.mjs
node tests/frontend-refactor/acceptance.mjs --native
node tests/frontend-refactor/manager.mjs
```

- `equivalence.mjs`: identical fake origin, DOM, fixed clock/UUID, storage and SDK
  fixtures in separate Chromium contexts; compares persistence/audit/init/queues/
  URLs/map HTML/focus/cookies/API and CSP. Every request is fulfilled locally.
  `--focused` runs adapter/category and pending SDK/map lifecycle cases;
  `CC_REFACTOR_CANDIDATE` selects a saved intermediate bundle. Registry acceptance
  and completed script responses are checked explicitly.
- `build.mjs`: input/output hashes, reproducibility, unchanged consent/security/
  map/mocks/native objects, removal of retired public sources, byte-preserving
  i18n archive, exact runtime changes, version/guide generation, shared Manager
  URL validator and immutable beta4 ZIP. `CC_REFACTOR_ARTIFACTS` can select a new
  native build before delivery.
- `acceptance.mjs --native`: resets **only named disposable clean/publiccore
  fixtures**, archives their previous files, then runs native lifecycle and all
  browser/Manager/Fenom/SDK/PHP suites sequentially. Real SDK source uses the
  existing direct-vendors test with verified TLS; telemetry is intercepted.
  Never run concurrent suites against these shared DBs. `--native --native-only`
  repeats artifact lifecycle/install gates. `CC_REFACTOR_EVIDENCE` selects a new
  evidence directory (default `.local/service-adapters/acceptance`).
- `manager.mjs`: final installed runtime hashes, Manager source help and Preview
  isolation. Run after native installation with standard fixture services.

Other evidence defaults to ignored `.local/service-adapters`. The acceptance
report separates final PASS, corrected fixture attempts and SKIPs. Account
delivery, published GTM tags, other browsers and customer hosting remain manual
release gates. Tests do not push, merge, release or deploy.
