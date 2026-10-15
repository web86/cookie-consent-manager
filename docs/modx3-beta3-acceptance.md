# MODX 3 beta3: оба исправления перенесены, полный staging gate — NO-GO

15 октября 2026. Ветка `fix/modx3-fenom-audit-beta3`, база `origin/modx3`
(`23cff87`). Исходники и история MODX 2 не менялись; работа выполнена в отдельном
checkout. Пакет MODX 3 остаётся самостоятельным семейством `cookieconsent3`.

**NO-GO для запрошенной полной staging-приёмки.** Перенесённые исправления,
native ZIP и обновление beta2 → beta3 проверены. Но обязательная проверка
прогретого compiled Fenom cache падает в официальном pdoTools3 3.1.0, в том числе
без Cookie Consent. Поэтому полный Definition of Done пока не достигнут.
Выключение compiled cache, deprecated aliases или ослабление аудита не использовались.

[Все результаты и synthetic snapshots](evidence/modx3-beta3-results.json).
Историческая [приёмка beta2](modx3-implementation-acceptance.md) сохранена.

## Код и пакет

Из PR #4, #6, #7 и MODX 2 1.0.3-beta1 точечно адаптированы:

- `CookieConsentAssets`: JSON регистрируется через native MODX 3
  `regClientStartupHTMLBlock()` после разбора resource. Возвращаются CSS и
  deferred JS. Legacy snippet остаётся прежним и не дублирует JSON.
- Validator/logger/receiver: видимость категорий передаётся по доверенной
  серверной цепочке. Wrapper читает `MODX\Revolution\modSystemSetting`
  напрямую; context/user/request не определяют разрешения.
- Schema 2 требует все видимые категории и включённые providers этих категорий;
  скрытые grants, unknown/disabled providers и противоречивые события отклоняются.
  Legacy schema, origin/replay/rate protection сохранены.

Из 55 файлов runtime изменены ровно 4: публичный audit wrapper, receiver, logger,
validator. Из 14 object definitions изменён только `CookieConsentAssets`.
JS/CSS, fingerprints/storage API, остальные канонические источники и native
installer lifecycle sources не менялись. Деревья MODX 2 целиком не переносились.

Метаданные: `name=cookieconsent3`, `version=0.1.0`, `release=beta`,
`release_index=3`, фиксированный `source_epoch=1792022400`. Changelog включён в ZIP.
Build source commit: `5f0cb17685c4bf9a3ad3d8dca956a45b5a3883cf`.
Позднейшие commits меняют только harness/README/отчёты.

Артефакт: **cookieconsent3-0.1.0-beta3.transport.zip**, **188 950 bytes**.

```text
SHA256 b762e36d19449f76b4cac1ac4a9fa82aad9e80757875959d778806b2a9d6687f
```

Архив и checksum/inventories находятся в ignored
`.local/modx3/artifacts/beta3-a/`; независимая сборка — `beta3-b/`.
Физический каталог артефактов в общем workspace:
`/Users/sonoma/Desktop/cookie-consent-manager/.local/modx3/artifacts/`.
ZIP не коммитится, release/tag не публикуется.

Два отдельных `compose run --rm --no-deps web` контейнера выполнили native
MODX 3 `modPackageBuilder` / xPDO 3 сборки в разных work/output directories.
Обе нормализованы `_build/normalize.py`, обе прошли `_build/verify.php`.
ZIP, source inventory и ZIP inventory побайтно одинаковы.

Native inventory: **71 vehicle** — 14 `xPDO\Transport\xPDOObjectVehicle`,
55 file, 2 script; **136 ZIP entries**. Проверены payload/source hashes,
metadata, update/preserve policy, defaults и исключение private configs,
credentials, customer logs, fixtures, dependencies и repository metadata.
Все 55 hashes совпадают с финальными исходниками.

Beta1/beta2 сохранены без изменения:

