# Windows: функциональная проверка PHP и native Package Manager

Дата: 26 ноября 2026. Статус: ограниченная совместимость подтверждена; стабильный релиз не одобрен. PR [#20](https://github.com/web86/cookie-consent-manager/pull/20) и [#21](https://github.com/web86/cookie-consent-manager/pull/21) остаются draft.

## Результат

На MODX 2.8.8 и MODX 3.2.4 полный HTTP-цикл компонента проходит с OPcache OFF/JIT OFF, OPcache ON/JIT OFF и OPcache ON/tracing JIT. В профилирующем режиме JIT `1235` установка, обновление и работа Manager проходят, но native HTTP-uninstall аварийно завершает PHP с `0xC0000005` на всех четырёх проверенных patch-версиях. Отдельные CLI-процессы установки/удаления и два контрольных пакета без компонента проходят во всех конфигурациях.

Причина аварии пока не установлена. Результаты указывают на зависимость от JIT и HTTP-жизненного цикла, но не доказывают, кому принадлежит дефект — PHP, MODX/xPDO либо их взаимодействию с transport scripts компонента. Подтверждённой ошибки PHP-логики нашего удаления, которую можно безопасно исправить, не найдено. Рабочий код компонента в этом этапе не менялся; автоматическое отключение OPcache/JIT не добавлялось.

## Среда и методика

- Одноразовые GitHub Actions `windows-2025`, Windows Server 2025; MySQL 8.4.13 с отдельными БД и loopback-доступом. Production и другие репозитории не использовались.
- Официальные PHP NTS x64 ZIP, точные версии 8.3.36, 8.3.37, 8.4.27, 8.4.28; отдельный каталог и INI на runner. Фактические `PHP_VERSION`, SAPI, расширения, статус OPcache/JIT, URL и SHA-256 бинарников сохранены в [JSON-результатах](windows-php-functional-results.json).
- Настоящие MODX 2.8.8-pl и 3.2.4-pl: штатная CLI-установка CMS, настоящая БД, неизменённые MODX/xPDO в основной матрице, штатные HTTP processors `workspace/packages/*`, браузер Playwright и настоящий Manager UI. Это не filesystem-тесты с имитацией MODX API.
- `core` и `assets` перенесены за пределы `public_html`. HTTP исполняется двумя PHP `cli-server` listeners (основной и отдельный audit worker) за локальным proxy; одноразовые CLI-процессы проверяются отдельно. Это не Apache/FastCGI/Open Server Panel.
- Тестовые пакеты `1.0.9-beta128` → `1.0.9-beta129` строились из снимка соответствующей hotfix-ветки. Различия снимка ограничены тремя файлами метаданных версии и проверяются автоматически. Это внутренние тестовые версии; beta126 не пересобиралась и не заменялась.
- Для каждого случая созданы независимые HTTP-, CLI- и control-сайты. Control-сайт никогда не устанавливает Cookie Consent Manager. Контрольные native transport: простой PHP-файл с двумя script vehicles; аналогичный пакет с guarded embedded-классом в скриптах/валидаторе.

Точные флаги основной матрицы:

| Метка | `opcache.enable` / `enable_cli` | `opcache.jit` | JIT buffer |
| --- | --- | --- | --- |
| off | 0 / 0 | disable | 0 |
| opcache | 1 / 1 | disable | 0 |
| jit | 1 / 1 | 1235 | 64M |
| tracing | 1 / 1 | tracing | 64M |

`1235` — профилирование горячих функций (`kind=3`, `opt_level=5`), а не точный синоним строкового `function`. Строковый `function` отдельно не проверялся. У tracing фактически подтверждены `kind=5`, `opt_level=4`, `on=true`. Значения и различия режимов описаны в [официальном руководстве PHP](https://www.php.net/manual/en/opcache.configuration.php#ini.opcache.jit).

## Матрица native HTTP-цикла

PASS означает: установка beta128 → сохранение/перезагрузка настроек → обновление beta129 → пересборка адаптеров → cache clear → audit HTTP и просмотр журнала → удаление с проверкой оставшихся данных.

| MODX | PHP | OFF/OFF | ON/OFF | ON/JIT 1235 | ON/tracing |
| --- | --- | --- | --- | --- | --- |
| 2.8.8 | 8.3.36 | PASS | PASS | uninstall crash | PASS |
| 2.8.8 | 8.3.37 | PASS | PASS | uninstall crash | PASS |
| 2.8.8 | 8.4.27 | PASS | PASS | uninstall crash | PASS |
| 2.8.8 | 8.4.28 | PASS | PASS | uninstall crash | PASS |
| 3.2.4 | 8.3.36 | PASS | PASS | uninstall crash | PASS |
| 3.2.4 | 8.3.37 | PASS | PASS | uninstall crash | PASS |
| 3.2.4 | 8.4.27 | PASS | PASS | uninstall crash | PASS |
| 3.2.4 | 8.4.28 | PASS | PASS | uninstall crash | PASS |

Всего 32 случая: 24 полных HTTP PASS, 8 аварий HTTP-uninstall; независимые CLI install/uninstall — 32/32 PASS; обе разновидности control install/uninstall — 32/32 пары PASS. Смена между проверенными PHP-патчами проблему `1235` не устраняет.

Основные runs: [MODX 2, три режима](https://github.com/web86/cookie-consent-manager/actions/runs/45877904300), [MODX 3, три режима](https://github.com/web86/cookie-consent-manager/actions/runs/45878294366), [MODX 2 tracing](https://github.com/web86/cookie-consent-manager/actions/runs/45878440016), [MODX 3 tracing](https://github.com/web86/cookie-consent-manager/actions/runs/45878446529). Ожидаемые красные результаты JIT не скрыты и не превращены в PASS.

## Что проверяет функциональный сценарий

1. Native upload/scanlocal/install пакета; фактические скопированные runtime-файлы и сборка JS/адаптеров.
2. В Manager UI: изменение TTL на 137 и абсолютного приватного каталога журналов; кнопка сохранения, успешный ответ с `partial=false`, перезагрузка страницы и проверка сохранённого значения.
3. Изменение пользовательского адаптера; native upgrade beta128 → beta129; сохранение снимка настроек и ID элементов; история синхронизации обеих версий.
4. Кнопка пересборки в UI, штатная очистка MODX cache и build plugin.
5. Настоящая HTTP-запись audit event с проверкой `event_id`; открытие вкладки журнала в Manager, ненулевой счётчик и screenshot.
6. Native uninstall; отсутствие управляемого runtime и namespace, сохранение изменённого адаптера, пользовательских файлов и audit log. При аварии JIT этот последний пункт не считается пройденным: native uninstall может оставить частично удалённую установку.

CLI в этой матрице проверяет отдельную установку beta129 и удаление из нового процесса с той же конфигурацией PHP. Он не подменяет HTTP-проверку и не является доказательством успешного восстановления после аварийного HTTP-uninstall.

## Жизненный цикл классов, файлов и журналы

Native uninstall выполняется в обратном порядке vehicles: `verify-install`/`Ownership::start()` → native file vehicles → native object vehicles → `preflight`/`Ownership::finish()`. Штатное удаление PHP-файлов компонента завершается до финального transport script. Helper-классы embedded в transport scripts, определения защищены `class_exists(..., false)`; финализатор не требует удалённые runtime PHP-файлы.

В дополнительных runs с прикладными маркерами [MODX 2](https://github.com/web86/cookie-consent-manager/actions/runs/45878297811) и [MODX 3](https://github.com/web86/cookie-consent-manager/actions/runs/45879331274) последние успешно завершённые операции — native file/object vehicles, затем validator последнего preflight vehicle. Последняя запись — вход в его script include; записи возврата нет. Reflection указывает происхождение `CookieConsentPath` и `CookieConsentTransportOwnership` в распакованном `verify-install.script` внутри `core/packages`, а не в удаляемом компоненте. Это локализует отказ до финального script vehicle, но не до конкретной инструкции внутри `finish()`. Маркеры добавлены только в одноразовую копию четырёх файлов xPDO, отдельно от основной матрицы.

В нашем `verify-install.php` uninstall немедленно возвращает `Ownership::start()`. Единственный `opcache_invalidate()` расположен в последующей install/upgrade-ветке; при uninstall он не вызывается. Успешные установки и обновления с OPcache/JIT проходят через эту ветку. Это не исключает косвенного влияния состояния кеша, но прямой вызов `opcache_invalidate()` при удалении причиной не подтверждён.

Проверены стандартные PHP listener logs, MODX `core/cache/logs/error.log`, результаты HTTP и коды выхода. Во всех восьми отказах proxy получает сброс upstream и отдаёт HTTP 502, основной PHP завершается с `3221225477` (`0xC0000005`). В сохранённых журналах нет `Cannot redeclare`, соответствующего PHP Fatal/Uncaught или сообщения нашего catch об ошибке финализатора. Штатные control transport с embedded-классами проходят; одного повторного guarded-объявления или удаления PHP-файла недостаточно для воспроизведения.

Отдельный короткий PHP-пример загружает helpers и вызывает `finish()` с пустым планом, который должен вернуть false до любых операций удаления/БД. Все 12 дополнительных сочетаний (обе ветки × PHP 8.3.36/8.4.28 × три режима) проходят HTTP и CLI. Runs: [MODX 2](https://github.com/web86/cookie-consent-manager/actions/runs/45878829371), [MODX 3](https://github.com/web86/cookie-consent-manager/actions/runs/45878834393). Это отрицательный диагностический результат, не минимальный пример аварии и не замена native тестов.

Фоновые предупреждения учтены: MODX 3 сообщает о недостающей CA chain при внешнем запросе sentinel; встречаются setup-cache fopen после переноса core и предупреждение `$_SESSION`. Они наблюдаются также в успешных/контрольных сценариях и не объясняют различие режимов. TLS-проверка не отключалась. Ранние отменённые pilots с неточно выбранной PHP-версией, повторным использованием CLI transport-объекта и отсутствовавшим fileinfo для MODX 3 исключены; исправлена только тестовая инфраструктура.

## Совместимость и оставшиеся ограничения

Для проверенного окружения воспроизводимый вариант совместимости — оставить OPcache включённым и использовать JIT OFF (`opcache.jit=disable`, `opcache.jit_buffer_size=0`) в отдельном INI тестового сайта/worker. Это обход ограничения, не исправление причины. Tracing JIT также прошёл текущие сценарии, но не даёт гарантии при иной нагрузке/прогреве. Компонент ничего не переключает автоматически; глобальные production INI не менялись. После смены INI требуется новый тестовый worker с проверкой фактического статуса, а не только CLI `php -i`.

Не проверены Open Server Panel, Apache/FastCGI/IIS и PHP ZTS, другие patch-версии и строковый JIT `function`, длительная нагрузка/все варианты прогрева, настоящие UNC shares и upgrade установленного pl8/pl10 на Windows. Эту матрицу нельзя объявлять полным Windows PASS. Низкоуровневое исследование памяти и crash dump в рамках этого этапа не выполнялись. Native Linux lifecycle здесь повторно не запускался; прежний Linux результат не расширяет текущий Windows вывод. Отдельный filesystem CI остаётся дополнительной проверкой безопасности, не доказательством полной установки.

## Состояние исходников и артефактов

В начале обе hotfix-ветки были чистыми; сохранены пользовательские незавершённые изменения корневого checkout (`.gitignore`, README, dist и прежние отчёты). Работа ведётся независимо в `codex/modx2-windows-paths` и `codex/modx3-windows-paths`.

Добавлены воспроизводимые Windows workflow, точный выбор официальных PHP, независимые native окружения и контрольные пакеты, структурированные результаты и прикладные маркеры. Производственный код, consent/settings/log semantics и ownership-политика этим этапом не изменены. Подтверждённой ошибки компонента для отдельного corrective regression test не найдено; native матрица фиксирует наблюдаемый отказ как регрессионный сигнал.

Все 8 ранее существовавших ZIP сверены с исходными SHA-256 и неизменны, включая beta126:

- MODX 2: `1ffcd0c31f2d32eba2c95b2a0bdfd2bdea522e0fb9dd7ec0fef591109c86dc11`.
- MODX 3: `724ba3e947a36a1158a0b6d6075e633ea3a27cdf25082071fdbc4da266fb5489`.

Полные локальные evidence: `.local/windows-crash-diagnostics/final-results/`; в Actions артефакты `php-matrix-*` хранятся 14 дней. Постоянный JSON рядом с этим отчётом содержит результаты, фактическую конфигурацию и хеши evidence. Merge, GitHub Release, Modstore publication и присвоение стабильной версии не выполнялись.
