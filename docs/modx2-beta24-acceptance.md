# beta24 — финальное упрощение журнала

Дата: 2026-10-13. Ветка `feature/modx2-beta21-acceptance-fixes`, база beta23 `3cd7952`, implementation `ce14113`.

**GO только для review. 453 завершённые проверки / 3480 assertions / 0 FAIL.** PHP suites и structural/build checks считаются по одной проверке, а не по числу assertions. Merge и staging/production deployment не выполнялись.

Transport: `cookieconsent-0.1.0-beta24.transport.zip`, `.local/release/` относительно checkout.

SHA256: `6829d696da9fb0a4bdbeed19e92e27e872d09504cbe63c64194006f55bb05e5f`.

Native modPackageBuilder: 70 vehicles (12 object, 56 file, 2 script), 135 ZIP entries. Две независимые сборки совпали побайтно после нормализации. Все 56 финальных runtime hashes совпадают с inventory. В ZIP нет путей установки разработчика: исходный setting vehicle содержит пустое значение, fresh default назначается native validator на целевом MODX из `MODX_CORE_PATH . 'cache/logs/'`. beta23 release SHA не изменён. Старый beta24 development ZIP сохранён отдельно и никогда не был release; beta25 и повреждённый beta91 — только тестовые fixtures, распространять нельзя.

## Архитектура и результат

Настройки журнала расположены **последним разделом «Журнал согласий» на «Основных»**. Доступны website-relative и absolute directory, короткие подсказки о стандартном MODX каталоге, HTTP-доступе и backup/manual cache cleanup. На вкладке «Журнал» нет storage/configuration/protection/diagnostics панели или отдельных audit buttons. Оставлены year/current, month/all, все 14 поддерживаемых event types (и найденные исторические неизвестные), поиск, Find, total/CSV, три колонки, details и pagination. Успешная выдача не показывает технические diagnostics; API/CSV сохраняют сведения о повреждённых строках. Ошибки загрузки/экспорта показываются как ошибки операции. View-only роль по-прежнему читает/export без права настройки.

**Один Save** проверяет все обычные поля строго. Только новый/изменённый log_dir и отсутствие необходимой конфигурации требуют temporary I/O proof. Файл `.cc-audit-check-RANDOM.tmp` создаётся `x+b` с umask 0077, блокируется flock EX, полностью записывается (корректно обрабатываются short writes), flush/seek/read проверяются по точному содержимому/размеру. inode/device/regular-file/link count сверяются перед cleanup. Файл удаляется; месячные журналы, error.log и `.htaccess` не затрагиваются. Никаких HTTP self-request или consent events при Save.

Неизменённый валидный каталог с валидной конфигурацией не write-тестируется повторно. Проверка существования/каноничности/прав сохраняется: исчезнувший каталог не считается исправным. При clearing path сохраняется пустое значение и новые записи отключаются; old files/key/config остаются.

Если каталог не прошёл проверку, сохраняются остальные корректные options/registry/texts; предыдущий log_dir остаётся. Ответ `success=true, partial=true, journal.saved=false, journal.reason=BOUNDED_CODE` явно отличает это от полного Save. UI показывает частичный результат, сохраняет отклонённый path draft и отмечает его как несохранённый. Неверное обычное поле (например TTL) остаётся полноценной validation error без Save. Revision/SQL row lock защищают от stale updates. Для config initialization применяется native SQL savepoint в общей transaction; ошибка setup не должна оставить новую половинчатую конфигурацию или новый путь. Произвольные DB/FS outages не считаются атомарно восстановимыми.

При первой конфигурации используется проверенный origin аутентифицированного Manager (или прежний trusted MODX site_url для legacy API без параметра). **Существующие origin/key/rate/private configuration не переписываются обычным Save.** Конфигурация из env/private JSON имеет прежний приоритет. Несоответствие public origin нужно исправлять в доверенной конфигурации владельцу сайта, а не ослаблять receiver.

`audit_enable`/`audit_test` кнопок нет. Для прежних интеграций внутренние authenticated APIs оставлены: первый делегирует локальному Save, второй возвращает только `local_checked=true`. Они не подтверждают HTTP receipt и не создают согласия. Старый HTTP helper не вызывается из Save/этих processors; он сохранён для совместимости интеграций. Подтверждения «Приём событий подтверждён» из локального теста нет; отдельная E2E кнопка не добавлена, согласно последнему решению о едином интерфейсе.

## Default и cache

Fresh native install назначает стандартный target-host путь только при отсутствии setting `cookie_consent.log_dir`. Existing custom path **и empty disabled value** сохраняются при update/reinstall. Установка не генерирует HMAC автоматически; первый обычный Save инициализирует отсутствующую конфигурацию, даже если предложенный default не меняли. Предлагаемый default не означает подтверждённый public receipt.

Каталог должен уже существовать. Компонент не создаёт ни стандартный, ни произвольный каталог. Если `core/cache/logs/` отсутствует, Save возвращает partial, оставляет настройку и сохраняет остальные поля. Receiver не переключается на error.log или иной fallback. Владелец восстанавливает каталог/права и при необходимости данные из backup. Обычный штатный MODX clearcache сохраняет `.log`; ручное удаление всего `core/cache/` может удалить реальные журналы и replay/rate state. Компонент не может вернуть удалённые владельцем файлы: их нужно заранее сохранить вместе с `.rate/` и ключом/configuration. После перемещения core existing absolute setting тоже сохраняется; проверьте и при необходимости измените его вручную.

## PASS / FAIL

