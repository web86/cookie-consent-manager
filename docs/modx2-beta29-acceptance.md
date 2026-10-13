# beta29 — пять элементов и Manager UI: приёмка

Дата: 2026-10-13. Ветка `feature/modx2-frontend-bundle`, база beta28 `df4b9a5`; implementation `47cff7c` и `323d277`.

**GO только для review. 409 проверок / 2820 assertions / 0 FAIL.** Итоговые счётчики и результаты опубликованы в [safe JSON](evidence/modx2-beta29-results.json). Локальный MODX Revolution **2.8.8-pl**, PHP **8.2.34**, MariaDB **10.6**, Apache; Playwright Chromium **1.62.1**. Merge и deployment не выполнялись.

Immutable ZIP: `cookieconsent-0.1.0-beta29.transport.zip`.

SHA256: `9aa4e0bc498d29accb31897a1da11a2c21c1152b3a532a102118806488dbff96`.

## Что изменено

Assets самостоятельно читает настройки сервисов и язык контекста, формирует два JSON script blocks через существующий `safeJson()` и подключает тот же content-hashed CSS/deferred JS. Public config содержит только locale. При некорректном реестре сохраняется прежний fail-closed fallback: пустой реестр и отсутствие баннера. Тексты рендерятся PHP; алгоритмы SDK/consent/fingerprint/GTM/maps/audit не изменены.

В native transport пять canonical элементов: CookiesPopup, CookieConsent, CookieConsentAssets, CookieConsentBanner, CookieConsentMap. Registry vehicle отсутствует; preflight/validator/verification больше не считают его управляемым элементом. При upgrade он не изменяется/не удаляется и не вызывается компонентом. Исторический source и CLI поддержка старых native backups сохранены для явного ручного восстановления, без новой lifecycle-инфраструктуры.

Manager показывает split integration как основной способ, legacy как альтернативу; код копируется из текстовых блоков. Из журнала удалено только отображение подсказки backup/cache. Privacy warning, Save, локальное write/read proof и политика хранения сохранены.

Log layout скрывает существующий aside, отменяет pending debounce и игнорирует stale preview response. Возвращение на остальные вкладки восстанавливает тот же iframe. Для журнала снимается прежний 1500px cap, включая view-only режим. IP добавлен в summary из уже валидированной записи, без дополнительных scans/detail requests. Find использует primary color с hover/focus-visible/disabled; CSV остаётся secondary. Search по кнопке/Enter, 50 rows, sorting/count/cursors/detail/CSV/ACL прежние.

## PASS/FAIL

