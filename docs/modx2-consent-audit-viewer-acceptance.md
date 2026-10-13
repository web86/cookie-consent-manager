# Consent Audit Viewer — приёмка beta19

Дата: 2026-10-13. Ветка `feature/modx2-consent-audit-viewer` от актуальной `feature/modx2-category-consent-audit` / `6a2f478`. Реализация: `65bc0222cbc8b5f2e9cec995a6a1d953f6ef345d`. Проверка Git до начала: чистый workspace, remote source tip совпал. Main не изменяется; production deployment и merge не выполняются.

## Артефакт

Immutable `cookieconsent-0.1.0-beta19.transport.zip`:

```
2363a3988071368345c5595bea372cfbac9882c15e4559952d8d0f274354ad1f
```

Локально: `.local/release/cookieconsent-0.1.0-beta19.transport.zip`, рядом SHA256/runtime inventory/ZIP inventory. Native modPackageBuilder: 70 vehicles — 16 object, 52 file, 2 script; 126 ZIP entries. Нет Setup Options, собственных lifecycle files, пользовательских путей/secret/default grants для view_logs. Две независимые сборки после нормализации метаданных побайтно совпадают. Beta15 и предыдущие архивы сохранены; beta17 — сохранённый локальный кандидат до исправления legacy EOF, не выпуск для установки. Beta20 используется только для теста native upgrade/reinstall.

## Реализация и результаты

Список, детали и CSV — отдельные authenticated mgr processors с `cookie_consent_view_logs`; definition default=false, existing policies не меняются. Проверены deny для manage-only пользователя, direct HTTP list/detail/export без разрешения и anonymous/invalid token. Роль view-only использует отдельный route `a=logs`; Save/config недоступны. MODX блокирует основной `index` через прежний manage-only menu до controller, поэтому read-only route не перезаписывает меню.

Table имеет ровно три колонки, фильтры сверху без общей статистики, count/CSV ниже, 50 строк и cursor pagination; storage section — после таблицы. Search/Year/Month/Action применяются только Find, экспорт использует applied filters. Details/history, RU/EN, безопасный unknown event, XSS/CSV injection и quotes/newlines проверены. Скролл к нижней пагинации/storage доступен.

Заголовок новых месячных файлов создаётся под limiter/monthly flock, ровно один раз при 20 параллельных writers. Старые JSON-only файлы и их префиксы сохраняются; существующий пустой файл не получает header. Добавлен regression файла без завершающего LF: перед новым событием добавляется separator, старые байты остаются прежними, JSON-строки не склеиваются. Все bundled consumers используют header-aware parser; произвольный/повторный header, повреждённые/oversized строки диагностируются, остальные записи сохраняются в результатах.

Reader ограничивает имена, directory/file symlinks, hardlinks, file identity и locators; поддерживает схемы 1/2, исторические providers, readable-only/empty/missing directories и unreadable files. Чтение/экспорт не меняют hashes исходных журналов. Unknown fields скрыты с diagnostics; конфигурационные secrets не выгружаются.

**424 сценария, 2886 assertions, 0 FAIL. GO для review.** PHP-suites входят в assertions и не добавляются как browser-сценарии. Все проверки финального выпуска повторены на beta19 / test-upgrade beta20 с byte-identical runtime.

| Проверка | Сценарии | Assertions | Результат |
|---|---:|---:|---|
| Playwright Chromium / real MODX 2.8.8 | 281 | 1418 | PASS |
| HTTP through real MODX wrapper | 37 | 121 | PASS |
| Native MODX Manager UI | 4 | 13 | PASS |
| Live adapters with local network fulfillment only | 11 | 50 | PASS |
| MODX CMP/i18n integration | 17 | 60 | PASS |
| Manager ACL | 1 | 4 | PASS |
| Provider parameters | 4 | 17 | PASS |
| Category-only consent and migration | 8 | 51 | PASS |
| Apache journal Save | 11 | 45 | PASS |
| Actual HTTP server journal matrix | 6 | 84 | PASS |
| Manager UX / native integration | 15 | 116 | PASS |
| Native clean/upgrade/reinstall/uninstall | 8 | 130 | PASS |
| Native manual migration/uninstall | 2 | 297 | PASS |
| Native limitations and actual consent | 2 | 95 | PASS |
| Native immutable beta15 → beta19 | 1 | 35 | PASS |
| Legacy private JSON migration | 1 | 34 | PASS |
| Consent Audit Viewer Playwright | 11 | 71 | PASS |
| Native MODX file-manager header/MIME | 1 | 7 | PASS |
| Native File Manager actual UI | 1 | 3 | PASS |
| Million-row native HTTP list | 1 | 6 | PASS |
| Million-row bounded reader/CSV | 1 | 8 | PASS |
| PHP audit/logger | — | 81 | PASS |
| Manager settings/HTML/i18n PHP | — | 53 | PASS |
| Journal safety/lexicon PHP | — | 26 | PASS |
| Viewer read/schema/filter/CSV/filesystem PHP | — | 61 | PASS |

