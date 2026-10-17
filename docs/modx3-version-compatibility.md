# Совместимость Cookie Consent Manager с MODX 3.1.2–3.2.4

Дата: 17 октября 2026. База: `modx3` / `53b0c34`. Feature-ветка:
`codex/modx3-compatibility-matrix`. `main` не изменяется.

**Итог: GO. Точный финальный `cookieconsent3-1.0.8-pl4` принят на всех 12 конфигурациях.**
Полная финальная матрица: 276 групп / 6538 assertions, FAIL=0, SKIP=0.
Дополнительная исправленная native lifecycle matrix: 48 групп / 3336 assertions,
12/12 PASS. CMS upgrade финального ZIP: Strict и Legacy на обоих PHP — 4/4 PASS.
Две независимые native-сборки побайтово совпадают.

## 1. Матрица и происхождение зависимостей

Каждая ячейка ниже подтверждена полной функциональной матрицей и отдельным
строгим native lifecycle с aliases OFF и заранее записанным private consent log.
Во всех ячейках установлен один и тот же финальный ZIP с указанным ниже SHA256.

| Официальный MODX | Комплектный xPDO | PHP 8.1.34 | PHP 8.2.34 |
| --- | --- | --- | --- |
| 3.1.2-pl | 3.1.5 | PASS | PASS |
| 3.2.0-pl | 3.1.7 | PASS | PASS |
| 3.2.1-pl | 3.1.7 | PASS | PASS |
| 3.2.2-pl | 3.1.7 | PASS | PASS |
| 3.2.3-pl | 3.1.7 | PASS | PASS |
| 3.2.4-pl, regression baseline | 3.1.7 | PASS | PASS |

Использованы полные официальные ZIP из `modx.s3.amazonaws.com/releases/VERSION/`,
включая поставляемый `core/vendor`. Composer update и подмена xPDO не выполнялись.
URL, SHA256 каждого дистрибутива, Composer source reference xPDO, точные версии
и группы проверок сохранены в [финальном evidence](evidence/modx3-version-compatibility-final.json).
Первоначальные 276 групп / 6494 assertions сохранены в
[preliminary evidence](evidence/modx3-version-compatibility.json), с явной пометкой
о найденном пропуске Origin в API-harness; самостоятельно release gate они не образуют.
Общий DB/runtime baseline: MariaDB 11.8.9, Apache, Chromium/Playwright.
Все 12 конфигураций запустились на запрошенных PHP; замен PHP и SKIP нет.

У каждой ячейки свой compose project, MariaDB container/volume, БД, каталог CMS,
private directory, credentials и логи. Первоначальные порты: только
`127.0.0.1:21800–21811`; финальные: только `127.0.0.1:21900–21911`;
дополнительный lifecycle: только `127.0.0.1:22000–22011`.
Всего подготовлены 36 независимых официальных установок в трёх кампаниях.
Порты БД не публикуются. Существующие сайты и базы других проектов не использованы.

## 2. Предварительный аудит API и обнаруженные проблемы

Аудит официальных исходников выполнен **до установки CMS**. Команда воспроизведения:
`python3 tests/modx3-matrix/analyze.py`; локальные результаты:
`.local/modx3-matrix/api-hashes.json` и `api-diff.txt`.

| Поверхность API | Различия и решение |
| --- | --- |
| `modPackageBuilder`, base `Processor`, DB register queue | Проверенные реализации совпадают между всеми шестью дистрибутивами. |
| xPDO transport/script vehicles | Проверенные реализации совпадают; в file/object vehicles между xPDO 3.1.5 и 3.1.7 меняется написание casts `integer/boolean` → `int/bool`. Используемые параметры и lifecycle совместимы. |
| `modTransportPackage` | В 3.2 заменён расчёт `memory_limit` на `ini_parse_quantity`. Native installation/reinstallation/upgrade проверены на обоих PHP; локальный override CMS не нужен. |
| `modNamespace` | В 3.2 появились дополнительные методы/константа и null-safe обработка path. Компонент использует существующие `getCorePath` и непустой canonical namespace path. |
| Deprecated aliases | Runtime и transport используют FQCN; стандартная конфигурация и `load_deprecated_global_class_aliases=false` проверены отдельно в каждой ячейке. |

Несовместимостей PHP-ядра компонента с этими MODX/xPDO не обнаружено.
Дополнительных compatibility layers, отдельных версий ядра, frontend version
checks или изменений модели категорий/согласий/сервисов не потребовалось.
Изменены только нижняя граница MODX и release metadata; функциональный frontend
и Legacy сохранены.

Все неуспешные первоначальные попытки сохранены, а не превращены в PASS:

- Старый локальный PHP 8.2 образ не имел обязательных `gd`/`zip`; setup отказался
  продолжать. Собран отдельный полный PHP 8.2.34 образ. Продолжение разрешено
  только после проверки отсутствия таблиц в собственной подготовленной БД.
