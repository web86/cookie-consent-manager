# MODX 2 universal services — acceptance 2026-10-15

Ветка: `codex/modx2-universal-services`. База — актуальный проверенный `main` `0c5e2fe8a0d9cac67fb7a3e83bd3976fc6b87fd6`. Рабочее дерево перед началом было чистым. `main` и `modx3` не изменялись и не объединялись; GitHub Release, push, merge и production deployment не выполнялись.

**Результат: PASS для локальной staging-приёмки; production-ready не заявляется.** Реальная среда: MODX Revolution 2.8.8-pl, PHP 8.2.34; отдельные PHP suites также на 8.1.34. Браузер — Playwright Chromium. Native Package Manager работал с disposable базами `cookie_consent_test`, `cookie_consent_transport_clean`, `cookie_consent_transport_publiccore`. Все внешние SDK/iframe-запросы блокировались либо получали локальные ответы. Это не проверка доставки данных в реальные кабинеты.

## Конечная архитектура

Посетитель управляет только `analytics`, `marketing`, `external_content`. Все включённые сервисы разрешённой назначенной категории запускаются. Новые consent records `categories_v2` не содержат providers/disclosed. Индивидуальных переключателей и индивидуальных разрешений карт нет. Кнопка карты открывает настройки; сама не изменяет выбор. Ads/GTM не требуют исходной категории для запуска; Consent Mode отдельно сохраняет denied для неразрешённой обработки.

Штатный Save сравнивает эффективный состав обработки и увеличивает версии затронутых категорий. Перенос включённого сервиса увеличивает исходную и целевую версии; остальные категории сохраняются. Названия, переводы, map_notice и show_title не увеличивают версии. Старый полный выбор мигрирует без reconsent; частичный старый выбор не расширяется на всю группу и требует подтверждения затронутой категории. Старый JSON сохраняется локально для обратимой проверки; native upgrade не переписывает неизменённые DB settings или JSONL.

Новый аудит schema 3 содержит только категории; исторические schema 1/2 и их map/provider actions продолжают читаться и экспортироваться. В таблице явная Europe/Moscow; детали, хранение и CSV сохраняют UTC/ISO/Z. Пакет сохраняет native transport contract, canonical IDs/categories/properties и owner-данные.

## Результаты

Браузер/HTTP/Manager/native: **23 suites, 301 сценарий, 2196 assertions, 0 FAIL**. Таблица содержит только реально запущенные suites; повторные прогоны после исправлений заменяют прежние результаты, а не добавляются к счётчику.

| Suite | Статус | Сценарии | Assertions |
| --- | --- | ---: | ---: |
| Universal Manager/frontend | PASS | 21 | 173 |
| Audit Moscow RU/EN | PASS | 2 | 14 |
| All adapter/category combinations | PASS | 30 | 300 |
| Frontend persistence and categories | PASS | 33 | 185 |
| HTTP audit compatibility/security | PASS | 37 | 121 |
| Live adapters with local SDK fulfillment | PASS | 11 | 51 |
| Provider parameter guards | PASS | 4 | 18 |
| Manager i18n | PASS | 17 | 60 |
| Pixel queues/revocation/legacy migration | PASS | 32 | 175 |
| Pixel Manager | PASS | 4 | 48 |
| Callback API | PASS | 13 | 44 |
| Consent-aware custom map wrappers | PASS | 9 | 42 |
| Optional ClientID wrapper | PASS | 4 | 13 |
| Manager category visibility | PASS | 4 | 73 |
| Category visibility/SSR/epochs | PASS | 23 | 201 |
| SSR/split/legacy/assets | PASS | 9 | 80 |
| Locale fallback | PASS | 4 | 112 |
| Audit Viewer/CSV/history | PASS | 11 | 77 |
| Manager UX/native audit integration | PASS | 15 | 113 |
| Manager permissions | PASS | 1 | 4 |
| Legacy System Settings compatibility | PASS | 4 | 13 |
| Actual stable 1.0.0 upgrade/browser migration | PASS | 6 | 59 |
| Native fresh/upgrade/reinstall/uninstall | PASS | 7 | 220 |

PHP 8.2: **15 suites / 3 992 assertions / 0 FAIL**: 12 существующих suites (756), exhaustive visibility compatibility (3 115), два новых контракта (114 + 7). PHP 8.1.34: **12 suites / 770 assertions / 0 FAIL**. Syntax: **104 PHP и 105 JS/MJS**, PASS. Generated guide consistency и `git diff --check`: PASS.

Ключевые проверки включают все 10 публичных адаптеров в каждой из трёх категорий; отсутствие запросов до выбора/после отказа; все включённые участники разрешённой группы; выключенные сервисы; duplicate startup; лишние старые providers не влияют на новый запуск; category versions после add/enable/move/purpose/path/delete; UI add/Save/reopen/keyboard; custom JS ошибки и revoke/reload; скрытые категории; карты и modal→preferences→modal; callbacks и late async guards; RU/EN/дополнительный язык; карта fallback и provider interpolation; XSS/plain-text; JSONL/CSV/поиск/сортировка/история/пагинация и permissions.

[Санитизированное машинное свидетельство](evidence/modx2-universal-services.json). Подробные локальные JSON, HAR и скриншоты остаются в игнорируемых `.local/*-evidence/`; секреты, реальные клиентские журналы и credentials в Git не добавлялись.

## Native MODX 2 acceptance

