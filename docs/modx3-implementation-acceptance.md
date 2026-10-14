# Cookie Consent Manager for MODX 3 — implementation acceptance

14 октября 2026, Europe/Istanbul. **GO для review неопубликованного `cookieconsent3-0.1.0-beta2`.** Самостоятельный компонент реально собран, установлен и проверен на MODX 3.2.4-pl; production readiness для непроверенных окружений не заявляется.

**497 успешных функциональных/unit сценариев, 4095 assertions, 0 итоговых FAIL.** Дополнительно выполнены PHP/JS syntax, native ZIP verification, reproducibility, manifest/guide и HTTP ownership checks. [Полные результаты с именами сценариев](evidence/modx3-implementation-results.json), [canonical before/after snapshots](evidence/modx3-canonical-snapshots.json). Начальные неуспешные попытки описаны ниже и не скрыты итоговым PASS.

## Git и принятая архитектура

- Ветка — `modx3`, исходная база — `44e4fef8891202512c12f5c0d1a4c4d649b3fcdc`, Cookie Consent Manager 1.0.2.
- До работы дерево содержало только untracked compatibility audit. Его содержимое сохранено и отдельно закоммичено: `c6e582b`.
- Реализация: `e4d1168fbe5d45e50e1ed8256621f0f569379562`.
- HEAD исходников/основного acceptance harness перед оформлением отчёта: `7db8ab45aa21790d5fd7808ac91ba7e4b7ceae6b`. Последующее уточнение названия повторного lifecycle case не меняет assertions/production payload; первый genuine upgrade сохранён отдельным результатом из исходного запуска.
- Локальный ref `main` остаётся `b6c4402a0d61c167ca9f677cc25dcc2c26e235c9`. Перед push удалённый `origin/main` прочитан через ls-remote: `44e4fef8891202512c12f5c0d1a4c4d649b3fcdc`; он не изменяется этой работой. Merge в main, GitHub Release и deployment не выполнялись. Push ограничен origin/modx3; окончательный documentation HEAD виден в Git log.

Архитектурное решение владельца заменяет рекомендацию варианта B из исторического аудита: **полный самостоятельный source в modx3, полный самостоятельный source MODX 2 в main, независимые packages/build/tests**. Общего adapter/build switch, WordPress abstractions, собственного installer, component Composer runtime dependency, DI container или новых обязательных таблиц нет.

Изменённые файлы перечислены в `changed_files_at_test_head` machine report; README/этот отчёт/evidence добавлены отдельным documentation этапом. Основные группы:

- `server/modx3-*.php` — переименованные CMS entry points/snippet sources; реальные FQCN в gateway checks/logging.
- `server/controllers/`, `server/processors/` — MODX 3 parents, правильные CookieconsentIndex/Logs names и session cultureKey для CMP/guide/CSV.
- `CookieConsentSettings.php`, `CookieConsentAuditConfiguration.php`, bin helpers — namespaced core models/registry, прежние settings/transactions/config semantics.
- `_build/build.php`, metadata/preflight/verify/final verification/validators/orchestration — только MODX 3 native package family.
- `tests/modx3/` — новые изолированные environments и native acceptance; существующие suites адаптированы по fixture paths, DB guards, model names и language session flow.
- `README.md` — инструкция именно для MODX 3. Исторические MODX 2 документы/evidence не переписывались.

## Реальное окружение

| Параметр | Фактическое значение |
|---|---|
| CMS | MODX Revolution 3.2.4-pl, официальный installation ZIP с vendor |
| PHP | 8.1.34, dedicated Apache image с pdo_mysql/mysqli/dom/mbstring/gd/zip/pcntl |
| xPDO | v3.1.7, подтверждено Composer InstalledVersions |
| DB | MariaDB 11.8.9-MariaDB-ubu2404 |
| HTTP | Apache 2.4.65 (Debian) |
| Browser/build | Chromium, Playwright 1.62.1, Node 22.23.2, esbuild 0.28.2 |
| Deprecated aliases | false во всех трёх установках; globals не восстанавливаются class_alias |
| Docker project | cookie-consent-modx3-acceptance, отдельный cc3-db volume |
| Fixtures | web:18888 / clean:18889 / fresh:18890, loopback binding |
| Databases | cookie_consent_modx3_test / cookie_consent_modx3_clean / cookie_consent_modx3_fresh |
| Private data | отдельные site/private mounts и credentials/config/logs каждого сайта под ignored .local/modx3 |

