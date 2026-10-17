# Совместимость Cookie Consent Manager с MODX 2.8.4–2.8.8

2026-10-17. **GO для review технической совместимости компонента**:
MODX **`>=2.8.4,<3.0.0`**, PHP **`>=8.1.0`**.
Финальный native transport — **cookieconsent-1.0.8-pl3**.
Работа выполнена от актуального `main` (`24fb052`) в
`codex/modx2-compatibility-284`. Merge, push, публикация и deployment не выполнялись.

Результат не означает, что старый MODX работает без собственных предупреждений
PHP: они перечислены ниже. Ошибок, внесённых компонентом, не выявлено.
Пользователям рекомендуется актуальная поддерживаемая безопасная версия CMS,
независимо от минимальной технической совместимости пакета. Дистрибутивы и
актуальные версии следует брать на [официальной странице MODX](https://modx.com/download/other-downloads).

## Матрица и границы PASS

Использованы официальные `modx-X.Y.Z-pl.zip` с
`https://modx.s3.amazonaws.com/releases/X.Y.Z/`; SHA256 каждого архива,
точные окружения и результаты — в [машиночитаемом evidence](evidence/modx2-version-compatibility.json).
Версия xPDO определена по bundled `core/xpdo/changelog.txt`, а не по отдельно
установленному Composer-пакету. Зависимости CMS не заменялись.

| MODX | Оригинальный xPDO | PHP 8.1.34 | PHP 8.2.34 | Статический аудит |
| --- | --- | --- | --- | --- |
| 2.8.4-pl | 2.8.4-pl | **PASS**, полная приёмка + fresh финального ZIP | **PASS**, то же; предупреждения CMS | PASS |
| 2.8.5-pl | 2.8.5-pl | PASS адресных API; CMS/browser **SKIP** | PASS адресных API; CMS/browser **SKIP** | PASS |
| 2.8.6-pl | 2.8.5-pl | PASS адресных API; CMS/browser **SKIP** | PASS адресных API; CMS/browser **SKIP** | PASS |
| 2.8.7-pl | 2.8.6-pl | PASS адресных API; CMS/browser **SKIP** | PASS адресных API; CMS/browser **SKIP** | PASS |
| 2.8.8-pl | 2.8.6-pl | PASS после CMS upgrade | PASS короткого baseline regression и после CMS upgrade | PASS |

Промежуточные CMS намеренно не устанавливались, как предусмотрено заданием.
PASS адресного API не обозначает PASS браузерной приёмки целой CMS.
Для каждой пары MODX/xPDO из таблицы отдельным PHP-процессом проверены реальные
`getCollection('modSystemSetting', ['key:IN' => …])` и рекурсивный `deleteTree()`
из её оригинального дерева исходников: **10 запусков / 30 assertions PASS**.
Эти процессы читают только БД собственного disposable-стенда, не подменяя
загруженные классы или зависимости установленной CMS.

На 2.8.4 создано четыре независимых установки: по одной на PHP для основной
приёмки и последующего CMS upgrade, затем по одной для fresh проверки точного
финального ZIP и изменённого адаптера при очистке кеша. У каждой свои каталог,
MariaDB-контейнер, именованный DB volume, БД, пароли и логи. MariaDB **10.6.28**,
Apache, Node **22.23.2**, Playwright **1.62.1**, Chromium. HTTP опубликован только
на `127.0.0.1:22840–22843`, DB-порты не опубликованы. Существующие клиентские
сайты и базы других проектов не использовались. Для baseline использован
существующий repository-owned release-test стенд 2.8.8 на порту 22888.

## Аудит реально используемых API

Сравнены 193 PHP-файла каждой официальной версии: всё дерево xPDO PHP,
transport builder/package/vehicles, registry DB, базовые MODX processors и
Manager controllers, используемые модели и maps, request/response, настройки,
элементы, кеш, Package Manager upload/scan/install и clearcache/login processors.
Полные diff сохранены в `.local/modx2-compatibility/api-diffs/`;
в evidence перечислены все изменившиеся файлы.

| Переход | Изменение | Влияние и проверка |
| --- | --- | --- |
| 2.8.4 → 2.8.5 | MODX получает locale через `setlocale(LC_ALL, '0')` и корректнее обрабатывает пустую настройку | Сигнатуры API сохранены. Реальные запуск, login и Manager на 2.8.4/2.8.8 прошли |
| 2.8.4 → 2.8.5 | xPDO нормализует оператор SQL в верхний регистр | Компонент уже использует верхний регистр. Адресный `IN` тест прошёл на всех bundled xPDO |
| 2.8.4 → 2.8.5 | xPDOCriteria объявляет `$xpdo` | Устраняет upstream deprecation PHP 8.2; семантика запросов сохранена |
| 2.8.5 → 2.8.6 | `modUser::getGravatar()` меняет default `mm` → `retro` | Компонент этот метод не вызывает |
| 2.8.6 → 2.8.7 | `modMenu` дополнительно поднимает Installer вверх при `package_installer_at_top` | Меняется порядок меню, а не save/lookup API. Запись CMP остаётся дочерней для components, её action/namespace и права сохранены |
| 2.8.6 → 2.8.7 | xPDO `deleteTree()` проверяет resource handle | Сигнатура сохранена. Рекурсивное удаление проверено на каждой версии; реальный cache-triggered bundle build — на 2.8.4 |
| 2.8.7 → 2.8.8 | modConnectorResponse перестаёт динамически присваивать response; modLexicon объявляет config | Результат processor и локализация сохранены; реальные PM/CMP RU/EN проверки прошли |

В выбранных transport, vehicles, validators/resolvers API, model maps и базовых
processors несовместимых изменений не обнаружено. Компонент не требует
compatibility fix. Его PHP-ядро, категории, структура сервисов, consent-модель
и Legacy не менялись; frontend JS/CSS побайтно совпадают с `main`.
Перед CMS upgrade проверено **167 оригинальных файлов**, на двух финальных
fresh стендах расширенная сверка всех выбранных API, включая Menu/Category/ACL,
и всех bundled xPDO файлов охватила **195 файлов**. Изменений — **0**.

## Реальные установки, upgrade и browser regression

| Проверка | Результат |
| --- | --- |
| Основная приёмка 2.8.4 / PHP 8.1 | **13 сценариев / 432 assertions PASS** |
| Основная приёмка 2.8.4 / PHP 8.2 | **13 / 432 PASS**, с известными предупреждениями исходной CMS |
| Точный финальный ZIP: fresh 2.8.4 / PHP 8.1 | **4 / 57 PASS** |
| Точный финальный ZIP: fresh 2.8.4 / PHP 8.2 | **4 / 57 PASS** |
| Короткий regression существующего 2.8.8 / PHP 8.2 | **4 / 52 PASS** |
| CMS 2.8.4 → 2.8.8 / PHP 8.1, сохранён Strict | **PASS**, затем **24 browser assertions PASS**, без reinstall компонента |
| CMS 2.8.4 → 2.8.8 / PHP 8.2, сохранён Legacy | **PASS**, затем **24 browser assertions PASS**, без reinstall компонента |

Native установка выполнена через настоящий Manager login и штатные
`workspace/packages/upload`, `scanlocal`, `install`, с проверкой установленной
записи пакета. Непубликуемый feature predecessor `1.0.8-pl2` использован для
fresh → upgrade до `pl3`; повторная установка тех же байтов `pl3` проверена.
Отдельная финальная пара начинала сразу с точного `pl3`. На baseline проверен
настоящий upgrade **1.0.8-pl1 → pl3** и reinstall; номер `pl2` оставлен тестовому
предшественнику. Прежние ZIP и их артефакты не перезаписывались.

Основная приёмка охватывает сохранение настроек, категорий, включённых сервисов,
RU/EN текстов; четыре вкладки Manager, preview banner/preferences/map,
переводимый заголовок, шесть разделов руководства, Save и журнал.
Strict и Legacy проверены во всех трёх положениях: bottom, bottom-right,
bottom-left. Проверены принятие/отзыв, повторный визит и обычная очистка кеша.

Проверены Google Maps, Яндекс Карты, YouTube, RUTUBE, VK Видео и произвольный
iframe в trusted template — шесть экземпляров. Strict до согласия не делает
внешних запросов; Legacy сохраняет существующее поведение. После grant
работают `onAllowed`, custom JS и восстановление consent. После revoke iframe
исчезают, категории отозваны. Отдельно подтверждены запросы SDK Яндекса,
Mail.Ru/VK, Google и Meta, Google config queues GA4/Ads, отдельные Mail.Ru/VK IDs
и GTM. Внешние SDK/player ответы контролировались локально;
**реальная отправка поставщикам и playback — SKIP**, это не заявляется как PASS.

Сборка Peast на сервере проверена через `bundle_rebuild` в Manager. Затем
изменён исполняемый исходник `/services/yandex.js`; штатный `system/clearcache`
увеличил bundle version и изменил SHA256 готового minified bundle на обеих PHP.
Изменённый адаптер пережил native reinstall. На baseline все прежние файлы
`/services`, включая customer-extra.js и изменённый GA4, сохранили SHA256 при
upgrade/reinstall. Новых JS exceptions и неожиданных HTTP 4xx/5xx нет;
отрицательные ACL 401/403 учтены отдельно.

Browser consent отправлялся в настоящий `audit.php`, без подмены ACK.
`web86:consent-audit-delivery` с `ok=true` и HTTP ACK `event_id` сопоставлены
с реальной записью месячного `YYYY-MM-cookie-consent.log` через штатный
header-aware JSONL reader. Проверены logs_list, CSV, Manager journal,
анонимный отказ и отказ пользователю без manage/view_logs permissions.
До native upgrade создан непустой журнал; его байты сохранены.

Перед CMS upgrade сделаны private SQL dumps и полные snapshots. Официальный
2.8.8 наложен с сохранением активных config файлов, запущен штатный CLI setup
`--installmode=upgrade`. Settings/services/texts, JSONL SHA256, шесть canonical
ID, пользовательский yandex.js и hash DB audit queue/key совпали до/после.
Frontend, новые ACK/JSONL, custom JS, шесть iframe, повторный визит, cache clear,
Manager и журнал работают без переустановки компонента.

Baseline 2.8.8 сохранил настройки, исторические журналы, ID/metadata элементов,
owner JS и все adapters при обновлении пакета; server bundle, Manager,
Strict/Legacy, map/video и отзыв согласия работают как прежде.
Полная историческая acceptance-матрица 2.8.8 повторно не запускалась.

## Предупреждения исходной CMS и неуспешные попытки тестов

**Чистый PHP/MODX error.log не заявляется.** На официальном 2.8.4 без изменения
ядра зарегистрированы:

- setup warning об отсутствующем первоначальном settings cache;
- undefined variables/keys в штатных Smarty login/header templates;
- warning `MagpieRSS::feed_start_element()` о передаче `$attrs` по ссылке;
- PHP 8.2 deprecations динамических свойств modInstallLexicon и xPDOQuery.

Первоначальный Manager baseline записан до установки компонента на финальной
паре. RSS загружается асинхронно: его warning появился после этого snapshot.
Источник отдельно воспроизведён из оригинального `xmlrss` без bootstrap
компонента на обеих PHP ([upstream.php](../tests/modx2-compatibility/upstream.php)).
Эти предупреждения отражены с ненулевыми счётчиками в evidence; error_reporting
ради прохождения тестов не менялся, xPDO/ядро не заменялись для их устранения.
Официальный [анонс 2.8.8](https://modx.com/blog/modx-revolution-2.8.8)
также описывает устранение deprecations PHP 8.2 в modLexicon/connector.
Fatal/parse ошибок CMS или компонента в рабочих сценариях не было.

Первый тестовый reader ошибочно искал `.jsonl` вместо `.log` и был исправлен
на `CookieConsentAuditFormat::records()`. Затем UI тест использовал URL
переключения языка MODX 3, отсутствующий в MODX 2; заменён штатной настройкой
manager_language и обычным CMP URL. Тест preflight первоначально не подгрузил
`xPDOTransport`; добавлен штатный loadClass. Неуспешные попытки сохранены в
ignored evidence; финальный отчёт содержит предыдущие browser FAIL отдельно.
Они не выдаются за несовместимости компонента или за финальные PASS.

## Итоговые требования и артефакт

После успешных проверок синхронно изменены `_build/package.json`,
`_build/build.php`, `_build/preflight.php`, version/manifest stamps, README и
документация. PHP минимум не снижен. Preflight boundary tests на PHP 8.1/8.2
принимают 2.8.4–2.8.8 и отвергают 2.8.3/3.0.0; реальные Package Manager
проверки описаны выше.

```php
'php' => '>=8.1.0',
'modx' => '>=2.8.4,<3.0.0'
```

Новый ZIP:
`.local/modx2-compatibility/artifacts/release/cookieconsent-1.0.8-pl3.transport.zip`

SHA256:
`2d2f410fa03ebae88567598c96d95cd4ab2a3a6811e225b8433067a9489b20b6`

Рядом находятся `.sha256`, native inventory, ZIP inventory и verification.json.
**248 native vehicles**: 15 object, 231 file, 2 script; **490 ZIP entries**.
Сборки из финального checkout на PHP 8.1 и 8.2 после штатной нормализации
побайтно совпали друг с другом и с испытанным feature-кандидатом `pl3`.
Старые пакеты сохранены. ZIP не включён в Git согласно политике репозитория.

**GO — для review этого компонента с указанными ограничениями.** Для выпуска
использовать только данный новый ZIP и SHA256; техническая совместимость не
является рекомендацией оставлять старую CMS в production. Новые стенды
остановлены, их данные и сырые логи сохранены в ignored `.local/`.
MODX 3 и ветка `modx3` не изменялись.
