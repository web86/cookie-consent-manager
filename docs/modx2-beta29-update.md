# beta29 — пять элементов и Manager UI

Кандидат только для review. [Приёмка и NOT RUN](modx2-beta29-acceptance.md). Основа — beta28 в `feature/modx2-frontend-bundle`; merge и deployment не выполнялись.

## Подключение

```html
<head>
    [[!CookieConsentAssets]]
</head>
<body>
    <!-- Содержимое сайта -->
    [[!CookieConsentBanner]]
</body>
```

Каждый сниппет вставляется **один раз**. Assets формирует два безопасных JSON-блока (`cc-service-registry`, `cc-public-config` с одним locale), подключает один CSS и один JS с `defer` и прежним content-hash cache busting. Banner выводит готовый локализованный HTML. Полный словарь переводов не передаётся. Live mode — по умолчанию; mock используется только явно в локальных тестах.

Для существующих шаблонов остаётся альтернативный `[[!CookieConsent]]`, с прежним поведением. **Не смешивайте split и legacy способы**, не добавляйте прямой `CookieConsentRegistry` рядом с Assets: это создаёт повторную конфигурацию. `CookieConsentMap` используется отдельно, как прежде. PHP `CookieConsentTexts::safeJson()` защищает JSON от HTML/MODX/Fenom delimiters; переводы и notice HTML по-прежнему рендерятся сервером.

## Что устанавливается

Пять canonical элементов в native transport:

- Чанк `CookiesPopup`.
- Сниппеты `CookieConsent`, `CookieConsentAssets`, `CookieConsentBanner`, `CookieConsentMap`.

На чистом сайте отсутствует `CookieConsentRegistry`. Категория `CookieConsent` создаётся/используется штатной object vehicle; только новые элементы получают её ID. Существующие IDs, категории, properties и metadata сохраняются при обновлении, source пяти элементов заменяется на месте. Новых `*_package_VERSION` копий и автоматической миграции категорий нет. Прежняя политика static→DB-backed source сохранена; исходные static-файлы не меняются.

На обновлённом сайте старый `CookieConsentRegistry` **не удаляется и не изменяется**, компонент его не вызывает. Проверьте пользовательские шаблоны, чанки, property sets и сторонний код на прямые обращения к нему. После проверки и удаления ненужных прямых вызовов администратор может удалить этот сниппет вручную. Исторический source в репозитории и поддержку старых native backups оставили для ручного восстановления; это не vehicle нового ZIP.

Это касается только modSnippet. PHP service registry, адаптеры SDK и native MODX DB Registry для хранения ключа аудита продолжают работать.

## Manager

«Основные» показывают split snippets как основной способ подключения и legacy как альтернативу. Код копируется из обычных текстовых блоков. Удалена только подсказка про backup/core/cache; правила хранения, общий Save, локальная проверка записи и предупреждение о персональных данных сохранены.

Вкладка «Журнал» скрывает существующий preview и использует одну колонку layout. Preview debounce отменяется, поздние ответы игнорируются; при возвращении на другие вкладки тот же preview восстанавливается. View-only пользователям журнал доступен без права настройки компонента.

Таблица: **дата и время → IP-адрес → действие → детали**. Reader добавляет IP в summary из уже прочитанной и валидированной записи. Дополнительных `logs_detail` запросов на строки нет. Поиск запускается кнопкой «Найти» или Enter; CSV остаётся второстепенной кнопкой. 50 строк, сортировка, точный total, курсоры, подробности и CSV не изменены.

## Безопасное обновление beta28 → beta29

ZIP в checkout: `.local/release/cookieconsent-0.1.0-beta29.transport.zip`.

SHA256: `5272da2e2b2417222a6073c2791b7cd3d11499506b0b91c5e362107a55a3498e`.

1. Сделайте backup DB, элементов/static source, пользовательского runtime и журналов. Код пяти canonical элементов будет заменён. Native `preserved.php` перезаписывается при reinstall и не является долговременным backup.
2. Проверьте SHA256 ZIP и установите после review через штатный MODX Package Manager на отдельной staging-копии. Setup Options отсутствуют.
3. Используйте обычную очистку кэша MODX. Проверьте оба языка, свои переводы и выбранный способ интеграции, отсутствие дублированного JSON и прямых tracker/map embeds до согласия.
4. Проверьте путь журнала, настоящий browser ACK + event_id в месячном файле, Viewer/IP/CSV и роли пользователей. Выбранный каталог, настройки сервисов, переводы и журналы сохраняются. Удалять весь `core/cache/` вместе с журналами нельзя без backup, даже несмотря на удалённую подсказку в UI.
5. Старый Registry удаляйте только вручную после проверки собственных вызовов. Uninstall пакета сохраняет настройки, ключи, элементы, категории и журналы; сначала удалите подключение runtime из шаблонов.

Native modPackageBuilder/vehicles/validators остаются единственным lifecycle. Нет MODX-плагинов, глобальных событий, собственного ledger или обещания атомарного отката при произвольных DB/FS-сбоях. Ограничение HTTP-доступа к журналам обеспечивает владелец сайта.

## Локальное воспроизведение

Сборка с pinned esbuild и native MODX — как в [beta26](modx2-beta26-frontend.md). Два независимых build-dir должны дать одинаковые нормализованные ZIP. Ни один опубликованный immutable release не перезаписывается.

```sh
node _build/transport.mjs /var/www/html /opt/cc-private/new-beta29-build 29
python3 _build/normalize.py .local/private/new-beta29-build/cookieconsent-0.1.0-beta29.transport.zip
# Скопировать ZIP и inventory из нового build-dir в .local/artifacts.
python3 tests/transport/reset.py clean publiccore
node tests/beta29/native.mjs
CC_INSTALL_SERVICES=web node tests/transport/install-current.mjs
node tests/beta29/manager.mjs
node tests/viewer/browser.mjs
node tests/beta29/public-json.mjs
node tests/beta28/localization.mjs
node tests/beta26/frontend.mjs
node tests/browser.mjs
node tests/http.mjs
node tests/live-guard.mjs
node tests/beta24/save.mjs
node tests/beta24/cache.mjs
```

Reset касается только именованных disposable databases и архивирует прежние fixture-файлы. Тесты main, меняющие settings, запускаются последовательно. Native upgrade использует сохранённый immutable beta28 ZIP.