Official MODX ZIP SHA256: `2f594240d58c1c003de89eb5f50f615ee177ec624f48d8494476197048b7adc2`.

Установка CMS завершилась штатным CLI setup, Manager login и frontend HTTP проверены. Core расположен в project root, setup архивирован вне webroot. Владелец fixture ограничивает HTTP core: **403** для core/vendor/composer/installed.json; удалённый setup — **404**; frontend — **200**. Это server policy fixture, не новый компонентный `.htaccess` vehicle.

Старые MODX 2 containers/DBs/volumes не сбрасывались и не переиспользовались. Guard проверяет disposable marker, host/db connection destination до bootstrap, затем CMS version/DB/aliases. Foreign marker фактически отвергнут. Исторический reset entry point отключён. Ручной sync runtime запрещён в MODX 3 harness: files устанавливаются native Package Management.

## Native transport

| Артефакт | Значение |
|---|---|
| Family / version / signature | cookieconsent3 / 0.1.0-beta2 / cookieconsent3-0.1.0-beta2 |
| ZIP | cookieconsent3-0.1.0-beta2.transport.zip, 187990 bytes |
| SHA256 | `e55c66e9dceca74881b0568a9ebd7a6707f52e1571368cf8176247aac0a7fe87` |
| Vehicles | 71: 14 object, 55 file, 2 script |
| ZIP entries / runtime files | 136 / 55 |
| Requires | PHP >=8.1.0; MODX >=3.2.4,<3.3.0 |
| Setup Options | отсутствуют |
| Namespace / data names | cookie_consent; прежние system keys и пять canonical names |

Builder — настоящий `MODX\Revolution\Transport\modPackageBuilder`; object/file/script transport использует xPDO 3 classes. Исправлены class predicates для IDs/PRESERVE_KEYS и full Chunk/Snippet instanceof; canonical code update policy не менялась. Verifier понимает FQCN payload, проверяет natural keys, retention/defaults, hashes, отсутствие secrets/setup/plugins/custom lifecycle/copies; ext-zip обязателен вместо старого xPDO 2 fallback path.

Реальные Manager sessions выполняли native `workspace/packages/upload`, `scanlocal`, `install` и `uninstall` через штатный connector с токеном. Использованы core processors/package models/vehicles, без собственного применения DB/files. Дополнительно проверены native Readme/Changelog tabs реального pre-install dialog, без выполнения examples и без Setup Options.

Beta1 сохранён: `cookieconsent3-0.1.0-beta1.transport.zip`, SHA256 `18481c07662226ce4f8343d311f5f37b20b68ac245c05a6cdc3414a7df045b1a`. Beta2 получил отдельную signature. Две независимые beta2 сборки побайтно одинаковы после normalization; existing artifacts не перезаписывались и финальные ZIP/inventories/SHA files сделаны read-only.

Review artifact: `.local/modx3/artifacts/beta2-a/`; независимый duplicate build — `beta2-b/`. ZIP не опубликован в GitHub Release и не коммитится как distribution artifact.

## Canonical элементы и lifecycle

Обязательный gate **PASS** для CookiesPopup Chunk и четырёх Snippets: CookieConsent, Assets, Banner, Map. Изучены настоящие DB before/after snapshots, не только package spec.

