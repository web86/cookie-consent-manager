# Cookie Consent Manager 1.0.2 — аудит совместимости с MODX 3

Дата: **14 октября 2026, Europe/Istanbul**. Этап: технический аудит и проектирование; реализация не изменялась.

## A. Executive Summary

**Перенос технически целесообразен. Текущий transport 1.0.2 не совместим с MODX 3.2.4 без адаптации. Рекомендуется общее ядро и две независимые native-сборки (вариант B), с небольшими различиями CMS-интеграции.** Главная сложность — безопасная установка и обновление пяти canonical элементов, затем загрузка Manager и выбор его языка. Оснований переписывать frontend, менять consent-семантику, вводить собственные таблицы или новый UI-фреймворк не найдено.

Подтверждены блокеры: ограничения версии пакета; создание builder через отсутствующее глобальное имя; загрузка коротких file/script vehicle class names при сборке xPDO 3; несовпадение имён controllers с маршрутизатором MODX 3; чтение удалённой системной настройки языка Manager. Отдельно подтверждена зависимость прямых глобальных PHP-имён от deprecated aliases. Это не означает, что каждый короткий ORM class key уже сломан: MODX 3.2.4 переводит их через `loadClass()`.

Оценка: **умеренная сложность адаптации, высокая ответственность lifecycle-проверок**. Native Package Management, class-based processors, ORM системных настроек и обычный JavaScript остаются пригодными. Полная совместимость ещё **NOT RUN**: установленного MODX 3 в проверенном workspace нет. Загружены только официальные исходники во временный каталог; MODX, vendor-зависимости и БД не устанавливались.

### База и границы исследования

- В начале: ветка `feature/modx2-commercial-polish-performance`, HEAD `44e4fef8891202512c12f5c0d1a4c4d649b3fcdc`, рабочее дерево чистое.
- Удалённая `origin/modx3` проверена через `git ls-remote`, получена и выбрана локально с tracking. Её HEAD совпадает с исходным коммитом задания. Анализ и отчёт выполнены на `modx3`.
- `main` остаётся на `b6c4402a0d61c167ca9f677cc25dcc2c26e235c9`. Commit/push/release/deployment не выполнялись. Единственный новый файл проекта — этот отчёт.
- Исследованы README, текущие PHP/JS/CSS, build/vehicles/validators, harness и последние acceptance-доказательства. Метаданные `_build/package.json` описывают 1.0.2. Последняя приёмка — [locale-guide acceptance](/Users/sonoma/Desktop/cookie-consent-manager/docs/modx2-locale-guide-acceptance.md) и [JSON evidence](/Users/sonoma/Desktop/cookie-consent-manager/docs/evidence/modx2-locale-guide-results.json): **506 проверок / 4170 assertions / 0 итоговых FAIL** на MODX 2.8.8-pl/PHP 8.2.34. Это исторические результаты, не новый прогон и не доказательство MODX 3.
- [Commercial polish acceptance](/Users/sonoma/Desktop/cookie-consent-manager/docs/modx2-commercial-polish-acceptance.md), [public registry contract](/Users/sonoma/Desktop/cookie-consent-manager/docs/public-service-registry.md), canonical/transport/viewer/category документы прочитаны вместе с кодом. Старые beta-документы с четырьмя canonical элементами, stock-копиями или прежним lifecycle не принимаются за текущую архитектуру. Фактически сейчас **пять canonical элементов, шесть settings vehicles, 14 object + 55 file + 2 script vehicles** в последнем 1.0.2 acceptance.
- Найдены 118 файлов локальных MODX version metadata, все с major `2`; активные main/publiccore fixtures указывают 2.8.8. Это проверка workspace, не инвентаризация всех сайтов компьютера.

### Внешние основания