- Permission-denial fixture, запущенный от root, не проверяет запрет `chmod`.
  Regression выполнен от `www-data`: PASS на PHP 8.1.34 и 8.2.34.
- Upgrade guard остановил копирование штатных `config.core.php` до изменения CMS.
  Исправлен harness: активные config files сохраняются при официальном overlay.
- Первый browser probe после CMS upgrade ожидал Strict, хотя сохранённый fixture
  был в Legacy. Probe теперь выводит ожидания из сохранённых options; Legacy не
  изменялся ради теста.
- На 3.2.3/PHP 8.1 pending `route.fetch` пересёкся с закрытием Playwright context
  после четырёх PASS native-групп. Harness ожидает `unrouteAll({behavior:'wait'})`;
  первоначальный лог и JSON сохранены. Остальные группы продолжены на той же
  установке, без reset и повторного объявления fresh install.
- При подготовке финального релиза синхронизирован stamp frontend manifest с
  runtime version. Дополнительные assertions сверяют его и adapter checksum state
  с реально установленной версией пакета. Поэтому pl2/pl3 остаются только
  непубликуемыми тестовыми предшественниками, финальный release index — **pl4**.
- Первоначальный API-harness не передавал `Origin`, а проверка Save учитывала
  только `success=true`. Компонент возвращал `partial=true`, оставляя аудит
  ненастроенным; первый audit POST получал 503. Последующий настоящий browser Save
  передавал Origin и настраивал аудит. Исправлен **harness**, не защитный код:
  Origin/Referer, `partial=false`, точный private log path и `auditStatus=ready`.
  Отдельные 12 чистых lifecycle-установок воспроизводят отказ без Origin, затем
  проверяют корректный setup, HTTP 200 и непустой журнал до/после native upgrade.
- После накопления disposable-сетей исчерпался стандартный Docker address pool.
  До продолжения сохранены Docker logs завершённых стендов и удалены только их
  контейнеры/сети через compose `down` без удаления DB volumes. Другие проекты,
  глобальные Docker settings и global prune не затрагивались.

Финальный разбор серверных логов не выявил неожиданных HTTP 5xx или PHP
warnings/deprecations/fatals. Известные audit 503 до корректного setup отдельно
посчитаны и объяснены в evidence; в lifecycle это явный отрицательный контроль.
Положительные доставки до/после native upgrade подтверждены ответами 200.

## 3. Native install, upgrade и browser regression

В каждой ячейке выполнены реальные CLI setup официального MODX, DB connection и
вход в Manager. Компонент загружается через штатный HTTP Package Manager:
upload → scanlocal → install, с проверкой установленной package record.
Файлы runtime не заменяются ручным sync.

Проверки включают:

- Fresh install локального predecessor, native upgrade и reinstall; работа
  preflight/verification script vehicles и canonical/menu/log validators;
  шесть canonical elements и проверка SHA256 всех 231 runtime-файла.
- Создание/сохранение настроек, включение категорий и штатных сервисов, добавление
  custom JS, RU/EN переводов и PHP bundle rebuild без Node.js в CMS контейнере.
- Manager RU/EN: четыре вкладки, preview banner/preferences/maps, переводимый
  заголовок, guide, сохранение через UI и обычный `system/clearcache`.
- Strict/Legacy × bottom/bottom-right/bottom-left × aliases OFF/default:
  отсутствие внешних загрузок до consent в Strict, сохранение и отзыв consent,
  return visit, повторный обычный cache clear, аналитические/маркетинговые loaders,
  custom JS, `onAllowed`, две карты, три видео и iframe в inert template.
- Реальный HTTP audit receiver с ответом 200, сохранённые JSONL records, чтение
  журнала в UI/API, CSV response, запрет для anonymous и ограниченного Manager user.
- Сохранение настроек, log hashes, canonical IDs и пользовательской правки
  `services/yandex.js` при native upgrade/reinstall; bundle остаётся рабочим.

Дополнительный native lifecycle в каждой из 12 конфигураций начинает установку
с aliases OFF. После корректного setup выполняется настоящий browser consent,
ожидается успешный HTTP ACK, проверяется наличие private log, затем выполняются
native pl3 → pl4 upgrade и reinstall. Значения настроек, **хеш непустого журнала**,
IDs элементов и пользовательский адаптер должны совпасть; проверены также
блокировка custom JS до согласия и успешная новая доставка после upgrade.

Внешние SDK и iframe responses перехватываются локально в Chromium. Проверяются
вызов адаптеров и consent gating; vendor accounts/conversion delivery и реальное
видеовоспроизведение этим не подтверждаются. Сетевой HTTP endpoint компонента,
Package Manager, Manager и DB используются настоящие.

Дополнительно прошли существующие PHP regression suites на обоих PHP, включая
banner rendering, universal services, schema 3/CSV, video URL/snippets и bundle
ошибки/locking/rollback. Для esbuild и PHP minifier отдельно прошли видео-матрица
(42 сценария / 646 assertions) и тексты/placeholder (32 / 779). Boundary regression
в `tests/modx3-matrix/requirements.php` проверяет metadata, native requires,
preflight ниже 3.1.2 и начиная с 3.3.0, а также release stamp.

