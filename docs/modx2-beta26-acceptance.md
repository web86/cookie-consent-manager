# beta26 — frontend acceptance

Дата 2026-10-13. Ветка `feature/modx2-frontend-bundle`, база `d748716` (beta24), implementation `65d55f8`.

**GO только для review. 454 проверки / 3485 assertions / 0 FAIL.** PHP suites/build/runtime checks считаются по одной проверке; 256 provider combinations входят в browser suite. Merge и staging/production deployment не выполнялись.

Transport SHA256: `d02c26f29354ba793843ee204a273c6eca2984b79c87762f8bc566ea98e79c4e`.

Native modPackageBuilder: 69 vehicles = 14 object / 53 file / 2 script; 133 ZIP entries. Шесть canonical elements: четыре старых обновляются in place, два новых постоянных snippet names. **Нет modPlugin/modPluginEvent vehicles, OnParseDocument или переписывания страниц.** Source syntax 52 PHP files, final 53 runtime hashes match inventory. JS/CSS output hashes и два независимых native builds совпали. beta23/beta24 immutable releases не менялись.

## Архитектура после review

Новые snippets содержат только необходимую логику и возвращают fragment без suppression flags. Дополнительный frontend PHP helper удалён. Legacy вызывает snippets через native runSnippet и сохраняет прежнюю HTML registration behavior; отдельная legacy guard не подавляет результат новых snippets. Contract: Assets один раз в head, Banner один раз перед closing body; либо отдельно старый CookieConsent. Repeated/mixed integration намеренно не исправляется.

PHP resolver/rendering owns all static localized content. Public JSON без полного strings dictionary. JS не меняет headings/buttons/categories/ARIA/notice HTML. Только dynamic map/reopen templates и 11 runtime messages остаются localized data. Bundle content guard защищает от повторной JS initialization, не переписывая HTML. Fingerprint/storage/TTL/reconsent/GTM/provider/map/audit algorithms сохранены; опасная config теперь fail-closed до HTML banner render.

Прототип native plugin не входит в committed source/release. После прямого запрета оставшаяся команда prototype install была отклонена automatic approval review; был выбран безопасный no-plugin вариант. Ранее созданный test plugin удалён только из локального stand. Повторное добавление не предпринималось. Проверка пакета/DB подтвердила отсутствие prototype.

## PASS/FAIL

| Проверка | Результат | Evidence |
|---|---|---|
| RU/EN/TR, overrides/base/requested fallback | PASS | Actual MODX SSR и unchanged DOM after JS |
| Notice HTML XSS / literal MODX-Fenom delimiters | PASS | HTML sanitizer, literal strings, no img/script; PHP tests |
| Static text/ARIA не перезаписываются JS | PASS | Snapshot text/HTML/aria до JS = после initialization |
| Минимальная public configuration | PASS | Только locale в cc-public-config, нет strings/i18n/lexicon requests |
| Dynamic map/load/revoke/errors | PASS | Templates, custom provider/map texts, invalid ACK localized message |
| Assets в head + Banner в footer | PASS | Реальный classic defer, config before JS, all DOM present |
| Legacy CookieConsent | PASS | Old templates work; auto head/body registration preserved |
| Snippets independent | PASS | Assets-only не выводит banner; Banner-only не подключает JS/CSS |
| Cold/warm MODX cache | PASS | Два прохода split/legacy/independent fixtures, RU/EN context regression |
| Один JS/один CSS, cache busting | PASS | URLs с exact 20-hex content hash; no async |
| Duplicate JS init guard | PASS | Повторный script сохраняет original API/handlers; не ремонт PHP tags |
| Все 256 provider subsets | PASS | 281 browser scenarios / 1419 assertions; HAR 3298 requests, 0 external mock |
| TTL/schema migration/reconsent/new provider | PASS | Existing suites; late provider не получает grants автоматически |
| Maps/GTM/live URL guards | PASS | 11 intercepted live cases; SDK contents не выполнялись |
| Audit PHP security/schema 1/2/IP-UA/replay/rate | PASS | HTTP 37/121, public receiver behavior unchanged |
| Viewer/CSV/ACL/File Manager | PASS | 11 Viewer cases, source hashes/read-only/roles и native editor |
| Beta24 journal Save/cache behavior | PASS | 9 Save / 4 cache scenarios, temp I/O и partial results |
| Native install/upgrade/reinstall/uninstall/migration | PASS | Standard PM, six constant names, no stock copies |
| Beta24 → beta26 canonical/data upgrade | PASS | IDs/type/properties/text HTML/service config/browser consent/logs сохранены; backup/restore |
| Static canonical и partial native failure | PASS | Static file preserved; expected verification failure честно помечен partial |
| Build/source/runtime reproducibility | PASS | esbuild pinned lock/manifest, no stale outputs, two byte-identical ZIPs |

Ошибки промежуточных тестов не опубликованы как PASS. Старые tests ожидали translations JSON или статический demo banner при malformed server registry; они обновлены под PHP-only output/fail-closed контракт. DTO category tests дополнены полями для server map templates. Data-retention прогон повторён последовательно после обнаружения fixture audit append из параллельной suite. Final rows отражают завершённые повторные прогоны.

## NOT RUN / вне контракта

- Production/staging hosting/CDN/vendor SDK/API keys/GTM container contents, deployment и merge. Live guards используют local fulfilled stubs.
- Firefox/WebKit, другие PHP/MODX, Windows/IIS/LiteSpeed.
- Automatic correction of duplicated/mixed new PHP tags — прямо исключено контрактом. Не добавлялись global hooks/plugins/suppression infrastructure.
- Динамическое добавление banner после defer initialization, нестандартные CSP/cache plugins, multi-node non-shared storage.
- ENOSPC/power loss/DB outage/arbitrary FS race; universal atomic rollback не обещается.
- Million-row performance в этом выпуске не повторён; обычные Viewer/CSV/PHP checks выполнены.

[Safe results JSON](evidence/modx2-beta26-results.json), [ZIP inventory](evidence/modx2-beta26-zip-inventory.json), [integration/build/update](modx2-beta26-frontend.md), [split EN](screenshots/beta26/split-en.png), [Viewer](screenshots/beta26/viewer-en.png).