- Fresh beta1 и отдельный fresh beta2 создали ровно пять singleton elements. На fresh beta2 проверены шесть settings, TTL=90/policy=1, categories=false, category_versions=0, девять disabled services без IDs, target-derived default log_dir, пустой external config и not_configured audit. Retired Registry отсутствует; все 55 installed hashes совпали.
- Install поверх owner elements, genuine beta1→beta2 upgrade и reinstall сохранили ID, custom category/parent, properties, description, source/static_file metadata и реальные modElementPropertySet/modPropertySet relations. Ряды не удалялись/создавались заново.
- Source сравнивается отдельным SHA256; виртуальный MODX `content` отражает тот же source и не считается неизменяемыми метаданными. Документированное `static=false` допускается. Static owner file SHA256 не изменился.
- Genuine beta1→beta2 в том же browser context сохранил raw localStorage побайтно, consentId, fingerprints и effective grants; баннер не появился повторно, разрешённые mock maps/SDK работали. Успешный genuine case взят из **первого** lifecycle запуска. Последующий запуск при уже установленной beta2 — **reinstall**, он назван соответственно и не выдаётся за второй upgrade.
- Сохранены все settings, managed queue/key hash, private external JSON hash и synthetic journals. Владелец изменил configuration source на external JSON перед upgrade; package его не заменил.
- Native preserved.php recovery: настоящий dry run и apply для пяти DB-backed snapshots восстановили source/metadata этих же IDs. После recovery выполнен native reinstall.
- Native uninstall удалил ровно 55 перечисленных runtime files, сохранив untracked owner-file, canonical DB rows/categories/settings/menu/policies/property sets, key/config/logs. Последующий native install восстановил runtime и работающий connector.
- В корректной MODX 3 schema duplicate Chunk name отвергается unique index: фактически проверен failed insert и неизменность данных. Отдельная ветка preflight для повреждённой schema с уже существующими дубликатами **NOT RUN**; ради теста core index не удалялся.

Native file/object/script semantics сохранены. Нет нового ledger/rollback coordinator. Поздние DB/FS failures всё ещё могут оставить partial installation; preserve backups не являются постоянным backup и могут заменяться reinstall. Native RESTORE_PREEXISTING варианты не приравниваются к проверенному custom restore helper.

## Manager, frontend, audit

**Manager PASS:** index/logs routes, native language selection/toggle RU/EN, все tabs и preview area, browser Save, services/category flags, custom text overrides, stale revision rejection, invalid registry rejection, partial log-directory save, inert guide/examples, Escape/focus/responsive UI. Основной JS/CSS Manager не менялся.

**ACL PASS:** missing/wrong token, wrong context, authenticated user without permission, manage-only denied logs/list/detail/export, logs-only allowed read/detail/CSV and denied save. Permission definitions не превращены в automatic policy grants. View-only route остаётся самостоятельным.

**Frontend PASS:** split/legacy, Accept/Reject/Customize, grants/localStorage/TTL/reload/revoke, 256 provider permissions combinations, live URL guards, pixels/multiple IDs/dedup/conflicts, iframe placeholders/maps, custom JS map logic, onAllowed/once/late/restored consent/stillAllowed/unsubscribe/withdrawal during await, RU/EN/custom SSR без JS и cold/warm cache. Внешние SDK requests перехвачены; before-consent/disabled/unapproved network запрещён assertions.

JS/CSS ядро и minified outputs побайтно прежние относительно базы 1.0.2: JS **20095 bytes**, SHA256 `2adee12c7b5928c9a093dea198d9449a3831a4ea614e43dab9d200e276c297af`; CSS **3286 bytes**, SHA256 `9d5ba1e5c0e6e1394806309a04f31a7d7a1b94acbed88ffca5ade89cef61ff88`. API/storage/fingerprint/consent semantics не менялись. Legacy i18n/locale JSON не возвращён.

**Audit PASS:** Browser consent → real POST → ACK/event_id → matching JSONL → Viewer/CSV; schema 1/2, same-origin checks, media type/size/type/UUID/calendar/page validation, replay и parallel append/replay, rate=1 negative case, symlink/unwritable paths/files, no false ACK, key/config retention и отсутствие secrets в public JSON/CMP/CSV. Rate test теперь меняет managed audit metadata, сохраняя secret; assertions прежние. HMAC используется для IP rate bucket, не подписывает claims посетителя. Viewer проверяет filters/pagination/history, malformed/unknown records, XSS/formula escaping и readonly source hashes.

Screenshots: [финальный RU Manager](evidence/modx3-manager-ru.png), [EN Viewer](evidence/modx3-viewer-en.png), [fresh beta2](evidence/modx3-fresh-beta2.png). Содержимое preview в финальном Manager явно ожидалось перед screenshot; начальный RU screenshot, сделанный во время debounce, не используется как доказательство preview.

## Количество проверок

