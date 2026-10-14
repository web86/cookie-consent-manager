# beta33 acceptance

2026-10-14. Real local MODX 2.8.8, PHP 8.1, Chromium. [Detailed results](evidence/modx2-beta33-results.json).

PASS: 48 scenarios, 772 assertions, 0 FAIL. PHP additionally: 198 assertions. Native fresh/reinstall/upgrade/uninstall, eight visibility migrations, clientId true/false/absent, saved browser consent, categories/SSR/preview/RU/EN/keyboard/collapse/map guards and the user-owned ClientID example.

ZIP: `cookieconsent-0.1.0-beta33.transport.zip`. SHA256 `c7a000076850de6f6698e17577f3ea483f528486ddc95b134be48a8eb62e2caa`. Two native builds were byte-identical. Five canonical elements, no plugins or stock copies.

NOT RUN: actual Bitrix24/ClientID delivery and production. Full regression matrix is reported separately for stable 1.0.0. Initial harness errors (JSON helper parsing, wrong fixture alias, incomplete explicit reselection of a mixed checkbox) were corrected; final runs have no FAIL.
