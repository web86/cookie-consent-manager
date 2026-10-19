# CookieConsentManager MODX 3 — preflight pl7

**GO для нового native-выпуска `cookieconsentmanager3-1.0.8-pl7`.** Рабочая ветка `codex/modx3-cookieconsentmanager`, база `99d7c320ba8d0c22e6a0a8f2aeaa9d1f61fb069d`. Совместимость MODX `>=3.1.2,<3.3.0`, PHP `>=8.1.0`. Main, modx3 и рабочая ветка MODX 2 сохранены. Merge, публикация и deployment не выполнялись.

Native ZIP: `.local/preflight3-pl7/artifacts/final/release/cookieconsentmanager3-1.0.8-pl7.transport.zip` — **777488 байт**.

SHA256: `dfc92eb84782eb08019cd016f025954202ee575677f6363ec37a739940b6d4f0`.

Две независимые native-сборки побайтно идентичны. Архив содержит 248 native vehicles: 15 object, 231 file, 2 script; 721 ZIP entry. [Машинные результаты](evidence/modx3-preflight-pl7.json). В каталоге артефакта сохранены inventory, verification, parity audit, acceptance и SHA256 sidecar.

## Исправление и сравнение с MODX 2

Preflight приведён к проверенному `4ba4ef4` MODX 2. Автоматическое сравнение подтверждает одинаковую логику после учёта FQCN MODX 3/xPDO 3, платформенных путей и диапазона MODX.

| Проверка | MODX 2 `4ba4ef4` и MODX 3 `pl7` |
| --- | --- |
| Namespace без manifest | Сам по себе не подтверждает принадлежность и не блокирует установку; остальные проверки обязательны |
| Namespace paths | Проверяется core path и заданный assets_path; чужой путь вызывает отказ |
| Объекты без подтверждения manifest | Пять snippets, chunk, служебный plugin; настройки по namespace **или** каноническим ключам; меню по namespace **или** тексту CookieConsentManager |
| Файлы без подтверждения manifest | Рекурсивно проверяются оба component-каталога и public JS; неизвестные файлы и symlinks вызывают отказ |
| Пустые каталоги/lock | Допускаются пустые каталоги и только пустой штатный cookie-consent.build.lock; удерживаемый lock вызывает bundle_busy |
| Runtime targets | Занятый target без подтверждённой установки отклоняется, включая общий CSS; symlinks отклоняются |
| Own reinstall/upgrade | Распознанный manifest сохраняет прежний штатный путь установки и ownership receipts |

Пути MODX 3: `core/components/cookieconsentmanager3/`, `assets/components/cookieconsentmanager3/`, `assets/components/cookieconsentmanager3/js/cookie-consent/`. Результат проверки namespace не заменяет проверку остальных объектов/файлов. Пустой assets_path не заявляет чужой assets-каталог и обрабатывается так же, как в проверенном MODX 2.

В официальном xPDO 3 `Transport/xPDOTransport.php::install()` vehicles выполняются последовательно, с отказом при `ABORT_INSTALL_ON_VEHICLE_FAIL`; наш preflight стоит первым. В `MODX/Revolution/Transport/modPackageBuilder.php::registerNamespace()` третий аргумент false отключает автоматический namespace vehicle. Наш явный vehicle namespace идёт после preflight. Upload/scan не создаёт namespace — это дополнительно проверено нативным тестом. При позднем прерывании ранее сохранённые объекты могут остаться: транспорт не обещает rollback. Поэтому один оставшийся корректный namespace допустим, но чужое содержимое продолжает блокировать установку.

## Native-проверки

Все операции выполнялись через аутентифицированные HTTP processors настоящего Package Manager, без подмены install/upgrade/uninstall тестовыми реализациями. Upgrade запускается из native modTransportPackage::install(), выбирающего ACTION_UPGRADE при установленной предыдущей версии.

| Стенд | Native-сценарии | Assertions | FAIL |
| --- | ---: | ---: | ---: |
| MODX 3.1.2-pl / PHP 8.1.34 / xPDO 3.1.5 | 29 | 183 | 0 |
| MODX 3.2.4-pl / PHP 8.2.34 / xPDO 3.1.7 | 29 | 183 | 0 |

На обоих стендах `load_deprecated_global_class_aliases=false`, MariaDB 11.8.9. На каждом выполнены:

