# UI refinement acceptance (MODX 2 and MODX 3)

Run only against a newly named `ui-refinement-*` case in the existing isolated
adapter-updates project. The control rejects other DB/site prefixes. Never target
a customer site. Tests change fixture settings, append consent events, seed a
separate historical log, temporarily invalidate and restore an adapter, and
restore the original settings in `finally`. Historical fixture bytes are retained.
External SDK/player responses are controlled; real playback is outside this suite.

Create a new fixture using `tests/adapter-updates/prepare.py` and `setup.php` on
the corresponding platform source, install MODX, move setup outside webroot and
assign ownership to www-data. Build this checkout with its native `_build/build.php`
into a NEW output folder, normalize and verify the ZIP, and install it via the
existing adapter-updates `control.php install`. Never replace an installed ZIP
with different bytes under the same signature. Switch only the test project's
`active` symlink to the new case and gracefully reload its Apache path cache.
The container needs this checkout mounted at `/opt/cc-reference` and its original
platform acceptance source at `/opt/cc-source`.

```sh
CC_UI_MODX=2 CC_UI_CASE=ui-refinement-final-c \
  CC_UI_OUT=.local/ui-refinement/modx2/final node tests/ui-refinement/native.mjs
CC_UI_MODX=3 CC_UI_CASE=ui-refinement-final-a \
  CC_UI_OUT=.local/ui-refinement/modx3/final node tests/ui-refinement/native.mjs
python3 tests/ui-refinement/inventory.py /absolute/candidate.inventory.json 2 ui-refinement-final-c
```

MODX 2 uses port 22888 / `cookie-consent-adapter-updates-web-1`; MODX 3 uses
23888 / `cookie-consent-modx3-adapter-updates-web-1`. Credentials stay in ignored
fixture private directories. Results and desktop/mobile RU/EN screenshots go to
`CC_UI_OUT`. `CC_UI_JOURNAL_ONLY=1` is for focused fixture diagnosis, not full acceptance.

The neutral build case intentionally removes build metadata from a GET response;
the pending case delays a real rebuild request. Success/error and prior bundle
preservation are tested against actual native operations. The page case performs
a real browser POST, checks persisted JSONL, and rejects a query-bearing path.
The CSV column already existed: no second page field or DB migration is added.

Existing regressions: `node tests/adapter-updates/local.mjs`; set
`TMPDIR=/private/tmp` on macOS for canonical private-path checks. Native legacy
suite controls now open Advanced settings; viewer assertions expect five columns.