| Группа | Сценарии | Assertions | Итог |
|---|---:|---:|---|
| Полная browser/provider matrix | 281 | 1423 | PASS |
| Последовательная existing regression: HTTP/categories/callbacks/maps/SSR/guards/pixels/Viewer/ACL/guide/Manager | 187 | 1243 | PASS |
| PHP pure core/security suites | 7 | 510 | PASS |
| Native settings/projection | 2 | 109 | PASS |
| Новый focused Manager/audit chain | 7 | 48 | PASS |
| Lifecycle final cases: reinstall consent/schema/files/recovery/uninstall | 5 | 455 | PASS |
| Первый genuine beta1→beta2 case | 1 | 93 | PASS |
| Final beta2 install на web/owner clean | 2 | 88 | PASS |
| Независимый fresh beta2/defaults | 1 | 93 | PASS |
| Final EN/RU Manager/preview/aliases | 2 | 10 | PASS |
| Native Package Manager Readme/Changelog | 1 | 20 | PASS |
| Первый fresh beta1 | 1 | 3 | PASS |
| **Функциональный/unit итог** | **497** | **4095** | **0 итоговых FAIL** |

Дополнительно: PHP syntax на реальном 8.1 runtime — 98 файлов; JS/MJS syntax — 102 файла. Native verifier beta1/beta2, 71-vehicle inventory и 55 runtime hashes; byte-identical beta2 builds; current frontend/guide manifests; HTTP 403/404/200; foreign marker refusal — PASS. Эти checks отдельно от функционального итога и сами по себе не объявляют CMS compatibility.

## Начальные FAIL и исправления

1. Заимствованный локальный PHP image ожидал отсутствующий SSL certificate. Создан отдельный Dockerfile/image с необходимыми extensions; существующие images/containers не исправлялись на месте.
2. Owner property-set fixture использовала fromArray без назначения composite PK. Исправлен test seed; source/virtual content вынесены из metadata сравнения и проверяются отдельно. Настоящие relations/ID/properties assertions сохранены.
3. Повторный native upload под тем же filename был отвергнут MODX. Harness проверяет SHA и использует уже загруженный identical artifact для reinstall; overwrite не применяется.
4. Viewer RU test менял системную настройку как в MODX 2, но сессия MODX 3 оставалась EN. Использован native language controller; все 11 Viewer scenarios прошли на rerun, включая RU/CSV/ACL.
5. Duplicate fixture не могла создать duplicate name из-за core unique index. Вместо ложного preflight PASS проверен фактический DB refusal/state retention; corrupted schema path отмечен NOT RUN.

Ошибки относились к fixture/harness/environment. Производственный PHP переноса не потребовал изменения frontend или ослабления consent/security assertions. Первые partial/failed attempts сохранены в ignored evidence и описаны machine report; итог собирает успешные реальные cases, не потеряв первый genuine upgrade.

## Неисправленные проблемы, ограничения и следующий этап

В проверенном MODX 3.2.4/PHP 8.1.34 окружении итоговых product FAIL нет. **NOT RUN / release gates**:

- PHP 8.2+/другие заявляемые PHP и другие MODX 3 releases; package range не означает фактическую приёмку каждой будущей версии.
- nginx/PHP-FPM/reverse proxy/HTTPS, client hosting/CDN/custom asset/connectors paths/subdirectory и full MODX 2→3 site clone migration.
- Полная late FS/DB fault injection, ENOSPC/power loss, multi-node races/load и million-row HTTP. Parallel append/replay в текущем HTTP suite фактически проверен, но не заменяет нагрузочное испытание.
- Firefox/WebKit/старые браузеры/screen readers; genuine vendor account delivery и настоящие client map keys/backend.
- Corrupted schema duplicates и дополнительные native restore-preexisting option combinations.
- GitHub Release/production deployment — не выполнялись.

Старые immutable MODX 2 ZIP 1.0.0/1.0.1/1.0.2 сохранили прежние SHA256; main и исторические release документы/evidence не изменены. Никакой старый MODX 2 uninstall не использовался как migration path.

**Готово:** полнофункциональная самостоятельная MODX 3 beta2 и проверенный native lifecycle/Manager/frontend/audit на целевой CMS, с реальными canonical retention snapshots. **Следующий этап:** review кода/архитектуры/evidence, затем расширение платформенных/failure/migration gates для release candidate. Публикация и deployment остаются отдельными решениями.