| Проверка | Статус | Подтверждение |
|---|---|---|
| Native clean install без Registry | PASS | Пять элементов в CookieConsent, один экземпляр категории; повторная установка без дубликатов |
| Clean install с существующей категорией | PASS | ID/parent/metadata категории и unrelated элементы сохранены |
| beta28 → beta29 / reinstall / uninstall | PASS | Семь native сценариев / 226 assertions; пять canonical source обновлены, IDs/category/properties сохранены, Registry code/metadata нетронуты |
| Отсутствие вызовов Registry | PASS | Retained test snippet ставит marker и бросает исключение при вызове; split и legacy отработали без marker |
| Сохранность существующего local site | PASS | Native upgrade и финальный reinstall: два hash-сравнения по 88 assertions для settings, key/config, JSONL, IDs/metadata и retired Registry |
| Safe public JSON / RU/EN | PASS | 3 сценария / 84 assertions; single JSON IDs, только locale, escaped MODX/Fenom tags с буквальным roundtrip, invalid registry fallback |
| Server localization / overrides / no JS / cold-warm | PASS | 4 RU/EN сценария / 112 assertions; HTML-ссылки/XSS, stock fallback, заполненные headings/buttons |
| Split / legacy / independent snippets / RU/EN/TR | PASS | 9 frontend сценариев / 77 assertions; static DOM не меняется после JS, dynamic maps/errors, defer/content hash |
| Manager integration RU/EN / removed hint | PASS | Новый код подключения в head/footer, legacy alternative, privacy warning сохранён, backup hint отсутствует |
| Log full-width и восстановление preview | PASS | 1440/2200 px и view-only; same DOM, одна колонка на Logs, прежние две на других вкладках при desktop width |
| Pending/stale preview | PASS | Debounce отменён до POST, уже запущенный response не перерисовывает скрытый iframe; новых preview POST на Logs нет |
| Tablet/mobile / primary Find | PASS | 900/390 px, без overflow, читаемая кнопка View; hover, keyboard focus, disabled, Enter и отсутствие auto-search |
| IPv4/IPv6 summary и safe rendering | PASS | Четыре колонки, реальный IP, 0 per-row logs_detail; подменённый тестовый IP HTML отображается текстом |
| Viewer/search/pagination/details/CSV/ACL | PASS | 11 сценариев: 50/50/25, точные counts, 17 CSV columns/all rows, XSS/formula escaping, view-only/save denied/manage-only/read denied/anonymous denied |
| Настройки и переводы через Manager | PASS | 17 CMP сценариев / 60 assertions, HTML sanitizer/escaped tags, текст не отнимает consent, privacy parameter требует нового согласия |
| 256 provider combinations / consent/maps/storage | PASS | 281 browser сценарий / 1419 assertions, exact Network powerset, TTL/migration/new provider/ACK failure |
| GTM и live URL guards | PASS | 11 intercepted сценариев / 50 assertions; реальные vendor SDK не выполнялись |
| PHP receiver и месячные журналы | PASS | 37 HTTP сценариев / 121 assertions, schema 1/2, ACK/event_id/JSONL/IP-UA, Origin/replay/rate/concurrency/path/file guards |
| Общий Save / local proof / partial save | PASS | 9 сценариев / 60 assertions; отсутствуют self-request/fictitious monthly events, partial outcome/key/path preservation |
| MODX cache и сохранность журналов | PASS | 4 сценария / 22 assertions: обычный native clearcache, missing dir, entire cache backup/restore, error.log untouched |
| PHP/ZIP/runtime/reproducibility | PASS | 53 PHP syntax checks, native archive verification, 53 installed runtime hashes, два byte-identical ZIP |

Native package: **69 vehicles = 14 object / 53 file / 2 script**, **132 ZIP entries**. Пять element vehicles, без modPlugin/modPluginEvent, Setup Options, ledger или stock copies. Immutable beta28 сохранён без изменений. Minified public JS/CSS идентичны beta28; новые изменения runtime относятся к Assets source, Reader summary и Manager.

## Найденные проблемы и исправления

- MODX CSS подавляет focus outline через `outline: none !important`. Добавлено scoped important правило только для primary buttons компонента; реальный keyboard focus проверен.
- На мобильной четырёхколоночной таблице View переносился по буквам. Добавлен `white-space: nowrap`; проверены 390/900 px без overflow.
- Прежний `max-width:1500px` ограничивал журнал на широком экране. Cap снимается только на Logs/view-only, проверка 2200 px пройдена.
- Первое сравнение цветов тестировало Find с уже наведённым курсором. Тест исправлен: исходное состояние явно снимает hover. Это не выдавалось за успешную проверку до повторного прогона.

Final status отражает повторные прогоны после исправлений. Публичная матрица повторена после установки окончательного ZIP. В production ничего не тестировалось и не изменялось.

## NOT RUN

- Production/staging установка/deployment, настоящий hosting/CDN, vendor SDK/API keys и содержимое произвольного GTM container.
- Firefox/WebKit, другие PHP/MODX, Windows/IIS/LiteSpeed.
- Полная nginx/reverse-proxy матрица в beta29 не повторена; receiver и Save server logic сохранены, локальный Apache проверен.
- Million-row performance, static canonical restore и late native transport failure injection не повторены.
- ENOSPC, power loss, DB outage, произвольные FS races; универсальный atomic rollback не обещается.
- Уже дублированные/case-colliding categories; ошибочная mixed/duplicate integration вне документированного контракта.

[Результаты JSON](evidence/modx2-beta29-results.json), [ZIP inventory](evidence/modx2-beta29-zip-inventory.json), [инструкция обновления](modx2-beta29-update.md), [desktop](screenshots/beta29/logs-desktop.png), [mobile](screenshots/beta29/logs-mobile.png), [RU](screenshots/beta29/logs-ru.png).

Рекомендация: review, затем отдельная staging-приёмка с backup и пользовательскими шаблонами. Production GO этим отчётом не выдаётся.
