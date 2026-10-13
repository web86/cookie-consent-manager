# Beta21: canonical update и CookiesPopup localization — приёмка

> Историческая приёмка beta21. Исправления пустых категорий и audit self-request проверены в [beta23](modx2-beta23-acceptance.md).

Дата: 2026-10-13. Ветка feature/modx2-consent-audit-viewer от ea5ff62. Реализация: `8346560300415d37eb20bc76691fbdae8c5dfd07`. Main и production не изменялись.

**429 сценариев, 3046 assertions, 0 FAIL. GO для review.** PHP suites входят в assertions. Финальные native/update/SSR и все 256 masks проверены на beta21 / test-upgrade beta22; byte-identical runtime.

## Пакет

Native modPackageBuilder: 68 vehicles (12 object, 54 file, 2 script), 130 ZIP entries. Canonical UPDATE_OBJECT=true, UNIQUE_KEY=[name], UNINSTALL_OBJECT=false; остальные objects UPDATE_OBJECT=false. В архиве только четыре canonical элемента, нет новых *_package_VERSION и пользовательских config/secret/default paths.

Immutable `.local/release/cookieconsent-0.1.0-beta21.transport.zip`:

```
433c41ab0a4a631cdcabb03a8513fd1535537bfa5990917612868d11bb3554f3
```

Две independent native сборки после metadata normalization побайтно совпадают; предыдущие beta19/beta15 и более ранние ZIP сохранены. Установленный runtime после partial-install recovery совпадает со всеми 54 финальными hashes.

## Обязательная upgrade regression

На fresh disposable MODX 2.8.8 сначала установлен старый immutable beta19; подтверждены его исходники. Затем изменены код/description/properties canonical элементов, notice HTML и тексты RU/EN с буквальными MODX/Fenom delimiters, TTL=73/policy=customer.31, включён GA4 с ID/config. Созданы реальные cc-en/cc-ru MODX contexts и cacheable resources с [[!CookieConsent]], explicit mock и live default. Создана browser consent запись и managed audit key/журнал через existing endpoint.

Обычный Package Manager upgrade beta21 сохраняет ID/type/properties/metadata, меняет исходники четырёх элементов на точные hashes пакета; singleton names и дерево остаются прежними, старые stock копии не удалены и новые не появились. Hashes settings/HTML/переводов/services/key/consent/журналов/templates/resources/policies сохранены. Native preserved.php содержит прежние код/IDs. CLI dry run и explicit apply восстановили исходники в тех же четырёх строках без новых элементов; повторный native install вернул новые source hashes.

Обе реальные contexts проверены с отключённым JS после cache clear и повторного прогрева: правильные тексты, live default, stored TTL/policy/buttons, безопасные literal [[...]]/{$...}, ссылки/HTML без исполнения. Public JSON strings и preview strings полностью совпадают. Save текста меняет сайт без редактирования элемента/лексикона. Для static canonical отдельно проверены прежние ID/type и byte hash внешнего файла; новая DB-версия активна.

Предупреждение о замене code показано в первой native metadata/changelog вкладке **до** Install, readme и preflight. Backup location/type/writability и сохранение native map проверяются; это не гарантия atomic rollback при catastrophic failures. Native backup может перезаписываться reinstall — перед установкой обязателен собственный DB/files backup.

## Результаты

| Проверка | Сценарии | Assertions | Результат |
|---|---:|---:|---|
| Playwright Chromium / real MODX 2.8.8 | 281 | 1418 | PASS |
| HTTP through real MODX wrapper | 37 | 121 | PASS |
| Native MODX Manager UI | 4 | 13 | PASS |
| Live adapters with local network fulfillment only | 11 | 50 | PASS |
| MODX CMP/i18n integration | 17 | 60 | PASS |
| permissions | 1 | 4 | PASS |
| parameters | 4 | 17 | PASS |
| Category-only consent and migration | 8 | 51 | PASS |
| Apache journal Save | 11 | 45 | PASS |
| Actual HTTP server journal matrix | 6 | 84 | PASS |
| Manager UX / native integration | 15 | 116 | PASS |
| Minimal native MODX transport | 8 | 125 | PASS |
| Minimal native MODX transport | 2 | 325 | PASS |
| Native limitations and actual consent | 2 | 99 | PASS |
| Legacy private JSON migration | 1 | 34 | PASS |
| Consent Audit Viewer Playwright | 11 | 71 | PASS |
| Native MODX file-manager header/MIME | 1 | 7 | PASS |
| Native File Manager actual UI | 1 | 3 | PASS |
| Million-row native HTTP list | 1 | 6 | PASS |
| Million-row bounded reader/CSV | 1 | 8 | PASS |
| Canonical beta19 upgrade/SSR contexts/native backup | 5 | 124 | PASS |
| Canonical static source conversion | 1 | 6 | PASS |
| PHP audit/logger | — | 81 | PASS |
| Manager settings/HTML/i18n PHP | — | 53 | PASS |
| Journal safety/lexicon PHP | — | 26 | PASS |
| Viewer PHP | — | 61 | PASS |
| Structural chunk/SSR localization PHP | — | 38 | PASS |

[Results JSON](evidence/modx2-canonical-elements-results.json), [ZIP inventory](evidence/modx2-canonical-elements-zip-inventory.json). HAR: 4418 запросов, 0 внешних в mock-матрице. Viewer/CSV/audit/IP-UA/replay/rate/permissions и File Manager regression прошли; большой shared Reader/CSV не изменён, actual native HTTP million-row list повторён.

Screenshots: [EN](screenshots/canonical-elements/public-en.png), [RU](screenshots/canonical-elements/public-ru.png), [native pre-install warning](screenshots/canonical-elements/native-warning.png).

## Проблемы и NOT RUN

Промежуточный test fixture использовал неподдерживаемый параметр GA4; исправлен на send_page_view. Metadata hash первоначально включал native content alias исходника — исправлен, фактические metadata/properties не терялись. Legacy JSON priority test обновлён для уже существующего managed config и отдельного нового JSON path без перезаписи прежних файлов. Эти попытки не засчитаны как PASS; финальные tests повторены.

- **NOT RUN:** Production deployment and merge.
- **NOT RUN:** PHP/MODX versions other than PHP 8.2.34 and MODX 2.8.8; Firefox/WebKit/real LiteSpeed/CDN/TLS/Windows/IIS.
- **NOT RUN:** Catastrophic disk-full/DB faults during source update/native backup write/restore; universal atomic rollback not claimed.
- **NOT RUN:** Automatic CLI restore of static-source snapshots (explicitly refuses; manual DB/static-file backup review required).
- **NOT RUN:** Physical month/year rollover, terabyte/all-years corpus and simultaneous heavy scans.
- **NOT RUN:** Complete million-row HTTP CSV download and million-row native file-editor open; shared streaming engine already proven at 1M/32M on byte-identical reader.
- **NOT RUN:** Network break/file mutation during streaming CSV and narrow OS directory substitution races.
- **NOT RUN:** Real external analytics/maps responses or arbitrary GTM container safety.

## Установка

[Policy/backup/restore/SSR инструкция](modx2-canonical-elements.md), [Viewer инструкция](modx2-consent-audit-viewer.md). Backup DB/elements/static files/runtime/logs → проверить SHA → открыть native Package Manager metadata warning → Install → проверить RU/EN, тексты/параметры и consent/audit chain на staging. Новые stock tree copies применять не требуется. Root protection и доступ к логам/exports/native backups обеспечивает владелец сайта. Merge и deployment не выполнялись.
