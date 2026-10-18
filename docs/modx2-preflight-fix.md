# CookieConsentManager MODX 2 — исправление preflight

**GO для новой native-установки и кандидата Modstore.** Ветка `codex/modx2-cookieconsentmanager`, база `3e03babf5c2fdb635306ea96784129f68d7ed162`. Дата проверки: 2026-10-18. Совместимость прежняя: MODX `>=2.8.4,<3.0.0`, PHP `>=8.1.0`.

Исправлена ложная блокировка при наличии одного namespace `cookie_consent` с путями нового продукта, без manifest и остальных признаков компонента. Namespace сам по себе не подтверждает владение. Для своей установленной версии остаётся прежняя проверка namespace + распознанного manifest; reinstall и upgrade используют прежние native vehicles.

Без подтверждённого владения установка отклоняет canonical snippets/chunk/plugin, настройки и меню, занятые runtime targets, любые файлы в новых component-каталогах и публичном каталоге JS, включая неизвестные файлы, manifest, SHA256-state и symlinks. Настройка с каноническим ключом и меню с каноническим текстом также блокируют установку, если записаны в другом namespace. Проверяются core и assets пути namespace. Допускаются пустые каталоги и единственный пустой штатный build lock после отказа/конкуренции; остальные проверки безопасных путей и блокировки сохранены. Ничего автоматически не удаляется.

В исходниках официальных MODX 2.8.4 и 2.8.8 `xPDOTransport::install()` выполняет vehicles последовательно и немедленно возвращает `false` при `ABORT_INSTALL_ON_VEHICLE_FAIL`, без отката уже записанных объектов (`core/xpdo/transport/xpdotransport.class.php:256–279`). `modTransportPackage::install()` отмечает пакет установленным только при успешном результате (`core/model/modx/transport/modtransportpackage.class.php:274–320`). `modPackageBuilder::registerNamespace()` добавляет namespace vehicle при включённом `$packageNamespace` (`modpackagebuilder.class.php:191–234`). Наш builder передаёт `false` и явно ставит preflight раньше namespace vehicle. Поэтому upload/scan и первый отказ нашего preflight namespace не создают; namespace может остаться от установки, прерванной после его vehicle, либо существовать заранее. На стенде подтверждено сохранение заранее созданного namespace после отказа старого preflight. Причина появления namespace на конкретном пользовательском сайте отдельно не установлена.

| Проверка | Результат |
| --- | --- |
| Чистая MODX 2.8.4 / PHP 8.2.34: native upload, scan, install | PASS |
| MODX 2.8.8 / PHP 8.1.34: только namespace, старый архив воспроизводит исходный отказ | PASS |
| Исправленный архив: namespace без component-файлов, повтор после прежнего отказа | PASS |
| 19 конфликтов: snippets, chunk, plugin, settings/menu в своём и чужом namespace, core/assets/JS/CSS/adapters, manifest/state, symlink, чужие пути namespace | PASS; содержимое и объекты сохранены |
| Отказ при занятом build lock и успешный повтор с оставшимся пустым lock | PASS |
| Обычный native reinstall на обоих стендах с изменённым пользовательским адаптером | PASS; настройки, IDs, SHA256 history сохранены, дубликатов нет |
| Настоящие native vehicles с `ACTION_UPGRADE` на собственной установленной версии | PASS на обоих стендах; переход на выдуманный номер версии не создавался |
| Manager открывается, JS-сборка `ready`, browser page errors | PASS / 0 |

Итог: **28 сценариев, 115 assertions, 0 FAIL**; отдельно проверены точные причины всех 20 финальных отказов (19 конфликтов и занятый lock). [Machine evidence](evidence/modx2-preflight-fix.json). Полный прежний функциональный регресс не повторялся. В логах остались предупреждения самого MODX setup/Smarty/RSS/xPDO; новых PHP-ошибок компонента не обнаружено.

Выдаваемый архив: `.local/preflight-fix/artifacts/release/cookieconsentmanager-1.0.8-pl4.transport.zip`, **559393 bytes**. SHA256: `b340a51e45132657cfb70c74b01e305f1a1a0c0c6a880e660cb78baf5979352e`. Две независимые native-сборки совпали побайтово; 248 vehicles / 231 runtime files / 490 ZIP entries. По сравнению с прежним кандидатом изменён только `.preflight.script`: inventory и все runtime-файлы идентичны. Устаревших `components/cookieconsent/` в архиве нет. Сниппеты, API, consent/settings/logging, адаптеры и функциональность не менялись. Прежний ZIP с SHA256 `8e1b096f…` заменён этим кандидатом.

Повтор на сайте, где **неустановленный** прежний кандидат уже отказал: удалить его через Package Manager, загрузить исправленный ZIP, выполнить scan/install. Namespace и runtime-каталоги вручную удалять не требуется. При замене кандидата с той же signature Package Manager может использовать распакованный старый транспорт, а PHP OPcache — прежний hook с тем же детерминированным mtime. На стенде после native-удаления неустановленного кандидата потребовался перезапуск только тестового PHP/web процесса. При повторе очистить соответствующий OPcache или перезапустить PHP через штатное управление сервером; затем убедиться, что используется ZIP с указанным SHA256. Это замена отклонённого кандидата, историческая миграция не реализуется.

Для воспроизведения на изолированных стендах: `python3 tests/preflight/setup.py prepare`, `setup`, `build`; `node tests/preflight/native.mjs`; `python3 tests/preflight/report.py`; `python3 tests/preflight/setup.py stop`. Требуются сохранённый предыдущий кандидат для reproduction и официальные исходники MODX в существующем локальном download-каталоге. Секреты стендов находятся только в ignored private-каталогах.

MODX 3 (`ee299272c864416e0ff49348d732ff42bd85e503`), `main` и `modx3` не изменялись. Публикация, deployment и merge не выполнялись.