Основной источник — официальный [MODX 3.2.4-pl, commit `c7c38028e81022285a2f2aab9fd076bb9e2d89f4`](https://github.com/modxcms/revolution/tree/c7c38028e81022285a2f2aab9fd076bb9e2d89f4). Его [composer.json](https://github.com/modxcms/revolution/blob/c7c38028e81022285a2f2aab9fd076bb9e2d89f4/composer.json) требует PHP ≥8.1 и xPDO `~3.1.0`. В source archive нет composer.lock/vendor: точная версия xPDO из установленного release ZIP здесь не измерена. Transport отдельно сверён с официальными xPDO [3.1.0](https://github.com/modxcms/xpdo/tree/941b50975ef83bfaf7a09562355e41a355f76764) и [3.1.7](https://github.com/modxcms/xpdo/tree/70a3046b7aff11ac8fff540e60d9750ebbd8fab9); ниже version-specific выводы явно ограничены этими исходниками.

Официальные документы: [изменённые имена классов](https://docs.modx.com/3.x/en/getting-started/upgrading-to-3.0/class-names), [processors](https://docs.modx.com/3.x/en/getting-started/upgrading-to-3.0/processors), [язык Manager](https://docs.modx.com/3.x/en/getting-started/upgrading-to-3.0/manager-language), [xPDO 3](https://docs.modx.com/3.x/en/getting-started/upgrading-to-3.0/xpdo), [core folder](https://docs.modx.com/3.x/en/getting-started/upgrading-to-3.0/core-folder), [modAction](https://docs.modx.com/3.x/en/getting-started/upgrading-to-3.0/modaction). При расхождении общих формулировок документации и деталей API использован код фиксированного тега 3.2.4.

### Статусы и фактически выполненные проверки

**PASS** — выполненная успешная проверка в указанной области. **FAIL** — подтверждённое несоответствие конкретному контракту. **RISK** — проблема, которую ещё нужно подтвердить в работающей CMS. **NOT RUN** — сценарий не запускался. PASS проверки исходников/изолированного PHP не означает PASS компонента в MODX 3.

| Проверка этой сессии | Результат | Область доказательства |
|---|---|---|
| Branch/HEAD/чистое дерево до аудита | PASS | Git; никаких исходных незакоммиченных изменений |
| `php -l` для server и _build | PASS, 53 файла | Только синтаксис, PHP CLI 8.5.10; не выполнение на PHP 8.1/8.2 |
| `node --check` для JS/MJS assets, _build, examples | PASS, 21 файл | Только синтаксис, Node v22.23.2; browser/CMS не запускались |
| SHA256 frontend/guide inputs и outputs, размеры frontend | PASS, 11 проверок | Только чтение manifest и файлов; build не запускался |
| Pure PHP: проекция registry без мутации, schema/technical fields/display omission, default categories/versions | PASS, 6 условий | Реальные методы component core, без БД/файловых записей |
| DB-free probe официального class loader | FAIL для текущих builder/vehicle имён | Namespaced builder загружается; глобальный builder отсутствует; legacy file/script loader возвращает false |
| DB-free `modManagerResponse::getControllerClassName()` | FAIL для index и logs | Реальный маршрутизатор 3.2.4 с существующими controller files выбрасывает NotFoundException |
| Native build/install/upgrade/reinstall/uninstall на MODX 3 | NOT RUN | Нет установленной MODX 3 fixture |
| Settings/ACL/SSR/browser/audit POST/CSV на MODX 3 | NOT RUN | Требуются отдельная БД, CMS и HTTP/browser окружение |

Изолированные probes использовали простое отображение autoload путей официальных исходников и Reflection без вызова конструкторов MODX/response. Один probe явно подключал штатный `deprecated.php`, как при default-конфигурации 3.2.4. Они не запускали `index.php`, не открывали соединение БД, не создавали transport и не читали secrets сайта. Исходные тесты, Docker fixtures, reset/install/configure/restore helpers не запускались. Никакие реальные журналы не изменены.

## B. Compatibility Matrix

«API сохранён» ниже означает подтверждение в upstream-коде; фактическая интеграционная приёмка MODX 3 всё равно NOT RUN.

| Подсистема | Файлы | Совместимость | Необходимые изменения | Риск |
|---|---|---|---|---|
| PHP consent/registry/text/sanitizer core | `server/src/CookieConsentServiceRegistry.php`, `CookieConsentTexts.php`, `CookieConsentHtmlSanitizer.php`, `CookieConsentBannerRenderer.php` | Pure PHP преимущественно независимо от CMS; изолированная registry-проверка PASS | Сохранить контракты; CMS class keys адаптировать только на границе | Низкий для core, средний для SSR/parser |
| System settings и транзакции | `server/src/CookieConsentSettings.php` | ORM/transactions сохранены; legacy class keys разрешаются с deprecation; DB NOT RUN | Малый class map MODX 2/3; сохранить locks/revisions/cache refresh | Средний: SQL locks, кеш и partial save |
| Canonical snippets | `server/modx2-{assets,banner,consent,map}-snippet.php` | Snippet/chunk/client registration API сохранён; прямой `modX` требует alias | Logging без глобального alias; общий snippet source с CMS integration helper | Средний: cold/warm HTML, legacy injection, custom static metadata |
| Transport builder и constraints | `_build/build.php`, `_build/package.json`, `_build/preflight.php` | FAIL: builder имя и предел MODX 2 | MODX 3 build profile, FQCN builder/vehicles/constants, согласованные requires/preflight | Высокий: install/upgrade |
| File/script/object vehicles | `_build/build.php`, `_build/verify-install.php`, `_build/adapt-menu.php`, validators | Native механизм есть; legacy file/script build loading FAIL; lifecycle NOT RUN | Использовать namespaced build classes, сохранить attributes/порядок | Высокий при частичном отказе |
| Пять canonical updates/backup | `_build/validators/canonical-elements.php`, `server/bin/restore-elements.php` | Алгоритм native updates доступен; alias-dependent type test требует адаптации | Явная правильная идентификация Chunk/Snippet, metadata/backup invariants | Критический: пользовательские элементы |
| ZIP verification/orchestration | `_build/verify.php`, `_build/transport.mjs`, `_build/normalize.py` | FAIL для FQCN payload в текущем verifier; Docker orchestration привязан к MODX 2 | Target-aware class/vehicle checks и fixture profile; normalization общий | Высокий: ложная верификация артефакта |
| Namespace/menu | `_build/build.php`, `_build/adapt-menu.php` | `modMenu`/`modNamespace` API сохранён; modAction не используется | FQCN class keys в профиле; namespace/key/action сохранить | Средний: изменённый label, ACL/cache |
| Manager controllers | `server/controllers/index.class.php`, `logs.class.php` | FAIL: routing class names; родители зависят от aliases | Имена, ожидаемые маршрутизатором, и namespaced parent для MODX 3 | Высокий: страница не открывается |
| Processors/connector/auth | `server/processors/*.class.php`, `base.php`, `server/modx2-manager-connector.php` | Class files/returned class поддерживаются; parent alias-dependent; HTTP_MODAUTH сохранён | Малый parent adapter; проверить root bootstrap/ctx; сохранить POST и ACL | Высокий: доступ и CSRF/token |
| Язык CMP/CSV/guide | `server/processors/get.class.php`, `logs_export.class.php`, `CookieConsentGuide.php` | FAIL: системный manager_language вместо текущего Manager cultureKey | MODX 3 language resolver; общий RU/EN guide source | Средний: неправильный язык/рассогласование |
| Manager DOM/CSS/preview/viewer | `assets/components/cookieconsent/{manager.js,audit-viewer.js,manager.css}`, `server/templates/home.tpl` | Нет прямой зависимости от Ext components; browser NOT RUN | Первоначально сохранить JS/CSS; проверить окружение Manager | Средний: CSS, Escape, focus, CSP |
| Единый публичный frontend/API/maps | `assets/js/cookie-consent/{runtime,provider-registry,consent-manager}.js`, `_build/frontend.mjs`, `CookiesPopup.html` | CMS-независим; syntax/hash PASS; browser MODX 3 NOT RUN | Изменения ядра не обоснованы; одинаковый bundle/HTML contract | Высокий при изменении consent-семантики |
| Public audit wrapper/config | `server/modx2-public-endpoint.example.php`, `CookieConsentAuditConfiguration.php` | API bootstrap сохранён; modX instanceof alias-dependent; queue переводится loader | Native class keys/instance check, deployment-path checks | Высокий: отказ аудита/секреты |
| Receiver/logger/limiter/reader | `server/public/audit.php`, `CookieConsentAuditLogger.php`, `CookieConsentRateLimiter.php`, `CookieConsentAuditReader.php`, `CookieConsentEventValidator.php` | Pure PHP/file I/O, перенос не требует CMS API; HTTP NOT RUN | Общий код; сохранить schema/ACK/locks/CSV | Высокий: конфигурация путей и privacy |
| Permissions/retention | `_build/verify-install.php`, processors/controllers | API сохранён; реальная MODX 3 ACL NOT RUN | Сохранить определения отдельно от grants и view-only route | Высокий: не дать write при view-only |
| Release harness | `tests/local/`, `transport/`, `release/`, `polish/`, `servers/` | Привязан к MODX 2.8.8, портам/БД/signatures; MODX 3 NOT RUN | Отдельный environment adapter, evidence и native lifecycle scenarios | Высокий: случайный запуск против чужой fixture |

## C. Confirmed Incompatibilities

### C1. Пакет сознательно исключает MODX 3

Источник: [package metadata](/Users/sonoma/Desktop/cookie-consent-manager/_build/package.json:9), [builder requires](/Users/sonoma/Desktop/cookie-consent-manager/_build/build.php:98), [preflight](/Users/sonoma/Desktop/cookie-consent-manager/_build/preflight.php:6).

`maximum_modx` равен 3.0.0; builder фактически задаёт `>=2.8.8,<3.0.0`, preflight проверяет тот же верхний предел. Значения package.json не являются единственным источником requires: изменение одной JSON-настройки недостаточно. В MODX 3 [modTransportPackage::install()](https://github.com/modxcms/revolution/blob/c7c38028e81022285a2f2aab9fd076bb9e2d89f4/core/src/Revolution/Transport/modTransportPackage.php#L304) проверяет зависимости и по умолчанию прекращает установку при неудовлетворённых constraints. Даже обход dependency check не обходит preflight.

**FAIL по статическому контракту**: исходный ZIP не предназначен для установки на 3.2.4. Сам Install в Manager не запускался. Решение — отдельный target profile с requires/preflight для доказанного диапазона. Первый MODX 3 release следует принимать на 3.2.4; поддержку других 3.x расширять только после соответствующих прогонов.

### C2. Builder загружается под другим именем, чем затем создаётся

Источник: [build.php:80](/Users/sonoma/Desktop/cookie-consent-manager/_build/build.php:80), upstream [modX::loadClass()](https://github.com/modxcms/revolution/blob/c7c38028e81022285a2f2aab9fd076bb9e2d89f4/core/src/Revolution/modX.php#L2554), [modPackageBuilder](https://github.com/modxcms/revolution/blob/c7c38028e81022285a2f2aab9fd076bb9e2d89f4/core/src/Revolution/Transport/modPackageBuilder.php).

Вызов `loadClass('transport.modPackageBuilder',...)` в 3.2.4 возвращает `MODX\Revolution\Transport\modPackageBuilder`. Создаваемый legacy alias относится к полному переданному dotted key, а не к короткому `modPackageBuilder`. Последующий `new modPackageBuilder` обращается к другому имени. В штатном [deprecated.php](https://github.com/modxcms/revolution/blob/c7c38028e81022285a2f2aab9fd076bb9e2d89f4/core/include/deprecated.php) короткого alias builder нет.

DB-free probe: return — namespaced builder; `class_exists('modPackageBuilder', false)` после вызова — false. **FAIL подтверждён**, без запуска самого builder и DB. Решение — MODX 3 profile создаёт namespaced builder напрямую; MODX 2 profile сохраняет свой штатный класс. API создания package, регистрации namespace, vehicles и pack сохраняется. Bootstrap через MODX_API_MODE/index.php уже подходит MODX 3; ручной require старого `core/model/modx/transport/...` не нужен.

### C3. Короткие file/script vehicle names не подходят текущему build path xPDO 3

Источник: [script vehicles](/Users/sonoma/Desktop/cookie-consent-manager/_build/build.php:83), [file vehicles](/Users/sonoma/Desktop/cookie-consent-manager/_build/build.php:94), upstream [xPDOTransport::put()](https://github.com/modxcms/xpdo/blob/70a3046b7aff11ac8fff540e60d9750ebbd8fab9/src/xPDO/Transport/xPDOTransport.php#L326), [xPDO::loadClass()](https://github.com/modxcms/xpdo/blob/70a3046b7aff11ac8fff540e60d9750ebbd8fab9/src/xPDO/xPDO.php#L605).

Builder передаёт `vehicle_class` со значениями `xPDOScriptVehicle`/`xPDOFileVehicle`. В проверенных xPDO 3.1.0 и 3.1.7 путь `put()` добавляет legacy package `transport`, получая dotted class key. Глобальных aliases этих двух классов в deprecated.php MODX нет; legacy loader ищет старую файловую раскладку, которой в xPDO 3 нет.

DB-free probe 3.2.4/xPDO 3.1.7: оба `transport.xPDO...Vehicle` возвращают false, оба `xPDO\Transport\xPDO...Vehicle` загружаются. **FAIL текущего build path подтверждён.** Решение — namespaced file/script classes в MODX 3 profile. Object vehicle по умолчанию xPDO 3 уже namespaced. Нельзя переносить этот вывод на весь старый ZIP-формат: `xPDOTransport::get()` отдельно переводит короткие vehicle names при чтении пакета. Следовательно, старые native transport packages не запрещены как формат; этот компонент блокируется своими constraints, PHP и build path.

### C4. Маршрутизатор MODX 3 не находит существующие Manager controllers

Источник: [Index controller](/Users/sonoma/Desktop/cookie-consent-manager/server/controllers/index.class.php:2), [Logs controller](/Users/sonoma/Desktop/cookie-consent-manager/server/controllers/logs.class.php:4), upstream [modManagerResponse::getControllerClassName()](https://github.com/modxcms/revolution/blob/c7c38028e81022285a2f2aab9fd076bb9e2d89f4/core/src/Revolution/modManagerResponse.php#L244).

Для namespace `cookie_consent` и action `index` маршрутизатор 3.2.4 нормализует namespace вместе с action, удаляя `_`, и ожидает `CookieconsentIndexManagerController`. Файл объявляет `Cookie_consentIndexManagerController`. Для logs аналогично ожидается `CookieconsentLogsManagerController`. Возвращаемая из файла строка здесь не исправляет несовпадение: маршрутизатор использует require_once и затем проверяет своё вычисленное имя. В MODX 2 namespace prefix присоединяется другим этапом, поэтому исходная схема работала.

DB-free вызов реального метода с namespace path на `server/` дал **NotFoundException для обоих routes**, при загруженных текущих классах и default deprecated aliases. **FAIL подтверждён** независимо от отказа package install. Минимальное решение — MODX 3 controller entry points с ожидаемыми именами и namespaced parent; namespace `cookie_consent`, menu action `index`, прямой view-only action `logs` оставить прежними. Применение общего имени для обеих CMS допустимо только после проверки routing MODX 2; переименование самого namespace не требуется.

### C5. CMP, guide и CSV выбирают язык по удалённой системной настройке

Источник: [GetProcessor::execute()](/Users/sonoma/Desktop/cookie-consent-manager/server/processors/get.class.php:14), [LogsExportProcessor::execute()](/Users/sonoma/Desktop/cookie-consent-manager/server/processors/logs_export.class.php:6), официальная [Manager Language](https://docs.modx.com/3.x/en/getting-started/upgrading-to-3.0/manager-language), upstream [modConnectorRequest::initialize()](https://github.com/modxcms/revolution/blob/c7c38028e81022285a2f2aab9fd076bb9e2d89f4/core/src/Revolution/modConnectorRequest.php#L36).

MODX 3 выбирает Manager language через session и предоставляет его в текущем `cultureKey`. На чистой установке системной `manager_language` нет; компонент получит fallback EN даже при RU Manager. После миграции оставшееся старое значение может давать постоянный язык независимо от выбора пользователя. От него зависят managerStrings, guide, initial text/preview language и CSV labels.

**FAIL контракта определения языка подтверждён кодом и документацией**; RU browser test MODX 3 NOT RUN. Решение — читать эффективный `cultureKey` уже инициализированного mgr request в MODX 3 adapter, валидировать language и использовать stock fallback. Для MODX 2 сохранить нынешнее поведение. Публичный SSR использует cultureKey web context и не должен наследовать Manager session language. JS уже получает язык с сервера: переписывать его на MODx.config.cultureKey не требуется.

### C6. Прямые глобальные PHP-имена требуют compatibility aliases

Конкретные места: [controller parent](/Users/sonoma/Desktop/cookie-consent-manager/server/controllers/index.class.php:2), [processor parent](/Users/sonoma/Desktop/cookie-consent-manager/server/processors/base.php:4), [public wrapper instanceof](/Users/sonoma/Desktop/cookie-consent-manager/server/modx2-public-endpoint.example.php:12), `modX::LOG_LEVEL_*` в snippets/processors, `xPDOTransport::*` и `xPDO::*` в build scripts/validators.

В 3.2.4 default `load_deprecated_global_class_aliases=true` загружает эти aliases; поэтому **это не безусловный FAIL стандартной 3.2.4**. При false controller/processor parent недоступен, прямые constants вызывают ошибку, wrapper `instanceof modX` не принимает namespaced instance и отвечает 503. Это подтверждённая условная несовместимость режима без aliases. Официальные namespace counterparts:

| Использование | MODX 3 класс |
|---|---|
| Gateway | `MODX\Revolution\modX` |
| CMP parent | `MODX\Revolution\modExtraManagerController` |
| Processor parent | `MODX\Revolution\Processors\Processor` |
| Chunk/Snippet/Setting/Category/Menu/Namespace | `MODX\Revolution\modChunk`, `modSnippet`, `modSystemSetting`, `modCategory`, `modMenu`, `modNamespace` с тем же namespace prefix |
| Access definitions | `MODX\Revolution\modAccessPermission`, `MODX\Revolution\modAccessPolicyTemplate` |
| Managed audit queue | `MODX\Revolution\Registry\Db\modDbRegisterQueue` |
| Builder | `MODX\Revolution\Transport\modPackageBuilder` |
| xPDO/transport classes | `xPDO\xPDO`, `xPDO\Transport\xPDOTransport`, `xPDO\Transport\xPDOObjectVehicle`, `xPDOFileVehicle`, `xPDOScriptVehicle` с transport namespace |

Решение — локальный parent/class adapter и namespaced transport profile, а не глобальное восстановление всех legacy aliases. Logging может использовать класс переданного `$modx`, без зависимости от глобального `modX`. Future 3.x следует принимать с aliases выключенными: документация предупреждает об их удалении в 3.3, а source comment 3.2.4 формулирует срок как вероятные 3.3/3.4. Фактический будущий релиз здесь не исследован; нельзя объявить его supported только по этому предупреждению.

### C7. Текущая проверка ZIP жёстко ожидает MODX 2 class identities

Источник: [verify.php](/Users/sonoma/Desktop/cookie-consent-manager/_build/verify.php:19), upstream [xPDOObjectVehicle::put()](https://github.com/modxcms/xpdo/blob/70a3046b7aff11ac8fff540e60d9750ebbd8fab9/src/xPDO/Transport/xPDOObjectVehicle.php#L386).

Verifier разрешает только короткие vehicle names и сравнивает model `class` с `modChunk`, `modSnippet`, `modCategory`, `modSystemSetting`. MODX 3 build сериализует namespaced model/vehicle identities. Такой корректный новый payload текущая проверка отвергнет либо неверно классифицирует; в частности canonical UPDATE_OBJECT будет рассмотрен как non-element. **FAIL статического контракта verifier для MODX 3 payload.** Реальная сборка NOT RUN. Решение — target-aware ожидаемые классы, сохранив все строгие проверки состава, canonical policy, defaults, hashes и secrets. PclZip fallback также ссылается на старый `core/xpdo/compression/`: для MODX 3 использовать обязательный core ext-zip либо проверенную новую dependency path, не копировать xPDO 2.

## D. Potential Risks

### D1. Canonical source replacement — обязательная защита от потери метаданных

Текущий [validator](/Users/sonoma/Desktop/cookie-consent-manager/_build/validators/canonical-elements.php:5) сохраняет incoming source, переносит existing `toArray('',true)`, восстанавливает новый source и делает `static=false`. Для отсутствующего элемента назначает существующую CookieConsent category. [Builder](/Users/sonoma/Desktop/cookie-consent-manager/_build/build.php:87) задаёт canonical natural key name и UPDATE_OBJECT=true. UNINSTALL_OBJECT=false задан для всех DB objects; PRESERVE_KEYS=false — для пяти canonical элементов и category.

xPDO 3 [object installation](https://github.com/modxcms/xpdo/blob/70a3046b7aff11ac8fff540e60d9750ebbd8fab9/src/xPDO/Transport/xPDOObjectVehicle.php#L98) поддерживает validator до обновления, поиск existing natural key, native preserved object и обновление existing instance. Нужный механизм есть; гарантия всех component invariants в MODX 3 ещё **NOT RUN**.

Особый риск — `$object instanceof modChunk`. DB-free probe показал false для namespaced chunk до legacy `loadClass('modChunk')` и true после него. **В нынешнем install sequence preflight обращается к короткому modChunk заранее**, поэтому нельзя объявить validator безусловно сломанным при default aliases. Но выборочная адаптация preflight/object definitions на FQCN уберёт это побочное создание alias: chunk может ошибочно обрабатываться как snippet, пользовательская категория/properties не будут перенесены. При адаптации validator и class map нужно менять согласованно, с проверкой настоящего типа.

Для каждой из пяти строк требуется before/after snapshot: ID, name, category/parent category, properties/property sets, description, source/static_file и остальные пользовательские поля/relations; изменяются только поставляемый code и документированный static flag. Static source file не трогать. Не удалять/создавать existing элемент заново, не выпускать stock-копии. Если одновременно есть snippet с именем CookiesPopup, validator всё равно должен искать chunk. Duplicate canonical names должны отвергаться до записи данных.

Есть ещё один риск выборочной FQCN-замены: builder на строках 86–87 определяет element ID assignment и PRESERVE_KEYS сравнением с короткими `modSnippet/modChunk/modCategory`. Если поменять только definitions на namespaced classes, эти predicates перестанут узнавать elements/category. Target profile должен классифицировать **логический тип объекта**, сохраняя прежние attributes, а не только подставлять новый текст имени класса. Проверить, что build-time IDs никогда не подменяют существующие target IDs.

`writePreserved()` и `_preserved` остаются в xPDO 3, но компонент использует внутреннюю структуру `_preserved`. Проверить format, guid keys, доступность preserved.php, reload, recovery helper dry run/apply и native RESTORE_PREEXISTING. Reinstall может заменить native backup: это не долговременный backup. Ошибки поздней записи/permissions/migration не дают атомарного rollback DB+FS. Эти ограничения есть и в текущей версии; отдельный lifecycle ledger ради переноса не обоснован.

| Lifecycle action | Текущая политика компонента, которую перенос должен сохранить |
|---|---|
| Install | Preflight первым; DB objects/category/elements; точные runtime files; final verification, idempotent legacy migration и отсутствующие permission definitions. Новые settings получают defaults, existing settings не обновляются |
| Upgrade | Тот же безопасный порядок; пять canonical sources обновляются через validator, остальные object values сохраняются. Миграции только для действительно legacy data; file hashes проверяются после copy |
| Reinstall | Не отдельная component action/ledger: используется native install mechanism. Пять sources вновь canonical, метаданные/данные retained, отсутствующие files восстановлены; прежний native backup может быть заменён |
| Uninstall | Preflight/final scripts и object validators сразу возвращают true без миграций. DB object vehicles имеют UNINSTALL_OBJECT=false; file vehicles обрабатываются штатным xPDO по точному inventory. Native preexisting restore options требуют отдельной приёмки; автоматического purge logs/settings/elements нет |

Поэтому Package Manager может использовать install/upgrade infrastructure MODX 3 без новой схемы пакета. Upload/scanlocal/installed-status и фактическое применение этих policies в 3.2.4 остаются NOT RUN; наличие методов upstream не закрывает lifecycle gate.

### D2. ORM, SQL и settings cache

[Settings::read/save/migrateCategories/restoreLogDirectory](/Users/sonoma/Desktop/cookie-consent-manager/server/src/CookieConsentSettings.php) используют getCollection/getObject, newObject/set/save, getTableName, prepare/exec и transactions. [xPDO 3 implementation](https://github.com/modxcms/xpdo/blob/70a3046b7aff11ac8fff540e60d9750ebbd8fab9/src/xPDO/xPDO.php) сохраняет эти APIs, включая getCollection и transactions. В компоненте нет custom xPDO model/schema/addPackage, поэтому регенерация своих metadata.mysql.php не требуется.

Короткие core keys сейчас переводит MODX loadClass; это compatibility path с deprecation, не необходимость механически менять все вызовы. Практически достаточно общего map для используемых классов и нескольких CMS-specific операций. Сами validate/defaults/merge/revision algorithms остаются общими. No-services/categories/schema/text validation не связаны с версиями ORM.

**RISK:** MySQL/MariaDB `FOR UPDATE`, SAVEPOINT, missing setting rows, fresh read после save, conflict detection и refresh(system_settings) проверить на настоящей MODX 3 БД. SQL не использует xPDO 2-only schema, но InnoDB/transaction semantics и ORM caches нельзя доказать lint. Политика partial save каталога должна остаться прежней: корректные обычные настройки сохраняются, прежний рабочий log_dir возвращается при I/O/setup failure. Повторный install не должен заново применять legacy category/ClientID migration к уже canonical registry.

### D3. Manager bootstrap, controllers, processors и permissions

[MODX 3 index.php](https://github.com/modxcms/revolution/blob/c7c38028e81022285a2f2aab9fd076bb9e2d89f4/index.php) сохраняет MODX_API_MODE и загружает bundled autoloader; [connectors/index.php](https://github.com/modxcms/revolution/blob/c7c38028e81022285a2f2aab9fd076bb9e2d89f4/connectors/index.php) и [modConnectorResponse](https://github.com/modxcms/revolution/blob/c7c38028e81022285a2f2aab9fd076bb9e2d89f4/core/src/Revolution/modConnectorResponse.php#L94) сохраняют mgr context/token checks. [runProcessor()](https://github.com/modxcms/revolution/blob/c7c38028e81022285a2f2aab9fd076bb9e2d89f4/core/src/Revolution/modX.php#L1769) поддерживает processors_path/action.class.php и строку класса из файла. Компонентные action files уже class-based; `base.php`/`logs_base.php` — include helpers, не удалённые flat-file processors. Реорганизация каждого processor в PSR-4 только ради переноса не обязательна.

Файл namespace bootstrap.php может понадобиться для малого adapter/autoload; собственного сервиса в DI здесь нет. Не нужен переход на getService/services ради существующих require_once utility classes. Компонент не вызывает удалённый modRestClient и не регистрирует modAction. Menu уже использует namespace/action и корректную общую модель MODX 3.

**RISK/NOT RUN:** standard и нестандартные connectors/manager/assets paths, наличие root config.core.php (wrapper сейчас требует его без fallback), ctx override, session expiry, отсутствующий/неправильный token, прямой POST каждой action. Не отключать MODX_REQP и не объединять public receiver с authenticated Manager connector. Root paths wrapper выводит через dirname(...,3): размещение assets вне обычной структуры требует отдельной integration-проверки.

Правила компонента сохранить: manage — настройка/preview/reconsent/audit setup; view_logs — list/detail/export и прямой logs route, без доступа к настройкам/ключу. Menu имеет manage-only permission, поэтому view-only вход через logs route намеренный. Final script добавляет definitions в существующие policy templates, **не grants в policy data**: проверка super-admin недостаточна. Нужны users с manage-only, logs-only, neither и отдельные policies; повторная установка не изменяет их grants. Definitions могут добавляться после первого появления соответствующего template — текущая политика, не повод автоматически расширять права.

### D4. JavaScript Manager и руководство

[manager.js](/Users/sonoma/Desktop/cookie-consent-manager/assets/components/cookieconsent/manager.js), [audit-viewer.js](/Users/sonoma/Desktop/cookie-consent-manager/assets/components/cookieconsent/audit-viewer.js) используют DOM, fetch, формы/iframe для CSV, native dialog; нет вызовов Ext.create/Ext.extend/MODx.Ajax/компонентных Ext grids. ExtJS присутствует в окружении Manager и влияет на Escape, но не является основой компонентного UI.

Сохраняются «Основные», «Сервисы», «Тексты», preview area и «Журнал», общий Save, draft/revision и inline errors. Preview sandbox с ограничивающим CSP получает sanitized server strings/CSS, не запускает provider SDK. RU/EN guide генерируется из `_build/user-guide.json`, не требует runtime markdown parser или внешнего HTTP. После C5 язык должен совпадать с активным Manager.

**RISK:** MODX 3 theme/CSS, responsive layout, Ext keyboard handling, dialog Escape/focus, CSV download iframe и restrictive hosting CSP. Подтвердить визуально в настоящем Manager. Минимальные CSS/keyboard fixes допустимы только по воспроизведённым проблемам; Vue/React rewrite не обоснован.

### D5. Public SSR, PHP и cached pages

В [modX 3](https://github.com/modxcms/revolution/blob/c7c38028e81022285a2f2aab9fd076bb9e2d89f4/core/src/Revolution/modX.php) сохранены getOption/getChunk/runSnippet/regClientStartupHTMLBlock/regClientHTMLBlock. Split Assets/Banner выводит контент напрямую, legacy snippet регистрирует его через client blocks. Map snippet проверяет embed URL и выводит data attributes; MODX-specific loader здесь не нужен.

**RISK:** правильная обработка chunk/parser, буквальных MODX/Fenom delimiters, RU/EN/custom locale, no-JS HTML, cold/warm context cache, split/legacy order и content-hash cache busting. Не восстанавливать удалённый locale JSON 1.0.1 и не полагаться на retired CookieConsentRegistry. Новый frontend должен получать тот же минимальный technical registry и PHP-rendered messages/templates.

PHP floor компонента уже 8.1 (`array_is_list`, typed properties, str_* и mixed); для MODX 3.2.4 дополнительного повышения не требуется. Нужны dom/json/mbstring по preflight; mbstring важен даже если core считает его optional. Runtime на 8.1/8.2 и более новых PHP отдельно NOT RUN. Legacy snippet записывает `$modx->cookieConsentLegacyRendered` динамически: проверить PHP 8.2+ deprecation/обработчик ошибок; это не доказанный исключительно MODX 3 дефект, потому что MODX 2 baseline уже работал на 8.2.34. Не создавать service/state framework ради этого флага.

### D6. Audit: граница CMS и действующие гарантии

Общие [receiver](/Users/sonoma/Desktop/cookie-consent-manager/server/public/audit.php), [logger](/Users/sonoma/Desktop/cookie-consent-manager/server/src/CookieConsentAuditLogger.php), [limiter](/Users/sonoma/Desktop/cookie-consent-manager/server/src/CookieConsentRateLimiter.php), reader/validator не используют MODX ORM. MODX нужен public wrapper для system settings/registry/config и Manager для доступа к просмотру.

Фактические механизмы: POST JSON, same-origin Origin/Sec-Fetch-Site checks, bounded payload, UUID/event/schema validation; HMAC используется **для ключа IP rate bucket**, не для подписи browser payload или JSONL. Replay state хранится в `.rate/state.json` с общим flock, event_id удерживается ограниченное время; месячные файлы не очищаются. ACK выдаётся после успешной limiter reservation и append/flush; append failure не подтверждается и требует нового event_id при повторной попытке. Не обещается бессрочная дедупликация или криптографическая достоверность клиентского consent claim.

Managed configuration [использует существующую native DB registry queue](/Users/sonoma/Desktop/cookie-consent-manager/server/src/CookieConsentAuditConfiguration.php:43), а не новые component tables: имя `cookieconsent-audit-private`, секрет в queue OPTIONS, параметры origin/limit в `cookie_consent.audit`. Legacy dotted key переводится 3.2.4 loader в `MODX\Revolution\Registry\Db\modDbRegisterQueue` — подтверждено DB-free probe; создание/JSON hydration options в DB NOT RUN. Upstream [Read](https://github.com/modxcms/revolution/blob/c7c38028e81022285a2f2aab9fd076bb9e2d89f4/core/src/Revolution/Processors/System/Registry/Register/Read.php) и [Send](https://github.com/modxcms/revolution/blob/c7c38028e81022285a2f2aab9fd076bb9e2d89f4/core/src/Revolution/Processors/System/Registry/Register/Send.php) сохраняют name validation, исключающую дефисы. Это подтверждение текущей границы native register actions, не абсолютная недоступность secrets администратору БД.

При адаптации сохранить очередь/key, source precedence environment → explicit setting → managed, отказ при повреждённом config и отсутствие secret в public JSON/CMP/ZIP/errors. Не генерировать новый key на reinstall/upgrade. External JSON/config path по-прежнему должен быть canonical вне document root; legacy trusted environment PHP config сохранить в пределах существующего контракта.

**RISK:** PHP-FPM environment, DOCUMENT_ROOT versus MODX_BASE_PATH, root/subdirectory deployment, reverse proxy HTTPS, Host/Origin canonicalization, filesystem ownership/open_basedir, symlink/hardlink refusal и cache cleanup. Код не доверяет произвольному Forwarded для HTTPS и использует REMOTE_ADDR, поэтому proxy может объединять посетителей в один rate bucket. Не «исправлять» это доверием к любому X-Forwarded-For.

MODX 3 документирует фиксированный `/core/` в project root. MODX 2 acceptance с core вне webroot не даёт поддержки такого layout в MODX 3. Обычный MODX 3 `core/cache/logs/` может быть внутри webroot: **для log_dir это разрешено текущим CookieConsentLogDirectory**, HTTP-защита — политика владельца. Нельзя случайно заменить этот validator на PrivatePath::directory, который требует outside-webroot и сломает default. Private config и journals имеют разные требования. Компонент не создаёт `.htaccess`, не сканирует сервер и не делает обязательный self-request на Save; CookieConsentAuditHttp остаётся compatibility utility без найденного активного production caller.

Сохранить header/legacy JSONL/schema 1/2, имя YYYY-MM-cookie-consent.log, streaming CSV, formula-injection protection, snapshot/pagination и permission checks. Локальная I/O готовность Save не доказывает приём события: будущая приёмка обязана сопоставить browser ACK event_id с записью. Audit filenames используют UTC, как сейчас; перенос CMS не меняет timezone журнала.

### D7. Другие версии MODX 3.x

В 3.0/3.1 CMS PHP floor был ниже, чем обязательные 8.1 компонента; компонент всё равно не должен разрешать более старый PHP. Namespaced core/xPDO, изменённые processors/Manager language относятся к линии 3.x; runtime API каждой заявленной версии здесь NOT RUN. Для первого выпуска предлагается scope **MODX 3.2.4 на PHP ≥8.1**, без обещания всех 3.x. Последующий minimum/maximum диапазон определяется матрицей. Проверка 3.2.4 с aliases=false обязательна, поскольку будущая автоматическая загрузка aliases не гарантирована.

## E. Recommended Architecture

### Сравнение вариантов

| Критерий | A: один код и один ZIP | B: общее ядро, adapters и отдельные ZIP | C: независимые implementation branches |
|---|---|---|---|
| Сложность реализации | Средняя/высокая: один payload должен безопасно разрешать обе системы классов | Умеренная: два build profiles, малая CMS-граница | Низкий старт, затем постоянный перенос исправлений |
| Дублирование | Минимально, но условность во время install/runtime | Минимально: frontend/algorithms/UI едины, различаются entry points/profile | Высокое и растущее |
| Сопровождение | Единый выпуск требует приёмки обеих CMS | Общее исправление + независимые integration gates | Cherry-pick/manual sync и дублирование review |
| Безопасность upgrade | Один payload/model identity создаёт лишний риск canonical update | Каждый ZIP проверяется native target; общие retention invariants | Возможен drift metadata/migration/lifecycle policy |
| Независимость релизов | Низкая | Высокая при отдельных identities/channels | Высокая |
| Регрессии | CMS conditions и shared release coupling | Небольшие adapters + одинаковые contract suites | Расхождение consent/UI/security semantics |
| Будущие CMS | Один MODX ZIP мало помогает | Pure core уже отделён, новую границу добавлять по реальной задаче | Потребуется ещё одна ветка и синхронизация |

**Выбрать B в простом виде.** Это не требование отдельной копии server/src или отдельной реализации каждого processor. Один набор runtime/provider/consent JS, один PHP registry/text/renderer/logger/reader, один DOM Manager, один guide source, одна specification vehicles/retention. Небольшой MODX adapter решает class identities, два parent entry points, Manager language и bootstrapping/paths. Общие business methods по-прежнему получают `$modx`; подменять ORM универсальным repository framework не нужно.

1. Для MODX 2 сохранить текущие runtime URLs, element/settings/namespace names и public API.
2. Для MODX 3 дать namespaced model/class map, processor/controller parents и корректные controller names; в shared CMS-dependent methods убрать прямую зависимость от deprecated globals. Pure PHP классы без CMS API не переименовывать ради единообразия.
3. **Адаптировать существующий builder одним target profile**, а не поддерживать две полные копии `_build/build.php`. Profile задаёт class identities, entry point sources, requires/preflight, signature и target expectations verifier. Общие curated inventory, file hashes, object policies, guide/frontend generation и normalization сохранить. Это две native сборки на соответствующих CMS; не сторонний installer.
4. Class-based `.class.php` processors можно оставить: MODX 3 поддерживает этот способ. Только новая локальная adapter bootstrap, если нужна для загрузки родителей/helper, без обязательного Composer dependency компонента, plugin или DI-service framework.
5. Для независимых публикаций предложена отдельная **package family `cookieconsent3`**, при сохранении runtime namespace `cookie_consent`, keys и пяти element names. Это проектное предложение, не сделанное изменение. У каждой family собственная версия/ZIP/signature и acceptance. Нельзя выпускать два разных ZIP под одной signature `cookieconsent-1.0.2` или подменять опубликованный MODX 2 artifact.

Отдельная family не изолирует runtime-файлы: обе версии устанавливают их по общему месту. **Совместная активная установка двух variants в одной CMS не поддерживается.** На мигрированном сайте old MODX 2 package record может остаться; его uninstall нельзя запускать после установки MODX 3 variant, иначе он удалит общие runtime files. Нужен документированный переход без автоматического удаления старых элементов/данных. Native previousVersionInstalled() новой family может трактовать первый переход как install, поэтому все first-transition проверки и idempotent resolver logic должны работать при INSTALL, а не только UPGRADE. Для новой family адаптировать подписи restore helper/verifier/harness, сохранив чтение старых cookieconsent backups.

Если после review выбран единый package family, обязательны уникальные signatures для каждого артефакта, разные каналы/constraints и проверка native version ordering/upgrade selection. Это допустимая альтернатива naming, но не основание делать один универсальный ZIP первым milestone. Для будущего WordPress сейчас достаточно сохранить pure core: новых interface hierarchies, универсального dependency container и repository abstractions не требуется.

### Гарантии совместимости и различие двух типов перехода

| Данные/контракт | Upgrade пакета в одной CMS | Миграция сайта MODX 2 → MODX 3 |
|---|---|---|
| options/services/categories/text overrides | Не сбрасывать; сохранять keys, IDs/config и категории | Перенести существующие значения; native site migration проверяется отдельно |
| Fingerprints | Та же формула/defaults/key/purpose_id/privacy | При неизменной configuration получать те же fingerprints |
| policy_version/category_versions | Не увеличивать ради новой CMS build; изменения только по действующему контракту | Сохранить значения; не считать перенос CMS новым consent purpose |
| Browser storage | Не переписывать raw storage, model, TTL, consentId, disclosed/providers | Сохранится автоматически только в том же browser origin; другой domain/scheme/port не получает localStorage автоматически |
| Public API | `window.web86CookieConsent`, onAllowed/guard/unsubscribe и остальные методы прежние | Тот же API/поведение; никакой auto-grant после переноса |
| Audit configuration/key/logs | Сохранить настройки/queue/options/private file и файлы | Пути могут измениться физически: проверить/remap явно, не генерировать новый key автоматически |
| Canonical elements | Те же пять existing IDs/metadata, новый supplied code | Сначала snapshot уже мигрированной MODX 3 БД; core migration class identities не смешивать с package update |
| Uninstall | Native exact runtime removal, DB elements/settings/category/menu/ACL/logs retained | Не запускать старый uninstall поверх нового runtime; purge отдельно |

Для отдельного нового сайта MODX 3 нет обязательства переносить browser consent с другого origin и нет права автоматически разрешать сервисы. Для same-origin migration с сохранённой configuration ожидается прежний consent без повторного баннера; это нужно проверить отдельным end-to-end сценарием. Paths/assets URL/сервисы, изменённые владельцем при миграции, могут дать иные условия; перенос CMS сам по себе не оправдывает изменение consent format.

## F. Implementation Roadmap

### Milestone 1 — минимальный работающий компонент MODX 3

**После утверждения архитектуры** подготовить отдельную disposable MODX 3.2.4 environment с official release vendor, именованной DB, loopback endpoints и отдельными output paths. Зафиксировать PHP/xPDO/MySQL versions и archive hashes. До этого реализацию не начинать в существующих fixtures.

Ожидаемые изменения: target profile существующего builder/verify/preflight; малый CMS class/parent adapter; controller names; Manager cultureKey resolver; public wrapper instance/logging compatibility. Сохранить common inventory и canonical validator policy, согласованно исправить Chunk/Snippet identification. На этом milestone проверить минимальные Settings read/save и SSR Assets/Banner/Map, без расширения product features.

Зависимости: review варианта B и naming; отдельное решение о создании test environment; upstream release/vendor, PHP ≥8.1 + необходимые extensions. Criteria: native ZIP собран/проверен, загружен/установлен через обычный Manager без Setup Options; CMP открывается; default services/categories выключены; ровно пять canonical rows; настройки сохраняются и SSR отображается. Повторить с aliases=false. **Если metadata retention и native backup не доказаны, milestone не принимается**, даже если fresh page работает.

### Milestone 2 — полноценные Manager, frontend и audit

Ожидаемые изменения: завершить adaptation существующих processors/config/restore helper; локальные UI/path fixes только по доказанным дефектам. Frontend bundle и consent algorithms оставить общими. Адаптировать test fixture/helper entry points, не переписывать assertions ради получения PASS.

Зависимости: M1, managed/external audit fixtures, restricted users, synthetic journals и контролируемые provider routes. Criteria: все Manager sections, RU/EN session switching/guide/CSV, Save partial errors/conflicts, preview без SDK; split/legacy/custom locale/no-JS/cold-warm SSR; provider matrix/onAllowed/maps; real public POST → ACK event_id → JSONL → Viewer/CSV. Manage/view_logs separation и negative token/Origin/payload/replay/rate cases обязательны. Нет secret leakage, обязательных self-requests, новых tables или расхождения JS hashes между builds одного source revision.

### Milestone 3 — regression/upgrade testing и release candidate

Ожидаемые изменения: target-aware sequential release harness, собственные evidence directories/signatures, migration fixture и failure cases. Документация будущего релиза описывает установленный support range, safe transition и known limits; исторические отчёты не переписываются.

Зависимости: M2; immutable MODX 2 1.0.0/1.0.2 artifacts; минимум две версии MODX 3 package для genuine upgrade; отдельный disposable клон сайта для CMS migration. Criteria: clean install с/без категории, existing metadata/static fixtures, manual-install adoption, duplicate refusal, MODX 3 package upgrade/reinstall/uninstall/recovery, MODX 2 → 3 site migration без consent/data loss, fault injection. Две независимые сборки каждой signature идентичны после normalization. MODX 2 regression на общем source остаётся зелёной. Нельзя заменять released ZIP при исправлении RC; новое содержимое получает новую signature. Достижение критериев даёт **GO для release review**, не автоматические публикацию/deployment.

## G. Testing Strategy

### Что переиспользовать, что адаптировать

| Existing coverage | Можно сохранить | Требуемое окружение/адаптация | Статус MODX 3 |
|---|---|---|---|
| Syntax + frontend/guide manifests | Алгоритм checks/hashes, frontend source | CLI без CMS; текущий syntax.py использует MODX 2 Docker и пишет evidence, потому не запускался | Ограниченные read-only checks PASS; release harness NOT RUN |
| `tests/php.php`, `beta30/php.php`, `beta31/php.php`, `beta33/php.php` | Pure validators/registry/category assertions | Просмотреть I/O каждого runner; часть использует shared MODX fixtures/логи | Полные suites NOT RUN; 6 pure checks PASS |
| `tests/browser.mjs`, `categories.mjs`, `live-guard.mjs`, `provider-parameters.mjs`, beta31 pixels/gtm | Provider/consent assertions, 256 combinations, network gate | Playwright + изолированные target URLs; helpers/fixtures/DB адаптировать | NOT RUN |
| `tests/beta32/callbacks.mjs`, `maps.mjs`, `locale-guide/examples.mjs` | onAllowed/once/guard/unsubscribe/await-revoke/owner examples | Те же controlled SDK/backend, target fixture provisioning | NOT RUN |
| beta26 frontend, beta28 localization, beta29 public-json | Split/legacy, messages, RU/EN/custom SSR/cold-warm | MODX 3 contexts/resources/bootstrap/cache; сохранить no-JS checks | NOT RUN |
| `tests/public-registry/{projection.php,browser.mjs}` | Minimal/legacy contracts, raw consent/fingerprint invariants | Отдельные native packages/baselines вместо hardcoded MODX 2 signatures | NOT RUN |
| `tests/http.mjs`, `audit-save.mjs`, `servers/journal.mjs` | Receiver/security/ACK/JSONL/schema assertions | Synthetic isolated log dirs/config, new Apache/FPM/proxy target endpoints | NOT RUN |
| `tests/viewer/` | Reader paging/snapshot/CSV/XSS/formula/unknown schema/large fixtures | Fresh synthetic logs; native File Manager processor paths/classes сверить | NOT RUN |
| manager/i18n/permissions/ux, beta33 manager, polish ui/package/settings | Draft/save/validation/view-only/guide/keyboard assertions | Manager 3 login/language selector, native processors, role setup и routing | NOT RUN |
| elements/transport/native/release/polish lifecycle/recovery | Retention snapshots/hash comparisons и safe policies | Новые target class identities/version asserts/signatures/DB/paths; не запускать старые reset scripts | NOT RUN |
| `tests/polish/performance.php`, benchmark/network | SQL counts/common registry projection/network baseline | Измерять одинаковые данные после bootstrap; MODX 2 timing не обещает MODX 3 timing | NOT RUN |

**Без изменений можно переиспользовать core expectations, provider mocks, consent/callback/maps/security cases и сравнительные assertions. Большинство существующих runner files нельзя запускать как есть против MODX 3.** [tests/helpers.mjs](/Users/sonoma/Desktop/cookie-consent-manager/tests/helpers.mjs) закрепляет порт 8888, Compose profile, settings writer и private fixture; [prepare.py](/Users/sonoma/Desktop/cookie-consent-manager/tests/local/prepare.py) скачивает MODX 2.8.8; [polish/native.mjs](/Users/sonoma/Desktop/cookie-consent-manager/tests/polish/native.mjs) требует version=2.8.8-pl и reset; старые elements tests ждут beta signatures. [release/run.mjs](/Users/sonoma/Desktop/cookie-consent-manager/tests/release/run.mjs) даже помечает результаты hardcoded 1.0.0. Новый harness должен получать действительную target signature/version из build metadata. Summarize scripts могут писать tracked docs/evidence: в этой сессии они не исполнялись.

### Независимые disposable environments и приёмка

Да, нужны отдельные MODX 2 и MODX 3 fixtures; минимум MODX 3 fresh, upgrade/reinstall и site-migration clone. Собственные Compose project names, DB names/users, ports, volumes, config/log directories, packages и evidence. **Нельзя переиспользовать существующие main/clean/publiccore DB или выполнять их reset для MODX 3.** Использовать loopback binding, explicit disposable DB allowlist и target-version checks до любых мутаций. Перед запуском harness обязан отказать для неизвестного origin/DB. Secrets/raw logs не включать в tracked evidence.

Shared setting-mutating suites выполняются последовательно внутри каждой fixture, как сейчас. Разные CMS могут проверяться независимо, если не делят outputs/БД/log dirs. Frontend/security assertions должны быть одинаковыми; native lifecycle отдельно для каждого ZIP. CI может использовать один source revision, но публикация variant блокируется его собственными integration checks и общей core regression. Изменение shared ядра требует обоих CMS regressions.

### Новые обязательные сценарии

1. **Alias-off end-to-end:** install, CMP, каждый processor, SSR, audit wrapper и restore helper при load_deprecated_global_class_aliases=false. Никаких случайных global aliases от предыдущего запроса/другого extra.
2. **Controller routing:** реальные menu index и direct logs; namespaced parent, custom manager/connectors URL, deny route для роли без permission. Не ограничиваться успешным include файла.
3. **Dynamic language:** RU/EN в разных sessions, login selection и User Toggle Language; CMP/guide/CSV следуют активному mgr cultureKey, public SSR — web context. Проверить migrated legacy manager_language setting.
4. **Canonical metadata:** все пять типов, existing arbitrary category/properties/property sets/description/static source/file metadata, unrelated chunk с таким же именем snippet и наоборот; exact ID/relations retention. Fresh reused category с parent; отказ duplicate names до первой мутации.
5. **Native backup/recovery:** preserved.php и preserved archives, reinstall backup replacement, dry-run/apply на disposable DB, wrong ID refusal, static-file refusal. Restore original state из независимого backup после late failure.
6. **Настройки и аудит:** options/services/texts unchanged, key/options queue unchanged; managed и external JSON/environment configurations; idempotent migrations; ordinary save plus failed log path/setup, stale revision и concurrent save/locks.
7. **Настоящий lifecycle:** upload/scan/install/update/reinstall/uninstall из стандартного Manager; exact file inventory, custom/untracked files retained, canonical/data/ACL retention; remaining menu поведение после uninstall документировано. Old-package uninstall после migration не выполнять как штатный переход.
8. **Consent preservation:** MODX 3 package vA→vB в том же browser context; отдельно disposable MODX 2→3 site migration с тем же origin и неизменной конфигурацией. Сравнить raw localStorage, consentId, fingerprints, category/policy versions, allowed SDK/map requests и отсутствие нового banner. Отдельно changed origin — безопасный fresh consent без auto-grant.
9. **Безопасность HTTP/files:** no/bad token, wrong ctx, logs-only direct writes, Origin/Fetch-Site/content-type/size/schema, replay window/rate bucket, append failure/no ACK, Config/JSONL not public by server policy, symlink/hardlink/unwritable paths, CSV injection/XSS. Проверить default logs inside core и private external config вне webroot как разные cases.
10. **Failure/platform:** на disposable storage inject file copy/backup write/DB save/migration failure и OPcache scenarios с новыми immutable signatures; Apache и nginx/PHP-FPM, HTTPS reverse proxy. Smoke PHP 8.1 и выбранной современной поддерживаемой версии; другие declared 3.x добавляются только после своих gates.

### Блокирующие gates первого MODX 3 релиза

Release нельзя публиковать, пока хотя бы один обязательный сценарий имеет FAIL или NOT RUN: target native install/upgrade/reinstall/uninstall; five-element retention/backup; alias-off routing/runtime; settings/conflicts/partial save; manage/view_logs/token ACL; common provider/callback/maps regression; SSR language/cache; реальный audit ACK+JSONL и Viewer/CSV; managed key/config/log retention; same-origin migration; reproducible ZIP/secret exclusions и MODX 2 regression общего core. Пробы этой сессии этих gates не закрывают.

RISK late power loss/ENOSPC/multi-node locking и arbitrary client integrations можно оставить как явно описанные границы после согласованной приёмки: пакет не должен обещать универсальную атомарность, доставку данных в рекламные кабинеты или отмену уже отправленных SDK-запросов. Проверки с реальными customer DB/sites/logs/production запрещены; использовать synthetic fixtures и controlled provider responses.

## H. Open Questions

Вопросы ограничены решениями владельца и фактами будущего окружения; API/routing/language причины уже разрешены кодом.

1. **Release identity/support policy:** принять отдельную family cookieconsent3 и первый support scope 3.2.4/PHP ≥8.1, либо требуется другое naming/поддержка 3.0–3.1? Это определяет profiles, native upgrade selection, restore signature support и объём gates, но не необходимость общего core.
2. **Test environments:** отдельное решение о создании disposable MODX 3 environments, выбранные DB/PHP/web-server versions и доступный installation artifact с vendor. В этой сессии среда не создавалась. Точную bundled xPDO version необходимо записать при provisioning.
3. **Реальные migration layouts:** будет ли перенос CMS на том же origin, какие document root/assets/connectors paths, external config/log paths и native package history? Без конкретного безопасного clone нельзя подтвердить физический перенос путей, совместимость пользовательских integrations и отсутствие старого uninstall поверх нового runtime.

Ни namespace prefix собственного xPDO model, ни Vue/React выбор, ни новые audit tables не являются открытыми вопросами: таких потребностей в текущем коде нет.

## I. Final Recommendation

**Начинать реализацию с MODX 3 native build profile и безопасного lifecycle пяти canonical элементов, затем исправить routing/parents и Manager cultureKey.** Сначала доказать fresh install и existing metadata retention в отдельном MODX 3.2.4, включая aliases=false; только после этого расширять Manager/browser/audit regression.

Выбрать **B: общий source core + минимальный MODX adapter + независимые transport artifacts**. Существующий modPackageBuilder/vehicles/validators пригоден как основа; полная копия builder или собственный installer не нужны. Один универсальный ZIP возможен как дальнейшая оптимизация после двух доказанных native targets, но усложняет первый безопасный перенос. Независимые implementation branches как постоянная архитектура повышают риск расхождения consent и security.

Frontend, public API, fingerprint/storage formats, JSONL schemas, настройку services/categories/translations и данные владельца сохранить. Сейчас **NO-GO для заявления совместимости/публикации MODX 3**, **GO для review этого плана**. Работа остановлена на отчёте; PHP/JS/CSS/tests/builder/существующая документация не изменены, реализация и установка MODX 3 не выполнялись.
