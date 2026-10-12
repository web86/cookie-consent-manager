# Приёмка минимального native transport beta5

**Архитектура упрощена:** нет собственного lifecycle ledger/lock/originals/recovery, дополнительных private-state settings и Setup Options. Только штатные MODX object/file/script vehicles. Аудит настраивается после установки в CMP. [Архитектурный анализ](modx2-transport-architecture.md) описывает удалённые части, native замены и потерянные гарантии; [инструкция](modx2-transport-package.md) — install/upgrade/uninstall/backup.

Implementation commit: `7a5f708f0817dc1e25e93f2b3f3efd957b1db56f`.

Работа в feature/modx2-transport-package, [PR #2](https://github.com/web86/cookie-consent-manager/pull/2). Main/production не изменялись. Исторические beta1 результаты не выдаются за проверку новой архитектуры. Промежуточные Throwable/ledger review-патчи и их fault-fixtures архивированы локально и не входят в текущий пакет.

## Поставка

```text
.local/release/cookieconsent-0.1.0-beta5.transport.zip
SHA256: dcf0cdde8abde57fd00718a414fdadd29e521f05cca49c588dd16e2fdbefc6c7
```

ZIP собран настоящим modPackageBuilder: **51 native vehicle — 11 object, 38 file, 2 script; 38 runtime files, 93 ZIP entries**. Пять product setting vehicles; optional IDs пусты/enabled=false. Setup Options, private-state выбор, lifecycle class и private audit config/logs отсутствуют в ZIP. SHA/runtime inventory/defaults/excludes проверены PHP verifier с MODX PclZip. Две независимые сборки нормализованы и побайтно совпали. ZIP/checksum/inventory вне Git; старые beta1/beta3 артефакты не заменяются. beta6 используется только как следующий native release для upgrade, beta91 — намеренно повреждённый test-only ZIP.

## Native приёмка

Среда: три disposable MODX 2.8.8-pl, PHP 8.2.34/Apache, MariaDB 10.6, Playwright 1.62.1/Chromium, loopback. Clean и publiccore подготовлены штатным MODX setup; основной fixture содержит ручные/M4 и последующие legacy данные. При reset только именованные disposable DB; прежние каталоги архивированы, основные monthly JSONL не удалялись.

Компонент ставился/обновлялся/удалялся только authenticated HTTP processors настоящего Package Manager, дополнительно пройден GUI. Test CLI controls — credentials/snapshots/fixture customization, не компонентный installer.

| Сценарий | Статус | Доказательство |
|---|---|---|
| Clean native install | PASS | 0→5 settings; семь optional services off/без IDs; private package-state folder отсутствует |
| Стандартный GUI без Setup Options | PASS | Readme/Dependencies → Install; input cc_package_state_dir отсутствует; setup-options button скрыта |
| CMP audit setup и element warning | PASS | private audit path field и явная памятка stock-copies видны; настройка не входит в install wizard |
| beta5→beta6 | PASS | Все settings, translations/notice HTML, TTL=123, purpose_id, Webvisor flag и element properties/IDs/content сохранены |
| Canonical user chunk/snippet | PASS | Изменены test user content/properties; native UPDATE_OBJECT=false сохранил их; новые stock samples названы отдельно |
| Reinstall | PASS | Settings/objects retained; новых дублей элементов нет |
| Native uninstall | PASS | Только перечисленные runtime files удалены; untracked customer.txt остался; data/elements/namespace/menu/settings retained |
| Reinstall после uninstall | PASS | Стандартные file vehicles вновь установили runtime, user data retained |
| Public core install | PASS | Без private-state choice; component code HTTP 403 по Apache protection |
| Manual/legacy migration | PASS | Все существующие settings/menu rows/elements/templates/resources/policy hashes и private config/JSONL совпали; legacy state не создан/удалён/использован |
| Manual upgrade/uninstall с Remove preexisting mode 1 | PASS | Настройки/HTML/переводы/элементы/config/JSONL сохранены; последующий reinstall успешен |
| Native verification failure | PASS обнаружения **partial install**, не rollback | Corrupt test payload был скопирован; final script вернул native failure; runtime отличается. Existing user values retained; стандартный reinstall исправил runtime |
| Actual consent / JSONL history | PASS | Реальный accept-all/HTTP audit=200 → reinstall → reload: полный localStorage consent JSON и historical hashes сохранены |

Сохранены обезличенные snapshots hashes DB values/content/properties/IDs, templates/resources/policies/menu, private data и полного runtime. Не заявляется сохранение installed status/active runtime как единой атомарной транзакции. Legacy technical settings/folders остаются неиспользуемыми для безопасной ручной очистки позднее; никаких автоматических log purge.

Проверенная семантика uninstall намеренно консервативна: user DB objects и menu остаются, exact runtime удаляется. Перед uninstall требуется отключить подключения; retained menu/elements не означают, что controller ещё установлен. Полное удаление данных — отдельное решение администратора.

## Регрессия и результаты

Актуальные complete results каждого сценария: [JSON evidence](evidence/modx2-native-minimal-results.json), [ZIP file inventory](evidence/modx2-native-minimal-zip-inventory.json). Native набор: 10 сценариев / 141 assertions; partial/consent: 2 / 33. Вся прежняя CMP/PHP/HTTP/Manager/privacy/maps/network матрица повторена после final native install/upgrade/uninstall.

**Финальный результат: 366 выполненных сценариев / 1730 assertions / 0 FAIL. Все 256 provider combinations прошли; все 4158 public mock HAR entries — только local origin.** Эти counts и результаты фиксируются в JSON export, который отказывает при любом FAIL, неполной provider matrix, стороннем public origin или несоответствии release SHA. Raw HAR/cookies/MODAUTH, Origin/HMAC и IP не попадают в Git. Live URLs в отдельном guard suite перехватываются локально; это не запуск реальных SDK.

## Команды

```sh
# Отдельный local MODX API/native builder; новый output для каждой сборки:
php _build/build.php "$LOCAL_MODX_WEBROOT" "$NEW_OUTPUT" 5
python3 _build/normalize.py "$NEW_OUTPUT/cookieconsent-0.1.0-beta5.transport.zip"
php _build/verify.php "$NEW_OUTPUT/cookieconsent-0.1.0-beta5.transport.zip" "$LOCAL_MODX_CORE"
# Аналогично собрать release index 6; тестовые ZIP в .local/artifacts.
python3 tests/transport/partial.py
python3 tests/transport/reset.py clean publiccore
node tests/transport/native.mjs
node tests/transport/partial.mjs
node tests/manager-i18n.mjs
node tests/manager-permissions.mjs
node tests/provider-parameters.mjs
node tests/http.mjs
node tests/browser.mjs
node tests/manager.mjs
node tests/live-guard.mjs
# tests/php.php / manager-i18n-php.php — PHP CLI www-data локального web container.
node tests/transport/summary.mjs
```

Compose: --env-file .local/private/compose.env -f tests/local/compose.yaml -f tests/transport/compose.yaml. Native builder/verify внутри web container /opt/cc-source. В summary нужны private results и release ZIP; destructive controls ограничены именованными disposable DB. Runtime вручную не sync-ился.

## Ограничения / NOT RUN

- Реальные ENOSPC/EROFS/storage outage/power loss/DB outage, частичный archive preserve failure, полное восстановление каждого late failure — NOT RUN. Частичная verification failure реально обнаружена; атомарный rollback **не обещается**.
- Native Restore preexisting mode 2 как полное восстановление DB/FS — NOT RUN; требуется отдельный backup/restore test на staging.
- Concurrent Manager edits / multi-node install / network FS / arbitrary third-party hooks / native installed-status save failure — NOT RUN.
- Реальные symlink races, разные UID/GID/ACL/static workers, corrupted native extraction, отсутствующие PHP extensions — NOT RUN.
- Другие PHP/MODX/SQL Server/nginx/shared-hosting panel — NOT RUN. Public/private core tested на Apache; env-less audit reader сохраняется, реальная hosting platform не аттестована.
- Real vendor SDK/GTM containers/cookies/production templates/staging deployment/production deployment/merge — NOT RUN.

Рекомендация: **GO для review минимальной архитектуры**, затем контролируемый staging с backup/restore и реальным network/audit check. Production GO не выдаётся. Установщик не создаёт дополнительных private каталога/секретов и не заменяет полноценную стратегию резервного копирования.