## 4. CMS upgrade и сравнение с 3.2.4 baseline

Финальный сценарий 3.1.2 → 3.2.4 выполнен на **обоих PHP**, с aliases OFF,
отдельно для Strict и Legacy.
Перед upgrade сохранены snapshot и SQL dump только собственной БД. Затем поверх
CMS распакован официальный 3.2.4 с сохранением active config, запущен его штатный
CLI setup `--installmode=upgrade`. xPDO перешёл с 3.1.5 на 3.1.7.

Settings values, log hashes, canonical element IDs и изменённый адаптер совпали
до/после CMS upgrade. Компонент не переустанавливался. Browser probe проверил
Manager, журнал, текущий режим, custom JS, карты/видео/iframe, сохранение/отзыв
consent, return visit и cache clear: по 23 assertions PASS в каждом сценарии.
Strict-прогоны дополнительно требуют непустой private log и совпадение SHA256
server-owned audit queue/key до/после CMS upgrade.

| Режим перед CMS upgrade | PHP | MODX / xPDO до → после | Результат |
| --- | --- | --- | --- |
| Strict | 8.1.34 | 3.1.2 / 3.1.5 → 3.2.4 / 3.1.7 | PASS |
| Strict | 8.2.34 | 3.1.2 / 3.1.5 → 3.2.4 / 3.1.7 | PASS |
| Legacy | 8.1.34 | 3.1.2 / 3.1.5 → 3.2.4 / 3.1.7 | PASS |
| Legacy | 8.2.34 | 3.1.2 / 3.1.5 → 3.2.4 / 3.1.7 | PASS |
SQL dump и credentials не включены в Git/evidence.

Baseline 3.2.4 прошёл ту же функциональную матрицу на PHP 8.1/8.2. На чистых
3.2.4 также устанавливался исходный pl1. Между pl1 и финальным pl4 побайтово
совпадают **229 из 231 runtime-файла** и все canonical object definitions.
Два различия — `CookieConsentVersion.php` и `frontend-manifest.package_version`;
в manifest не менялись inputs, JS/CSS outputs или hashes. JS/CSS совпадают с pl1.
Ухудшения проверенного поведения 3.2.4 не обнаружено.

## 5. Требования и выпуск

В feature-ветке синхронно обновлены `_build/package.json`,
`_build/build.php`, `_build/preflight.php` и README:

```php
'php' => '>=8.1.0',
'modx' => '>=3.1.2,<3.3.0'
```

PHP minimum не снижался. Native Package Manager принимает точный финальный ZIP на всех
шести MODX и обоих PHP; preflight допускает корректные версии и отклоняет версии
вне диапазона. Финальные release stamps соответствуют `1.0.8-pl4`.

Техническая совместимость **не является рекомендацией использовать старую CMS**.
MODX 3.1.2 и 3.2.0–3.2.3 содержат исправленные впоследствии уязвимости; тестировались
только локально. Для production обновляйте CMS до актуальной безопасной версии:
[официальные загрузки](https://modx.com/download/other-downloads),
[инструкция upgrade](https://docs.modx.com/3.x/en/getting-started/maintenance/upgrading).
На дату проверки официальный stable baseline — 3.2.4-pl.

Merge в `modx3`, изменение `main`, GitHub Release и production deployment не
выполнялись. Диапазон подтверждён исправленными финальными проверками; следующий
шаг — review feature-ветки и артефакта. Рекомендация по выпуску: GO для технической
совместимости, с обязательной рекомендацией пользователям обновлять сам MODX.

## 6. Финальный native transport

Артефакт: `.local/modx3-matrix/artifacts/release-pl4/cookieconsent3-1.0.8-pl4.transport.zip`.

SHA256:

```text
4e9fa131d523abf3f649c4337550e092ad2e50d697e062050d1401c4dfe5ea63
```

Native verifier: PASS; 248 vehicles (15 object, 231 file, 2 script), 490 ZIP
entries. ZIP, `.sha256`, `.inventory.json` и `.zip-inventory.json` лежат рядом.
Повторная сборка в `.local/modx3-matrix-final/artifacts/repro-pl4/` имеет тот же SHA256.
Прежние ZIP, work directories, installations и evidence сохранены.
ZIP исключён из Git существующим `.gitignore`; исходники и bounded evidence
коммитятся в feature-ветку.

Воспроизведение: [matrix harness](../tests/modx3-matrix/README.md).
Полные приватные логи/screenshots: `.local/modx3-matrix/`,
`.local/modx3-matrix-final/` и `.local/modx3-matrix-lifecycle/`;
успешные тестовые сервисы остановлены, данные и логи сохранены.
В Git не включаются credentials, SQL dumps, HAR или
Manager session tokens.
