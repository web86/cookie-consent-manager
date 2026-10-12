# Приёмка Manager UX — cookieconsent 0.1.0 beta7

Дата: 12 октября 2026. Baseline: `59e17bf620f8da4a21c52d5d07d3fdf86e376ccf`. Ветка: `feature/modx2-manager-ux`. Реализация и тесты: `fb99c260b6f0fdada196c003888b4829b05bebbb`.

**GO для code review.** Все исполненные финальные проверки PASS: **384 сценария, 1950 assertions**, плюс три PHP suites с **152 assertions**; всего **2102 assertions**. Финальных FAIL: **0**. Production deployment/merge не выполнялись. Готовность к staging условная: перед эксплуатацией нужны проверки конкретного HTTPS/server/cache окружения и диагностика ошибки клиентского сайта, перечисленные ниже как NOT RUN.

Подробная инструкция обновления/установки: [Manager UX beta7](modx2-manager-ux.md). Машинный отчёт: [результаты](evidence/modx2-manager-ux-results.json).

## Поставка и неизменность baseline

Transport: `cookieconsent-0.1.0-beta7.transport.zip`, штатный MODX `modPackageBuilder`; **61 native vehicle**: 16 object, 43 exact file, 2 script. Setup Options, private package-state selector и lifecycle ledger отсутствуют. Канонические элементы/пользовательские settings остаются с UPDATE_OBJECT=false/UNINSTALL_OBJECT=false; новые versioned stock samples доступны для явного сравнения.

ZIP находится в `.local/release/cookieconsent-0.1.0-beta7.transport.zip` этого checkout; рядом SHA256, source inventory и ZIP inventory. ZIP не включён в Git и не опубликован в открытом Release.

```text
ae07df2955e4e0210b3333fd908db2257af576ac5f34290589609ebd2c67c79a  cookieconsent-0.1.0-beta7.transport.zip
```

Повторная сборка в другом output directory после нормализации metadata дала тот же SHA и побайтное совпадение. Native verifier PASS: manifest/vehicles/defaults/checksums/excludes, нет customer config/secret/Setup Options/legacy lifecycle кода. PHP syntax: 35 server/build файлов без ошибок. Исходники runtime сверены через native inventory/file verification.

Beta5 не перезаписывался; SHA остался `dcf0cdde8abde57fd00718a414fdadd29e521f05cca49c588dd16e2fdbefc6c7`. Main остался `7ef77d35b7b24f607bd73e433d46dd982c982ace`. Test-only beta8 и corrupted beta91 используются только fixtures, не являются поставкой.

## Что исправлено и почему

* **Scroll:** реальный DOM MODX 2.8.8 показывал body/viewport с overflow:hidden и отдельный пустой ExtJS `.x-panel-bwrap`, добавляющий ещё viewport пустого пространства. CSS ограничен body.ccm-manager; включена прокрутка, высота content определяется формой, скрыт только generated wrapper на этой CMP. Sticky preview проверен на desktop, на небольшом экране/низком viewport он располагается в потоке. Последнее поле/кнопка достижимы; компонент помещается в mobile viewport.
* **Policy:** обычного поля policy_version нет. Подтверждённое расширенное действие меняет внутреннюю версию; cancel не меняет ничего. Старое реально сохранённое согласие после действия становится недействительным на следующем посещении: баннер виден, сервисы/карты не запрашиваются. TTL/другие настройки сохраняются. Обычные переводы не меняют fingerprint/consent ID.
* **Logs:** private каталог рекомендуется. Дополнительно поддержан /logs/cookies/ на прямом Apache, со строгой canonical/no-symlink/no-hardlink/no-traversal валидацией и реальным HTTP proof. Проверяются JSONL/log/.rate JSON probes, существующие monthly logs/JSONL, точный .rate/state.json и будущий monthly path. Требуется 403, в том числе с nonce; existence guard/404/redirect/timeout не означают защиту. Старые журналы и state сохраняются.
* **Audit:** вместо пути к JSON в обычной форме — Setup, Protection и POST→log actions. Origin/rate находятся в native setting; случайный HMAC — только в options серверной native DB Registry queue. После анализа MODX config.js отказались от ключа в system setting; после анализа native DB Registry read отказались от secret messages. Имя private queue с дефисами блокируется native read/send; authenticated regression проверяет отказ и неизменность ключа. API CMP/MODx.config/public registry не содержат ключа. ENV/private JSON имеют приоритет; legacy setup не создаёт лишний managed key.
* **Integration:** единый uncached `[[!CookieConsent]]` подключает CSS/registry/JS/баннер native API; template не меняется. В ходе разработки обнаружено, что одинаковые uncached tags при повторном проходе parser заменяли banner output пустым. Баннер теперь регистрируется единожды native HTML block; duplicate calls, cache/cultureKey и порядок JS проверены. Native context cache имеет OPcache revalidation delay; mutable-context тест ждёт 2.3 секунды после refresh при частоте 2, а не обещает мгновенную смену context до обновления native cache.
* **Maps:** отдельный CookieConsentMap возвращает инертный div; iframe/src/SDK до согласия отсутствуют. Source URL проверяется сервером и повторно JS. Общая инструкция больше не содержит произвольный map div; требуется удалить прежние direct SDK/noscript.
* **Texts/services/preview:** один MODX language select, source HTML, category names/descriptions и service names. Legacy произвольные locales, скрытые строки/descriptions и base fallback сохраняются. Убраны Restore/base/custom-code/designer fields, purpose_id/описания сервисов, preview language selector и technical sandbox text. Два добавленных счётчика получают разные key/purpose_id, category из approved catalog, выключены, видны и не появляются в DB до общей Save. Preview следит за draft/editing locale без SDK/audit.
* **Errors:** HTTP 502/invalid JSON/validation/authorization воспроизведены; diagnostic сообщает action/status/code/reason/request_id, draft сохраняется. Server logs не содержат draft/secret. `m.upgrade_elements` исправлен в RU/EN, accidental старый override сохранён скрытым и исключён из public strings. Stock key sets RU/EN совпадают; technical keys в обычном UI не выводятся.