[Машинный отчёт](evidence/modx2-consent-audit-viewer-results.json), [ZIP inventory](evidence/modx2-consent-audit-viewer-zip-inventory.json). HAR: 4418 запросов, 0 внешних в mock-матрице; все 256 masks ровно по одному разу.

Screenshots: [RU](screenshots/audit-viewer/viewer-ru.png), [EN](screenshots/audit-viewer/viewer-en.png), [нижняя пагинация/storage](screenshots/audit-viewer/viewer-storage-bottom.png), [native File Manager](screenshots/audit-viewer/native-file-editor.png).

Native upgrade beta15→beta19, fresh/reinstall/uninstall, ручная/legacy миграция, private JSON priority и partial-install+repair сохраняют hashes настроек, HTML/переводов/props/сервисов, key/config, элементов, ресурсов/шаблонов/policies и старых журналов. Определения view_logs имеют default=false; политики автоматически не получают grant.


## Большой журнал и File Manager

Миллион валидных строк, 399 000 035 байт: под `memory_limit=32M` точный total, две страницы по 50 и полный CSV stream в `/dev/null`; peak 2 MiB и неизменный source SHA. Это три scan, не утверждение об одном HTTP времени. В отдельном native HTTP запросе — точный миллион total, 50 summaries и небольшой ответ; финальный native HTTP запрос занял 17.911 с и вернул 12763 байт. Три полных CLI scan заняли 63.85 с при одновременно работающих regression-процессах; peak 2097152 байт.

Новый небольшой `.log` через существующий audit endpoint определён finfo как `text/plain`, получен native `browser/file/get` и открыт в настоящем `system/file/edit` Manager. Header виден в редакторе, Save не нажималась, hash файла сохранён.

## Проблемы, исправления и ограничения

Промежуточные тестовые попытки не засчитываются как PASS. Native JSON responses используют MIME text/javascript: исправлен test harness. Для view-only пользователя MODX проверял permission основного меню до controller — добавлен отдельный read-only route. Исправлен selector вложенных summaries в тестах. Скриншоты заменены viewport-снимками с проверкой доступности нижних controls. При проверке EOF найден и исправлен legacy append без LF; поэтому окончательный новый immutable release index — 19, кандидат 17 сохранён.

NOT RUN:

- Production deployment, merge; другие версии MODX/PHP, реальные LiteSpeed/CDN/TLS/Windows/IIS, Firefox/WebKit.
- Физическая смена месяца/года, terabyte/all-years corpus, множество одновременно активных Manager scans.
- Disk-full, аппаратные ошибки чтения/записи, abrupt PHP kill, произвольные late uninstall faults и DB fault injection. Native partial-install refusal + штатный repair тестируются, универсальный atomic rollback не обещается.
- Узкая одновременная directory/file substitution между проверками ОС; persistent symlink/hardlink и подмена после reader construction покрыты тестами. Родительские каталоги должны контролироваться владельцем сайта.
- Сетевой обрыв/изменение файла во время уже начатой CSV передачи. Interrupted export имеет явную диагностику; полной атомарной доставки нет.
- Полная HTTP выгрузка million-row CSV и открытие million-row файла native File Manager: полный миллион CSV проверен shared streaming engine под memory limit, реальные HTTP downloads — на небольшом/постранично-большем filtered fixture. Native editor читает файл целиком по стандартной логике MODX.
- Live ответы внешних сервисов и безопасность произвольного GTM-контейнера. Regression guards используют mocks/локальное fulfillment и проверяют Network попытки.

## Установка / review

[Подробная инструкция](modx2-consent-audit-viewer.md): backup, SHA, native Package Manager install, явное назначение view_logs выбранным группам, обновление с сохранением настроек/переводов/HTML/services/props/JSON/журналов, работа с header-aware форматом и ограничения CSV.

Защита каталога и экспортированных персональных данных — ответственность владельца сайта. Пакет не создаёт `.htaccess` и не проверяет Apache/nginx/CDN/HTTP 403. Native File Manager/media-source/DB/OS permissions остаются отдельными от component permission.
