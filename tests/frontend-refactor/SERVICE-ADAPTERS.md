# Beta4 → beta5 service adapter acceptance

Baseline: `service-adapters-baseline.json`, immutable beta4 commit
`de41eaa0f976c54c0d2836b605c7474ad874c472`. The original beta3 `baseline.json`
and historical acceptance reports remain unchanged. Baseline browser/matrix/
differential results were captured before extraction in
`service-adapters-baseline-results.json`.

```sh
CC_REFACTOR_BASELINE=tests/frontend-refactor/service-adapters-baseline.json \
 CC_REFACTOR_EVIDENCE=.local/service-adapters/final \
 node tests/frontend-refactor/equivalence.mjs
node tests/frontend-refactor/build.mjs
node tests/frontend-refactor/acceptance.mjs --native
node tests/frontend-refactor/manager.mjs
```

The same differential harness supports the historical baseline with
`CC_REFACTOR_BASELINE=tests/frontend-refactor/baseline.json`. Each SDK extraction
was checked independently with `--focused`; evidence stores the intermediate
bundle hash. Final comparison additionally covers each pending shared SDK.
All requests in differential tests are locally fulfilled. Real SDK source checks
use the existing controlled `direct-vendors.mjs` fixture.

Native acceptance uses only named disposable MODX 2 databases. Suites run
sequentially. Preserve beta1/beta2/beta3/beta4 archives; beta4 upgrade is included
in the existing native upgrade matrix. Build into independent new container
folders and put normalized copies in `.local/service-adapters/final-a` / `final-b`.
Copy the matching verified ZIP/inventory to `.local/artifacts` without replacing
older versions. `build.mjs` verifies source/output hashes, archive bytes, exact
runtime changes, unchanged mocks/PHP security/consent contracts and reproducibility.

The i18n compatibility cases execute `archive/standalone-i18n/` (RU, EN and inline
strings) through `tests/locale-guide/examples.mjs`; none is skipped. Removed root
analytics/marketing files were absent from production inputs and native inventory.
No customer-site deletion is performed. Production/account delivery and browser
coverage beyond the existing Chromium fixtures remain manual release gates.