Точная причина первоначального заголовка «Не удалось выполнить запрос…» на клиентском сайте **не установлена**: его URL, доступ, response/PHP logs не предоставлены. Локальные отказы перечислены как проверенные каналы диагностики, а не как доказательство root cause конкретного сайта.

## Финальная матрица PASS/FAIL

Среда: настоящий MODX Revolution 2.8.8-pl, PHP 8.2.34 Apache, MariaDB 10.6, Playwright 1.62.1 Chromium. Три loopback fixtures: основной private-core/manual site, clean native installation и public-core installation. Только именованные disposable DB сбрасывались; прежние fixture files архивировались. Основной DB/старые журналы не удалялись.

| Suite | Сценарии | Assertions | Результат |
|---|---:|---:|---|
| Browser consent/provider powerset | 281 | 1161 | PASS |
| HTTP PHP receiver/JSONL | 36 | 118 | PASS |
| Native Manager registry | 4 | 13 | PASS |
| Live adapters, locally intercepted | 11 | 50 | PASS |
| Manager/i18n/HTML/XSS | 17 | 59 | PASS |
| Restricted Manager permissions | 1 | 4 | PASS |
| Provider privacy parameters | 4 | 17 | PASS |
| Native install/reinstall/upgrade/uninstall/migration | 10 | 259 | PASS |
| Native partial install/repair + actual consent retention | 2 | 51 | PASS |
| New Manager UX/security/E2E | 15 | 119 | PASS |
| Existing installed beta5→beta7, real consent/JSONL | 1 | 39 | PASS |
| Fully clean immutable beta5 + customized beta7 upgrade | 1 | 26 | PASS |
| Legacy private JSON without ENV + native lifecycle | 1 | 34 | PASS |
| PHP receiver/logger/validator | suite | 80 | PASS |
| PHP settings/HTML/i18n | suite | 53 | PASS |
| PHP UX paths/lexicons | suite | 19 | PASS |

**Все 256** powerset combinations выполнены; каждого provider/category запроса сравнивали с ожидаемыми. Public HAR: **4158 entries**, **0 external origin requests**. Live guard использует fulfil/abort для vendor URLs; реальный vendor backend этим не проверялся. Manager Gravatar запросы блокировались, прочих неожиданных внешних Manager hosts нет. Stress fixture rate=10000 для полной матрицы; отдельный HTTP rate-limit сценарий проверяет configured boundary/429. Managed setup default=60 проверен.

HTTP suite проверяет schema/type/date/body/origin/fetch metadata/PII query rejection, actual server UTC/IP/User-Agent, невозможность подменить IP полем/forwarded data, replay/409, concurrent append/replay, rate/429, symlink/unwritable file/dir и сохранение архивов при смене setting. HTML/XSS suite проверяет dangerous assets/scripts/handlers/styles/URLs и literal MODX/Fenom tags.

## DB / runtime / key / user data при lifecycle и отказах