| Сценарий | Результат | Подтверждение |
|---|---|---|
| Single Save/Main-last-section/no audit buttons/no settings in Log | PASS | Actual Manager DOM; EN/RU и view-only |
| Changed directory local write/read/cleanup | PASS | Temporary files отсутствуют после success и контролируемых failures; месячных событий от Save нет |
| Short writes, partial write then failure, read failure/mismatch | PASS | PHP fault injections; user/error/historical file hashes сохранены |
| Missing/traversal/symlink/permissions | PASS | Strict FS checks и частичный Save; прежний path/keys сохранены |
| Invalid path + корректные TTL/texts/provider data | PASS | DB fields сохраняются; explicit partial и rejected draft в GUI |
| Configuration error + partial Save | PASS | Недоступный private config не заменил path/config/key; остальные поля сохранены, temporary file удалён |
| Unchanged path | PASS | `journal.checked=false`, config/key hashes неизменны |
| Empty path | PASS | Новые browser events получают 503, old log/key hashes неизменны |
| Standard MODX directory exists and writable | PASS | Actual private-core Save → browser ACK → monthly record; error.log hash неизменен |
| Fresh core inside webroot | PASS | Target path `/var/www/html/core/cache/logs/`, правильный site-mode display, first Save initializes без event |
| Core outside DOCUMENT_ROOT | PASS | Fresh native path `/opt/cc-clean/core/cache/logs/`; без предположения о размещении core |
| Native normal clearcache | PASS | Actual `system/clearcache`; monthly и error.log hashes не изменены |
| Standard directory отсутствует | PASS | Partial Save, path/options retained; каталог автоматически не создан |
| Manual full core/cache removal | PASS | Controlled rename с backup; missing directory handled; settings/key retained; prior logs сохранились в backup и восстановлены |
| Apache, nginx/PHP-FPM, Apache behind nginx proxy | PASS | Для каждого site/private path, actual browser POST/ACK/JSONL, custom guard и old sentinel сохранены |
| PHP self-request 403 / browser 400 + valid 200 | PASS | Fixture proxy blocks old PHP UA; Save succeeds, invalid payload reaches receiver, valid browser event ACK matches monthly record |
| Unavailable receiver | PASS | Receiver 403 не мешает local Save и не отключает сохранённый путь |
| Intentionally disabled beta23 update + ordinary Save | PASS | Empty setting остаётся пустым; config/key не изменены |
| Beta23 → beta24 canonical/native upgrade | PASS | IDs/type/properties/settings/text HTML/service params/browser consent/logs retained; нет tree copies |
| Fresh/reinstall/upgrade/uninstall/manual migration | PASS | Real Package Manager, native object/file/script vehicles; no Setup Options |
| Canonical static source и restore | PASS | In-place native backup/restore; static file сохранён, элементы не дублируются |
| Native partial verification error | PASS, ожидаемый отказ | Install rejected, partial state честно указан; универсальный rollback не обещан |
| Receiver Origin/schema 1/2/IP-UA/replay/rate/concurrent append | PASS | HTTP 37/121; public wrapper/receiver/logger/validator/limiter source не изменены от beta23 |
| Provider regression и Network | PASS | 256/256; browser 281/1418, 4418 HAR requests, 0 external mock requests |
| Categories/SSR/preview/maps/GTM/fingerprint | PASS | Existing category suites + activity masks и позднее включение без grant expansion |
| Audit Viewer/CSV/detail/history/ACL | PASS | 11 scenarios, все действия, source hashes unchanged; view-only читается без manage |
| Native File Manager/MIME | PASS | Реальный browser event создал headed log; actual editor opened read-only, без Save |
| PHP/build/runtime/reproducibility | PASS | 50 PHP syntax files, PHP suites, 56 runtime hashes, two byte-identical builds |

В ходе миграции тесты beta23, ожидавшие фиктивный event от `audit_enable` или failure вместо partial Save, обновлены под новую семантику. Старые failure исходы не включены как PASS: завершённые повторные прогоны отражены в [results JSON](evidence/modx2-beta24-results.json). Также устранена OPcache коллизия повторно собранного локального development signature; финальный immutable ZIP не заменялся.

## NOT RUN

- Действительный hosting/CDN/WAF, staging/production deployment и merge. Fixture воспроизводит известный 403 self-request сценарий; это не утверждение о конкретном правиле реального хостинга.
- Настоящие Google/Yandex SDK/API keys/GTM container contents: live guard requests перехвачены локально.
- Другие PHP/MODX, Firefox/WebKit, Windows/IIS/LiteSpeed. Удаление открытого temporary file проверено на Linux/POSIX.
- ENOSPC, power loss, DB outage, отдельный flock/unlink отказ и враждебные FS races. Если безопасный cleanup невозможен, операция не должна считаться успешной; может потребоваться ручное удаление check file владельцем.
- Multi-node non-shared storage/concurrent deployment и нестандартные MODX cache purge plugins/scripts. Ручное удаление файлов нельзя компенсировать без backup.
- Million-row performance повторно для beta24 не запускался. Неизменённые алгоритмы Reader/CSV проверены обычной PHP/Viewer regression; прежние million-row results остаются историческими.

[ZIP inventory](evidence/modx2-beta24-zip-inventory.json), [установка/обновление](modx2-beta24-upgrade.md), [partial Save](screenshots/beta24/partial-save.png), [proxy/browser proof](screenshots/beta24/proxy-browser-event.png), [Viewer EN](screenshots/beta24/viewer-en.png), [Viewer RU](screenshots/beta24/viewer-ru.png).
