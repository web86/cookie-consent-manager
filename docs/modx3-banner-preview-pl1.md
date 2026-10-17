# MODX 3 1.0.8-pl1 - Manager preview title fix

Branch `codex/modx3-banner-layout`, continued from `42963504c53e2599734629e80a7089589e00c758`.

The existing banner preview now renders a non-whitespace `banner_title` as an
escaped h2 with the existing `cookie-warning-title` style. Editing and language
switching use the existing preview request/debounce/resolver. Empty titles add
no element or margin. Sidebar controls, dimensions, other preview content and
public frontend rendering remain unchanged.

Only preview validation accepts literal angle brackets in an unsaved title;
the renderer escapes them. Saved title validation remains strict, and all other
text validation retains its previous rules. No translation storage change is made.

Metadata/runtime version/frontend manifest and package signature are 1.0.8-pl1.
Native builders accept the standard `pl` release suffix. No new dependencies,
settings, consent changes or frontend CSS/JS changes are included.

## Checks

- 122 PHP contract assertions PASS, including preview-only literal HTML and
  unchanged strict save validation.
- 17 existing local regression suites PASS.
- Native Manager preview: 5 cases / 106 assertions PASS,
  RU/EN, live editing, empty/whitespace, literal HTML/special characters,
  preserved other preview HTML, save/reload and existing consent.
- Existing native UI regression: 15 cases / 167 assertions PASS.
- Existing frontend matrix: 151 cases / 1867 assertions PASS.
  Public assets, markup and renderer are byte-identical to the source commit.
- Native Package Manager 1.0.8 -> 1.0.8-pl1 and same-byte reinstall PASS, without
  uninstall. Raw settings and translations (including RU/EN titles and layout),
  historical logs, owner files and an edited adapter are preserved.
- Two independent native builds are byte-identical; 475 transport
  integrity/allowlist/negative-injection checks PASS; 231 runtime files match source.

[RU preview](screenshots/banner-preview-pl1/ru.png) /
[EN preview](screenshots/banner-preview-pl1/en.png).
[Machine evidence](evidence/modx3-banner-preview-pl1.json).

Archive: `cookieconsent3-1.0.8-pl1.transport.zip` (567765 bytes).
SHA256: `2be35df74d10278986383b0d9b201bedf33e7bd0749dc52f653be9f1a6062227`.
ZIP and checksum are in the root checkout's ignored `.local/banner-layout/deliverables/`.
Previous 1.0.8 ZIPs, review branches and worktrees are retained.

Chromium and local native MODX fixtures were tested; external SDK/player responses
were controlled. No push, merge, Release or deployment was performed.