| Проверка | DB/settings/elements | Runtime | Secret/config/JSONL | Результат |
|---|---|---|---|---|
| Clean Install | 6 default settings, services off/IDs blank; resources/templates/grants сохранены | Native verified hashes | Key/config не создаются молча | PASS |
| Upgrade/custom migration | ID/content/properties, TTL, purpose_id/privacy options, HTML, legacy translations сохранены | Новый runtime | Старые config/log hashes сохранены | PASS |
| Reinstall | Пользовательские значения не меняются | Проверенная поставка | Key/config/log hashes не меняются | PASS |
| Native Uninstall | Settings/elements/menu/ACL сохранены | Удалены exact shipped files, customer file сохранён | Private key/options, managed/legacy config, private/public JSONL, public rate-state, config hashes сохранены | PASS |
| Partial native verify failure | Старые значения/элементы/key сохранены, новые stock samples возможны | Неполное обновление **обнаружено**, rollback не заявлен; native reinstall восстанавливает hashes | Private/public logs/config сохраняются | PASS |
| AllowOverride None | Save/check отказывают, audit status invalid | Guard file сам по себе не скрывает ошибку | Без нового audit append; existing safe sentinel не удалён | PASS |
| Symlink/traversal/proxy paths | Изменение не принимается | Unsafe path не используется | Старые журналы сохраняются | PASS |
| API error / no MODAUTH / restricted user | Отказ без разрешённой записи | Не применяется | Draft в форме; без secret in response | PASS |

Source checksums и SHA snapshots используются как доказательство сохранности; raw private config/key/IP logs не включены в Git evidence. Native default/Restore preexisting semantics не заменяют backup. При поздних DB/FS errors package может остаться partial, и универсальной атомарности не обещаем. Старые ledger-specific state.json/menu rollback сценарии не применимы: собственного ledger/rollback/menu-delete lifecycle больше нет; не объявляем их PASS.

## NOT RUN — отдельно

1. Root cause и retest на конкретной клиентской установке: нет URL/access/HTTP response/PHP logs. Надо зафиксировать action, HTTP status, MODAUTH, permission, processor response/request_id и соответствующий server log.
2. Actual HTTPS/certificate, nginx/CDN/reverse proxy/alternate vhost configurations. Apache HTTP и поддельный proxy header tested; nginx/unknown/CDN rejection branch проверен PHP tests, а не реальной установкой этих серверов. Private storage остаётся безопасным выбранным вариантом для них.
3. Полная HTTP-установка MODX в подкаталог. Различие DOCUMENT_ROOT/MODX_BASE_PATH покрыто PHP checks, не полной второй установкой.
4. Firefox/WebKit, другие PHP/MODX versions, custom Manager skins/layout/language plugins. Проверен stock Manager 2.8.8/Chromium.
5. Настоящие vendor SDK callbacks/production IDs/paid Maps keys. В live tests внешний network перехватывается локально; staging должен проверить реальные интеграции после явного согласия.
6. ENOSPC/EIO/power loss/process kill, DB outage, multi-node, concurrent first-key initialization faults и physical late uninstall permission loss. Проверенный partial failure — corrupted native vehicle с отказом verification; он не моделирует все аппаратные ошибки.
7. Race между HTTP protection check и append, скрытые CDN/cache/alias маршруты/изменение server config. Не даём универсальную гарантию; private directory предпочтителен.
8. Missing/corrupted private queue/options и restore полного DB/FS backup под injected outage. Код отказывает при неверном ключе, но эти fault injections не выполнены.

## Скриншоты

* [Десктоп, конец длинных текстов и sticky preview](screenshots/manager-ux/desktop-texts-bottom.png)
* [Десктоп, нижняя операция добавления счётчика](screenshots/manager-ux/desktop-services-bottom.png)
* [Mobile, длинная вкладка](screenshots/manager-ux/mobile-texts.png)
* [Managed audit ready](screenshots/manager-ux/managed-audit-ready.png)
* [Action/HTTP diagnostic и сохранённый draft](screenshots/manager-ux/request-diagnostic.png)
* [Единый snippet и две инертные карты](screenshots/manager-ux/unified-map-placeholders.png)
* [RU Manager](screenshots/manager-ux/manager-ru-main.png), [RU services](screenshots/manager-ux/manager-ru-services.png), [EN texts](screenshots/manager-ux/manager-en-texts.png)

Для обновления текущей beta5: backup → проверить SHA → загрузить/установить beta7 в Package Manager → сравнить stock/custom элементы явно → заменить прежние ручные подключения на один uncached CookieConsent → проверить audit protection/POST и Network на staging. Не удалять старые JSONL/config. Merge в main и production deployment требуют отдельного подтверждения.
