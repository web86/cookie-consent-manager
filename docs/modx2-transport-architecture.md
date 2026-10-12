# Минимальная архитектура native transport

Решение после пересмотра архитектуры: **никакого собственного lifecycle storage**, обязательного private package-state path, setup-options, filesystem rollback, transaction coordinator или recovery journal. Private каталоги компонента нужны только для audit JSON/config и JSONL. Защита штатного MODX core/packages/config остаётся обязанностью установки MODX.

## Что удаляется и чем заменяется

| Существующая часть | Решение | Штатная замена / следствие |
|---|---|---|
| `.cookieconsent-package/`, state.json, lock, generation | Удалить из installer | `modTransportPackage` signature/installed и обычные Package Manager actions |
| `originals`, recovery snapshots, custom atomic write/restore | Удалить | Native preserved.php и *.preserved.zip в core/packages; отдельные backup/restore оператора |
| `cookie_consent.package_state_dir/package_version` | Не создавать и не читать | Native package metadata. Старые значения остаются неиспользуемыми, не удаляются автоматически |
| Setup Options с private-state input | Удалить полностью | Readme/License/Dependencies и Install; аудит настраивается в CMP после установки |
| Глобальная DB/FS transaction + shutdown rollback | Удалить | Стандартный порядок vehicles; частичная установка возможна, гарантия атомарности отсутствует |
| Stock hashes/automated element overwrite | Удалить | Canonical snippet/chunk UPDATE_OBJECT=false; versioned stock copies для явного выбора оператора |
| Ручная копия/удаление runtime | Удалить | Штатный xPDOFileVehicle для каждого точного файла; native preserve и uninstall |
| Resolver, чья false ошибка игнорировалась object vehicle | Заменить | Native script vehicles возвращают результат проверки; file vehicles возвращают результат copy |

## Минимальная реализация

Build из curated исходников через modPackageBuilder. Пять modSystemSetting: options/services/texts/log_dir/audit_config_file. Namespace/menu/canonical snippet/chunk — обычные object vehicles с UPDATE_OBJECT=false и UNINSTALL_OBJECT=false. Это сохраняет текущие значения, namespace cascade и пользовательские element content/properties/IDs. При каждом новом release отдельные immutable stock snippet/chunk `*_package_<version_release>`; активные шаблоны не меняются. Warning/readme в Package Manager и памятка CMP требуют явного сравнения перед использованием stock copy.

Файлы — 38 стандартных xPDOFileVehicle, каждый содержит только один перечисленный файл, устанавливается стандартным copy и удаляется native uninstall. **Untracked файлы и каталоги не удаляются рекурсивно.** Runtime-файлы принадлежат поставке: изменения этих файлов заменяются при upgrade; нужен предварительный backup. Native preserved archives — помощь восстановлению, не гарантия единого rollback.

Небольшой preflight script проверяет версии/extensions/namespace/core/asset destinations и возвращает native failure без private-state prerequisites. Последний script vehicle проверяет установленные SHA256 и добавляет отсутствующие permission definitions через xPDO (не меняя policy grants). Это не собственный package manager: нет durable state и собственного изменения/отката runtime. Uninstall scripts — no-op, object/data retention задаётся vehicle attributes; installed status меняет MODX.

Стандартный uninstall удаляет только перечисленные runtime files. Canonical/versioned snippets/chunks, namespace, меню, settings, permissions, аудит и browser consent сохраняются. Поэтому перед uninstall оператор отключает подключения в шаблоне; оставшийся пункт меню не будет работать после удаления controller. Удаление оставшихся объектов — отдельный осознанный purge. Это консервативная native retention-семантика, а не обещание автоматического удаления пользовательских данных.

## Потерянные гарантии и ограничения

Больше нет гарантии согласованного общего отката DB+files+ledger (ledger отсутствует). Поздний copy/ORM/hook/verification failure может оставить частично установленные файлы/объекты; native package status не означает работоспособность страницы. Возможны AUTO_INCREMENT gaps и неполные preserved archives. Backup DB, templates/elements, runtime, private audit config/logs обязателен перед upgrade. Восстановление — штатный preserve/restore, повторная установка после устранения причины либо полный restore backup; результаты проверить вручную.

Не обещается атомарность при ENOSPC/power loss/DB outage, согласованность multi-node storage, автоматическое разрешение пользовательских runtime edits, восстановление любого late failure или удаление third-party cookies. Нельзя заменять опубликованный ZIP под прежней signature.

Миграция ручной установки использует natural keys namespace/settings/name/text; существующий menu с изменённым label адаптируется по namespace/action. Canonical elements не перезаписываются. Старые ledger-based beta не являются supported uninstall path после native upgrade: не запускать их старый custom uninstall поверх новой версии. Неиспользуемые legacy folders/settings не затрагиваются; удалить их можно только после backup и подтверждения отсутствия нужных restore данных.