1. Абсолютно чистая установка, native uninstall.
2. Первая установка с единственным корректным namespace, без manifest/объектов/файлов.
3. Воспроизведение отказа **неизменённого исходного pl6** с единственным namespace.
4. Отказ при неверном namespace core path и assets_path.
5. Отказ при чужом snippet, chunk, plugin, setting/menu своего namespace и каноническом setting/menu в namespace core.
6. Отказ при известных и неизвестных файлах в обоих component-каталогах, public JS, пользовательском adapter, общем CSS, неподтверждённых manifest/checksum state.
7. Отказ при component symlink, CSS symlink, непустом lock. Снимки полных полей конфликтующих объектов и SHA256/целей ссылок до/после отказа совпадают; установленное состояние пакета не меняется.
8. Отказ при удерживаемом пустом lock; освобождение lock и успешная установка pl7 после прежнего отказа pl6. Допускаются пустые каталоги от отрицательных fixtures.
9. Own reinstall с сохранением ID и единственности объектов, настроек, изменённого адаптера и SHA256-истории.
10. Настоящий native upgrade с исходного pl6: настройки и пользовательский адаптер сохранены; история pl6 сохранена, новая запись pl7 имеет те же штатные adapter hashes.
11. Install → native uninstall → reinstall без ручного SQL.

Дополнительно **2 smoke-сценария / 20 assertions / 0 FAIL**: Manager, ручная JS-пересборка, состояние ready, сохранение настроек; frontend banner, API onAllowed/mountEmbeds, карта и видео после согласия, отсутствие JS-ошибок и пересборки на запросе посетителя. Внешние iframe локально перехвачены; реальное внешнее video playback этим smoke не подтверждается.

Границы MODX/PHP и метаданные: **2 suites / 26 assertions / 0 FAIL** на PHP 8.1/8.2. Итого **62 проверки / 412 assertions / 0 итоговых FAIL**, плюс успешный аудит native ZIP и паритета.

В логах только ожидаемые отказы Package Manager и предупреждения самого MODX в тестовом окружении: HTTP_ACCEPT_LANGUAGE в login и $_SESSION при CLI-создании меню. Fatal, отсутствующие классы/aliases, новые неожиданные ошибки и uninstall incomplete не обнаружены. Начальные ошибки harness сохранены в local evidence: сравнение полного per-run adapter отчёта было уточнено до SHA256 versions; smoke явно включает сервисы, которые по умолчанию выключены. Пакет при этих уточнениях не менялся; уже пройденные native-сценарии повторно не запускались.

## Сохранённая реализация и границы

Побайтно сравнены payloads обоих настоящих ZIP: **229 из 231 runtime-файла неизменны**, остальные два отличаются только `1.0.8-pl6` → `1.0.8-pl7` в `CookieConsentVersion.php` и frontend manifest. Все native object definitions совпадают. `_build/ownership.php`, builder, verify-install, uninstall validator и allowlist совпадают с `99d7c32`. Нет старых `components/cookieconsent/` или `components/cookieconsent3/` ни в одном ZIP entry. Исходный pl6 имеет прежний SHA256 `5bb0477eda935a67f7cdc2415d7c4f8eb8a37ec424ef1e7484d5314982512f76`.

Сниппеты, CookiesPopup, настройки cookie_consent.*, namespace cookie_consent, window.web86CookieConsent, consent lifecycle, Strict/Legacy, Manager RU/EN, JS-адаптеры, SHA256-история, журнал, native uninstall/receipts сохранены. Полный уже принятый функциональный регресс pl6 не повторялся: runtime идентичен кроме stamps, выполнен целевой smoke. Историческая миграция cookieconsent/cookieconsent3, новая система состояния, таблицы, compatibility layers не добавлялись. Прежние ограничения Fenom/live playback остаются за пределами согласованной native-области.

Изменённые файлы: `_build/preflight.php`, `_build/package.json`, `_build/frontend-manifest.json`, `_build/changelog.md`, `server/src/CookieConsentVersion.php`; четыре файла `tests/preflight3/{setup.py,fixture.php,native.mjs,audit.py}`; этот отчёт и `docs/evidence/modx3-preflight-pl7.json`.

Воспроизведение на новых изолированных стендах: `python3 tests/preflight3/setup.py prepare`, `setup`, `build`; `node tests/preflight3/native.mjs`; `python3 tests/preflight3/audit.py`. Подготовка использует сохранённые официальные MODX sources и отдельные Compose projects/volumes; существующие стенды и архивы не заменяются. После приёмки новые контейнеры остановлены, данные/evidence сохранены.