| Сценарий | Результат |
| --- | --- |
| Fresh без категории CookieConsent | PASS, штатное создание без дублей |
| Fresh с существующей категорией | PASS, сохранены ID, parent и сторонние элементы |
| Upgrade beta32 → финальный ZIP | PASS, обновлён код пяти canonical elements, IDs/categories/properties и пользовательские данные сохранены |
| Stable 1.0.0 → финальный ZIP с реальным старым browser consent | PASS, неизменённые категории действуют, consentId сохранён, точный старый JSON архивирован локально, DB/audit/settings сохранены |
| Reinstall | PASS, без дублей, metadata и категории сохранены |
| Uninstall + reinstall | PASS, настройки/элементы/журналы и owner-данные сохранены по существующему контракту |
| Split и legacy snippets | PASS, одиночный registry/banner, сохранённый retired Registry не вызывается |

Native lifecycle финального артефакта: **7 сценариев / 220 assertions**. Stable migration/SSR: **6 сценариев / 59 assertions**. Изменения клиентского production-сайта отсутствуют. Примеры чанков изменены только в репозитории; они не устанавливаются как owner chunks и не заменяют клиентский код.

## Финальный transport

- `cookieconsent-1.0.4-beta1.transport.zip`
- Локально: `.local/artifacts/cookieconsent-1.0.4-beta1.transport.zip`
- SHA256: `d762bf4a412d51e8fe45d2c9deb0978f0ab596718a17240cf044597d5a5c811e`
- Размер: **191889 байт**
- Native verifier: **PASS**, 71 vehicles / 55 runtime files / 136 ZIP entries.
- ZIP собран настоящим modPackageBuilder, метаданные нормализованы штатным `_build/normalize.py`. Runtime хеши сверены с исходниками; минимизация не выполняется на сайте. Ничего не публиковалось.

## Воспроизведение

```sh
npm run test:universal
npm run test:manager
php tests/universal/php.php
php tests/universal/audit-schema3.php
php tests/audit-visibility/php.php
python3 tests/fenom/regression.py
node _build/user-guide.mjs --check
```

Native сценарии запускаются отдельно на именованных disposable fixtures после сборки: `python3 tests/transport/reset.py clean publiccore`, затем `CC_EVIDENCE_DIR=.local/universal-evidence/native node tests/beta33/native.mjs` и `node tests/public-registry/browser.mjs`. Полный build/copy/normalize порядок — [tests/universal/README.md](../tests/universal/README.md). Historical per-provider powersets переработаны в проверки категории либо консервативной миграции; реальный published-container GTM probe не запускается этой матрицей.

## Проверка в Manager и браузере

1. Services → **+ Добавить сервис** → адаптер/пользовательский JS. Заполните поля, включите, выберите категорию, сохраните. Перезайдите и проверьте поля. Дополнительные Метрика/GA4 должны иметь разные ID; прежние допустимые SDK-дубликаты сохраняются и не загружаются дважды.
2. Перенесите Метрику в marketing, Яндекс.Карты в marketing, Google Maps в analytics. Видимость не должна включаться сама. Save увеличивает версии затронутых групп; unchanged группы сохраняют выбор.
3. В новом профиле Network: до выбора, после Reject и reload — нет SDK/custom JS/iframe. Выбор одной категории запускает всех её включённых участников, других — не запускает. Revoke вызывает reload; повторных запросов отозванной группы нет.
4. Проверьте карты во всех категориях. Их кнопка только открывает настройки. После отказа она не даёт iframe; после явного выбора группы и Save работают все карты этой группы. Проверьте native modal и скрытую группу.
5. Texts → RU/EN → общий map_notice / per-map override. Проверяйте preview, `{provider}`, очистку override и fallback. Text-only Save не меняет category versions.
6. Audit: для `2026-10-15T11:25:30Z` таблица — `15.10.2026 14:25:30`, МСК (UTC+03:00); детали и CSV — исходный UTC. Невалидное значение даёт «—».

[Полная инструкция администратора и программиста](modx2-universal-services.md). [Список затронутых файлов](modx2-universal-services-files.txt). Финальный commit SHA сообщается вместе с результатом работы; эта страница не содержит самоссылочного хеша собственного коммита.

## Ограничения и release gates для production

**SKIP / требуется до production:**

- Staging-приёмка владельцем на фактических шаблонах/чанках/подкаталогах/assets_url, с backup/rollback базы, файлов и журналов; очистка MODX/HTML/CDN cache после обновления.
- Реальные SDK и account-side delivery, собственные GTM consent checks/Custom HTML, поведение Bitrix24 wrapper и CSP с реальными разрешёнными источниками. Здесь SDK только локальные контролируемые ответы.
- Safari/Firefox и фактические мобильные браузеры/политики storage. Здесь проверен Chromium, включая mobile viewport и keyboard.
- Контроль owner JS: прямые script/noscript/preload/iframe подключения и серверные URL aliases/redirect могут обходить компонент. Реальная интеграция не является sandbox.

Уже выполненный произвольный JS и отправленные им запросы не отменяются автоматически. До безопасного reload сторонний код может продолжать работу; wrapper обязан проверять guard вокруг async-действий. Это ограничение документировано, обещания изоляции нет.

Для проверяемого rollback локальной миграции на staging сначала верните соответствующую резервную копию пакета/DB, затем восстановите исходный `web86_cookie_consent` из локального `web86_cookie_consent_legacy_v2` в том же профиле. Оригинальный срок/ID сохраняются; архив сам никогда не используется загрузчиками. Смена формата не разрешает бывшее частичное согласие всей категории.