- beta1: `18481c07662226ce4f8343d311f5f37b20b68ac245c05a6cdc3414a7df045b1a`.
- beta2 обе сборки: `e55c66e9dceca74881b0568a9ebd7a6707f52e1571368cf8176247aac0a7fe87`.

## Реальное окружение и воспроизведение

Официальный MODX **3.2.4-pl**, xPDO **v3.1.7**, MariaDB **11.8.9**;
PHP **8.1.34** для native lifecycle и отдельный PHP **8.2.34** для установленного
runtime/HTTP/browser и PHP suites. Deprecated global aliases отключены и guard
проверяет `class_exists('modX', false) === false`.

Новый Docker project `cookie-consent-modx3-beta3` использует отдельный DB volume
и новые site/private mounts. Старые MODX 3 HTTP fixtures остановлены для
освобождения портов, их файлы/БД сохранены. Контейнеры MODX 2 не менялись.
Официальный MODX ZIP SHA256:
`2f594240d58c1c003de89eb5f50f615ee177ec624f48d8494476197048b7adc2`.

Официальный [pdoTools3 v3.1.0-pl](https://github.com/modx-pro/pdoTools3/tree/983f18974abc51b8444d63c75f0db61380f9552a)
установлен через native Package Manager на всех трёх сайтах.
SHA256 его неизменённого transport ZIP:
`ae2be84f595bcdeb4660f4f422c52e8dc58f44135147dd42622826be5e68ae0f`.
Bundled Composer Fenom — **2.12.1** (`Fenom::VERSION` сообщает `2.12`).

На реально установленной beta2 воспроизведены:

- `Unexpected token ':' ... near '{"schema":'` при reparsing JSON на resource.
- HTTP 500 / пустой Fenom-rendered page.
- HTTP 400 `invalid_payload` на полном production `accept_all` envelope со
  свежими UUID/timestamp, `analytics=true`, `marketing=false`,
  `external_content=true`, `yandex/mailru/yandex_maps=true`; запись отсутствует.

## Настоящая native установка и сохранность

Компонентные файлы и DB snippets поступают **только из transport ZIP**, без
ручного source sync. Проверены native Package Manager upload/scan/install:

- Fresh beta3 на отдельной пустой component database: 5 singleton elements,
  6 settings, все категории false, 9 disabled services без IDs, audit not configured.
- Настоящая установка неизменённой beta2, owner configuration/relations, затем
  beta3. Native OnPackageInstall observer записал **ACTION_UPGRADE = 1**;
  package row сообщает `0.1.0 / beta / 3` и installed timestamp.
- Второй существующий настроенный beta2-сайт обновлён тем же ZIP.
- Повторная установка beta3 через native Package Manager.

Before/after snapshots подтверждают сохранение settings, visibility, service IDs,
RU/EN custom texts, canonical IDs/metadata/property relations, unrelated
resources/templates/elements/context settings/sentinel setting, audit queue/key,
historical/current JSONL. Raw localStorage, consent ID и provider fingerprints
сохранились побайтно; разрешённые analytics/maps восстановились без нового запроса.

После всех регрессий вновь проверены **55 runtime hashes и 5 фактических
database-stored canonical sources** на web/clean/fresh/PHP82. Все совпадают с ZIP.

Production scenario после upgrade получает реальный HTTP **200** и совпадающий
`event_id`, найденный ровно один раз в физическом monthly JSONL. Пример события
из повторной матрицы содержится в machine report. Marketing остаётся false.
Это проверяется для всех восьми visibility masks. Подделки не меняют длину
журнала; replay получает 409 и не создаёт дубликат. Origin/rate negative cases
проходят существующий HTTP suite. Схема 1 сохраняет прежний контракт.

## Финальные результаты

**510 PASS / 4 FAIL из 514 функциональных сценариев**, отдельно **22 PHP suites
PASS / 7 528 assertions**. Всего **11 176 assertions** в этих группах.

| Группа | Cases / assertions | Результат |
| --- | ---: | --- |
| Native ZIP lifecycle + итоговая HTTP/Fenom/visibility матрица | 33 / 831 | 29 PASS, 4 FAIL |
| Существующая browser/provider матрица | 281 / 1423 | PASS |
| 15 существующих regression groups | 187 / 1243 | PASS |
| Focused Manager Save/localization/ACL/Viewer/CSV chain | 7 / 48 | PASS |
| PHP 8.2 installed hashes, cold Fenom, Accept/Reject/Customize/revoke | 4 / 93 | PASS |
| Final native Manager/preview RU/EN | 2 / 10 | PASS |
| Pure PHP/security suites, включая exhaustive visibility/provider states | 22 suites / 7528 | PASS |
| Native builds, verification, reproducibility | 2 builds | PASS |
| Syntax | 100 PHP, 107 JS/MJS, 19 Python | PASS |

Регрессии включают HTTP, категории, callbacks, maps, frontend/SSR,
локализацию, live guards, provider parameters, pixels, ClientID, Viewer/CSV,
permissions, guide UI/examples и Manager i18n. Проверки плагинов аналитики/карт
используют локально перехваченные vendor responses, не отправляя tracking.
Native audit POST доходит до настоящего wrapper/receiver/logger. Только PHP82
revocation-тест использует `route.fetch()` для захвата реального ACK до reload;
backend вызывается один раз и физическая запись проверяется.

Все native standard-tag cold/warm cases проходят. Fenom split/legacy cold,
RU/EN, JSON semantics/head placement/defer, ровно один registry/CSS/JS/banner и
восемь visibility masks проходят. **Четыре FAIL — RU/EN × split/legacy на warm
compiled cache: HTTP 500.**

## Блокер pdoTools3 и границы приёмки

В официальном pdoTools3 `Parsing/Fenom/Fenom.php:116` cached PHP code выполняется
через `eval()` без определения `$fenom`. Скомпилированный Fenom code вызывает
`new Fenom\Render($fenom, ...)`, получая null.

Отдельный тест `tests/modx3-beta3/upstream.mjs` проверил **только**
`Hello {$name}` с `name=world`, без Cookie Consent snippets/JSON/audit:

- PHP 8.1: cold → `Hello world`, warm → exit 255 / Render TypeError.
- PHP 8.2: тот же результат; compiled cache файл физически существует.

PDO/Fenom sources не патчились. Штатная fixture setting использует namespaced
`xPDO\Cache\xPDOFileCache` при aliases OFF. Worker opcache revalidation равна 0
для немедленной видимости fixture setting-file replacements; MODX resource и
compiled Fenom cache включены. Между cold/warm запросами кеш не очищается.

Начальный reporter ошибочно читал fetch `status` как метод; это исправлено в
тесте. Начальная native матрица дала ещё два cold FAIL из-за двухсекундной
opcache задержки переключения parser. После настройки fixture rerun заменил
только эти runtime cases; исходные genuine upgrade/fresh/reinstall результаты
сохранены. Четыре настоящих warm FAIL не скрыты. Начальная PHP82 revoke-попытка
попала в тестовую гонку чтения ACK после навигации; захват настоящего ответа до
forwarding устранил гонку. Исходные результаты сохранены в ignored evidence.

**NOT RUN:** customer staging/production, реальный Safari, live vendor delivery,
полная hosting/TLS/multi-server матрица; native Package Manager install на PHP
8.2 (доступный generic image не имеет ext-zip), beta3 uninstall/recovery destructive
cases (installer sources неизменны; прежняя beta2 приёмка остаётся исторической).

**Рекомендация: NO-GO для полной ручной staging-приёмки.** Нужен исправный
upstream pdoTools compiled-cache path и повтор четырёх warm cases на обоих PHP.
Сам beta3 ZIP содержит оба требуемых исправления и проходит native lifecycle и
остальную применимую матрицу, но заявлять готовность с указанным блокером нельзя.
Никаких merge, production deployment или stable release не выполнялось.
