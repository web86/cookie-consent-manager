# CookieConsentManager3 — 1.0.8-pl9

RU: Runtime находится в `assets/components/cookieconsentmanager3/`, приватный код — в `core/components/cookieconsentmanager3/`. Пути строятся от настроек MODX. Установщик создаёт `bootstrap.php` рядом с `audit.php` по фактическому `config.core.php`; перенесённые assets и core поддерживаются без ручных действий.

EN: Runtime lives under `assets/components/cookieconsentmanager3/`; private code remains under `core/components/cookieconsentmanager3/`. The installer generates `bootstrap.php` beside `audit.php` from the actual `config.core.php`, including relocated assets and core, without extra setup.

RU: Обновление переносит JS-файлы из старого services/ без изменения байтов и сохраняет историю SHA-256. Удалённые адаптеры не восстанавливаются. Конфликт разных файлов останавливает перенос без перезаписи. Очистка после успешной сборки удаляет только известные старые файлы с точным совпадением SHA-256; чужие и изменённые файлы сохраняются.

EN: Upgrades move user JS adapters unchanged and retain SHA-256 history. Deleted adapters stay deleted; conflicting destination files stop migration without overwriting either version. After a successful build, cleanup removes only exact known legacy hashes; unknown/changed files remain.

RU: Сборка выполняется установщиком, вручную в Manager и при очистке кеша Manager. Frontend загружает готовый bundle без проверки SHA адаптеров. Ошибка сборки сохраняет прежний bundle и версию. Docker-маршрут удалён; тестовый mock-marketing хранится только в tests/.

EN: Builds remain in installation and authenticated Manager actions (manual rebuild and cache clear). Visitors load the prepared bundle without adapter hashing. Failed builds retain the working bundle/version. Docker-only routing was removed; mock-marketing is confined to tests/.

RU: restore-elements использует шесть фактических элементов transport-пакета, существующие ID, транзакцию и dry-run по умолчанию. Настройки не меняются.

EN: restore-elements uses the six actual transport elements, existing IDs, a transaction and a default dry run. Settings remain unchanged.


## Подключение

Один Assets в head и один Banner перед закрытием body:

```html
<head>
    [[!CookieConsentAssets]]
</head>
<body>
    <button type="button" data-cookie-settings-open>Настройки cookie</button>
    [[!CookieConsentBanner]]
</body>
```

Альтернатива для прежних шаблонов — один `[[!CookieConsent]]`. Не смешивайте legacy и split и не повторяйте теги. SSR использует `cultureKey` web context, пользовательские переводы и stock fallback; язык Manager не подменяет язык сайта. Публичный JSON содержит только технические поля; локализованные сообщения и map templates приходят в PHP HTML. Assets использует один JS/CSS bundle с content-hash URL.

## Согласие, callbacks и карты

Сохраняются `window.web86CookieConsent`, `onAllowed()`, live `stillAllowed()` и возвращаемая `unsubscribe()`. Без service option callback требует согласия видимой категории; с `{service:'instance_key'}` — также включённый экземпляр, назначенный той же категории. Отдельного согласия на сервис нет; изменение состава обработки повышает версию затронутой категории. Не храните отдельный boolean вместо live guard; проверяйте его перед запросами и после каждого await.

```javascript
document.addEventListener('DOMContentLoaded', function () {
    window.web86CookieConsent?.onAllowed('external_content', async function (stillAllowed) {
        if (!stillAllowed()) return;
        const module = await import('/assets/js/custom-map.js');
        if (!stillAllowed()) return;
        await module.initMap(stillAllowed);
    });
});
```

`custom-map.js` принадлежит сайту: сам import не должен автоматически загружать SDK. Отзыв/unsubscribe останавливает дальнейшую работу guard; уже отправленные запросы он не отменяет. Necessary всегда присутствует; видимость analytics/marketing/external_content независима от сервисов. Скрытие/включение категории сохраняет прежнюю version/invalidation семантику.

`CookieConsentMap` поддерживает проверенные Google/Yandex HTTPS embed URLs; iframe отсутствует до разрешения. Собственные JS-карты подключайте через callbacks. [Примеры](examples/chunks/CookieConsentCustomScripts.html) и [контракт публичного реестра](docs/public-service-registry.md) сохраняют смысл исходной базы; исторические MODX 2 acceptance-отчёты не являются приёмкой MODX 3.

Поддерживаются Яндекс.Метрика, Mail.Ru, GA4, GTM, Google Ads, VK Ads Pixel, Meta Pixel и карты. GTM запускается по разрешению назначенной категории (рекомендуемая — marketing); consent checks тегов внутри контейнера настраивает владелец. Доставка в реальные рекламные кабинеты не заявляется локальными mock tests.

## Аудит и права

Browser consent → POST → ACK с event_id → месячный JSONL → Viewer/CSV. Сохраняются schema 1/2, Origin validation, replay window, rate limiting и server UTC. HMAC используется для IP rate bucket; клиентские события остаются неподписанными claims. Журналы могут содержать IP/User-Agent; HTTP-защиту выбранного каталога обеспечивает владелец. Компонент не создаёт `.htaccess` и не выполняет обязательный HTTP self-request на Save.

Managed secret хранится в options существующей native registry queue; новая таблица не нужна. Поддерживаются private JSON и trusted environment configuration вне DOCUMENT_ROOT. Настройки/ключ и старые файлы не заменяются upgrade/reinstall. Сохраняйте журналы перед ручной очисткой всего core/cache.

`cookie_consent_manage` управляет settings/preview/reconsent; `cookie_consent_view_logs` отдельно разрешает просмотр/details/CSV. Для logs-only роли есть `/manager/?a=logs&namespace=cookie_consent`; обычный component menu имеет manage permission.

## Вопросы и ошибки: CSP, аналитика и карты

### Нужно ли настраивать Content Security Policy (CSP), если установлен Cookie Consent Manager?

Да, если сайт использует CSP. Это **разные механизмы**: Cookie Consent Manager контролирует согласие посетителя и запуск сервисов, а CSP задаёт, с каких адресов браузер *в принципе* вправе загружать скрипты, изображения, iframe и отправлять запросы. После согласия CSP всё равно может заблокировать ресурс. Компонент **не изменяет CSP и не редактирует `.htaccess`**.

CSP полезна как дополнительная защита от внедрения скриптов, но слишком строгая политика может нарушить работу карт, аналитики и форм. Рекомендуется начинать с проверенной рабочей политики и тестировать ужесточения через `Content-Security-Policy-Report-Only`. Не добавляйте непроверенные домены только ради устранения предупреждений в консоли. `'unsafe-inline'` и `'unsafe-eval'` существенно ослабляют ограничения JavaScript; их необходимость следует проверять отдельно.

### Какие разрешения могут понадобиться поддерживаемым сервисам?

Это **ориентиры для настройки** (не готовый полный HTTP-заголовок и не исчерпывающие списки всех запросов SDK). Добавляйте адреса к *существующим* директивам только для реально включённых сервисов. Конкретные адреса зависят от версии SDK и дополнительных функций.

| Сервис | Основные источники и директивы |
| --- | --- |
| Яндекс.Метрика / Вебвизор | `script-src`: `https://mc.yandex.ru`, `https://mc.yandex.com`; `img-src`: `https://mc.yandex.ru`, `https://mc.yandex.com`; `connect-src`: те же источники |
| Top.Mail.Ru / VK Ads Pixel | `script-src`: `https://top-fwz1.mail.ru`; `img-src`: `https://top-fwz1.mail.ru`, при необходимости `https://top.mail.ru`; сетевые endpoints проверять в Network |
| Google Analytics 4 | `script-src`: `https://www.googletagmanager.com`; `img-src` и `connect-src`: `https://www.googletagmanager.com`, `https://*.google-analytics.com`; дополнительные Google-домены — по активным функциям |
| Google Tag Manager | `script-src`: `https://www.googletagmanager.com`; дополнительные домены определяются **содержимым контейнера**, а не только самим GTM; отдельные интеграции могут использовать iframe |
| Google Ads | `script-src`: `https://www.googletagmanager.com`, `https://www.googleadservices.com`, `https://www.google.com`; `img-src`/`connect-src` могут потребовать `https://googleads.g.doubleclick.net`, `https://pagead2.googlesyndication.com` и другие адреса Google |
| Meta Pixel | `script-src`: `https://connect.facebook.net`; `img-src`/`connect-src`: `https://www.facebook.com` |
| Google Maps (штатный iframe) | `frame-src`: `https://www.google.com`; для **отдельно подключаемого Maps JavaScript API** нужен другой, расширенный CSP-профиль |
| Яндекс.Карты (штатный iframe) | `frame-src`: `https://yandex.ru`; для **отдельного JavaScript API 2.1** — см. следующий вопрос |

Встроенный VK Ads Pixel использует тот же загрузчик `top-fwz1.mail.ru/js/code.js`, что и Top.Mail.Ru: автоматически разрешать все домены VK не нужно. Для GTM одного разрешения загрузки контейнера недостаточно: администратор обязан настроить consent checks для каждого тега. При строгой CSP потребуется учесть сетевые endpoints тегов отдельно.

### Почему Яндекс.Карты запрашивают скрипты и изображения с разных доменов?

Полноценный **Yandex Maps JavaScript API 2.1**, подключённый кодом сайта, отличается от штатного iframe в `CookieConsentMap`. API использует JavaScript/JSONP, изображения тайлов, курсоры и иногда дополнительные iframe. Возможные источники:

- `script-src`: `https://api-maps.yandex.ru`, `https://*.api-maps.yandex.ru`, `https://suggest-maps.yandex.ru`, `https://*.maps.yandex.net`, `https://yandex.ru`, `https://yastatic.net`.
- `img-src`: `data:`, `https://api-maps.yandex.ru` (например, `/images/cursor/grab.cur`), `https://*.api-maps.yandex.ru`, `https://*.maps.yandex.net`, `https://yandex.ru` (например, `/clck/counter/`).
- `connect-src`: соответствующие фактически используемые API-endpoints.
- `frame-src`: `https://api-maps.yandex.ru` для встроенных компонентов API.

Запрос `https://core-renderer-tiles.maps.yandex.net/tiles?l=mapj&callback=...` обрабатывается как *скрипт*, несмотря на слово «tiles», поэтому одного `img-src` недостаточно. Для режима совместимости CSP документация JavaScript API 2.1 предусматривает параметр `csp=true` и дополнительные требования к стилям/шаблонам. Не переносите эти разрешения на обычный iframe без необходимости.

### Почему `mc.yandex.com/clmap` блокируется по `img-src`?

Метрика может отправлять информацию о кликах через URL, который браузер классифицирует как изображение. Если счётчик уже разрешён посетителем, проверьте наличие `https://mc.yandex.com` в **`img-src`**, а не только в `script-src`. Это отдельная CSP-блокировка, не ошибка записи согласия.

### Почему Вебвизор показывает CORS-ошибку при HTTP 204?

Например: `Access-Control-Allow-Origin` отсутствует в ответе `https://mc.yandex.com/webvisor/...` при статусе `204`. Это **CORS**, а не CSP. Добавление `Access-Control-Allow-Origin` в `.htaccess` *вашего* сайта не изменит ответ **сервера Яндекса**. HTTP 204 подтверждает ответ сервера, но сам по себе не доказывает успешное сохранение записи. Проверьте появление и воспроизведение визита в кабинете Метрики; если не работает — передайте пример запроса в поддержку Яндекса.

### Почему `mdd.yandex.net` сообщает о недействительном сертификате?

Это ошибка проверки **TLS-сертификата**, а не CSP. Нельзя исправить её добавлением домена в `script-src` или отключением проверки сертификатов. Проверьте дату/время устройства, воспроизведение в других сетях/браузерах и при необходимости обратитесь к поставщику ресурса.

### Нужно ли разрешать `ymbmlf55en.ru/wsync/`?

Если браузер сообщает об отсутствии домена в `script-src`, технически разрешение этого адреса может убрать **именно эту** блокировку. Но это даёт домену право выполнять JavaScript на сайте. Пока назначение домена не подтверждено надёжными данными поставщика, **не добавляйте его в постоянную CSP**. Даже экспериментальное разрешение не исправит независимые ошибки CORS или TLS. Не используйте `script-src https:` или `script-src *` как обход проблемы.

### Как проверять CSP после подключения сервиса?

1. В новом профиле браузера отклоните необязательные категории: в Network не должно быть запросов сервисов без согласия.
2. Разрешите нужную категорию и конкретный сервис. Проверяйте **Network**, статус запросов, журнал согласий (`audit.php`/ACK и JSONL), а также фактическую работу сервиса в его кабинете.
3. Если блокируется `script-src-elem`, проверьте сначала явную директиву `script-src-elem`, а при её отсутствии — `script-src`. Для карт/пикселей отдельно проверяйте `img-src`, `connect-src` и `frame-src`.
4. Добавляйте лишь проверенные адреса; после правки сбрасывайте HTTP/CDN-кэш и проверяйте фактический заголовок ответа. CSP действует и при восстановленном согласии после перезагрузки.
5. Для дальнейшего усиления используйте `Content-Security-Policy-Report-Only` и отдельно тестируйте отказ от `'unsafe-inline'` / `'unsafe-eval'`; без проверки не отключайте работающие интеграции.

Полезные первоисточники: [Yandex Maps JavaScript API 2.1 — CSP](https://yandex.com/dev/jsapi-v2-1/doc/en/v2-1/dg/concepts/load), [Google Tag Platform — CSP (GTM, GA4, Ads)](https://developers.google.com/tag-platform/security/guides/csp), [MDN — CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP).

## Сборка и локальная проверка

`npm ci` использует pinned esbuild 0.28.2 и Playwright 1.62.1. Frontend минифицируется при сборке, без runtime npm/Composer dependency компонента. `_build/build.php` использует MODX 3 modPackageBuilder и namespaced xPDO vehicles; normalization и verifier проверяют ZIP/SHA256/состав/отсутствие secrets. Два разных ZIP не должны иметь одну signature.

[Текущие fixtures и команды приёмки](tests/modx3-sync/README.md). Project `cookie-consent-modx3-sync106`, отдельные DB/volume/credentials/logs, loopback 20888–20895. Исторические baseline suites MODX 3 сохранены отдельно. Старые MODX 2 fixtures не используются и не сбрасываются. Общие setting-mutating suites выполняются последовательно. Исторический reset helper отключён; runtime устанавливается через native Package Management.

Package requires: PHP `>=8.1.0`, MODX `>=3.1.2,<3.3.0`. Матрица из 12 MODX/PHP конфигураций и CMS upgrade 3.1.2 → 3.2.4 описаны в [отчёте совместимости](docs/modx3-version-compatibility.md). nginx/proxy/client hosting и тяжёлые failure/load cases не входят в эту матрицу. GitHub Release/production deployment не выполнены.


# 1.0.8-pl9 — исправления modstore / modstore corrections

RU: Runtime находится в `assets/components/cookieconsentmanager3/`, приватный код — в `core/components/cookieconsentmanager3/`. Пути строятся от настроек MODX. Установщик создаёт `bootstrap.php` рядом с `audit.php` по фактическому `config.core.php`; перенесённые assets и core поддерживаются без ручных действий.

EN: Runtime lives under `assets/components/cookieconsentmanager3/`; private code remains under `core/components/cookieconsentmanager3/`. The installer generates `bootstrap.php` beside `audit.php` from the actual `config.core.php`, including relocated assets and core, without extra setup.

RU: Обновление переносит JS-файлы из старого services/ без изменения байтов и сохраняет историю SHA-256. Удалённые адаптеры не восстанавливаются. Конфликт разных файлов останавливает перенос без перезаписи. Очистка после успешной сборки удаляет только известные старые файлы с точным совпадением SHA-256; чужие и изменённые файлы сохраняются.

EN: Upgrades move user JS adapters unchanged and retain SHA-256 history. Deleted adapters stay deleted; conflicting destination files stop migration without overwriting either version. After a successful build, cleanup removes only exact known legacy hashes; unknown/changed files remain.

RU: Сборка выполняется установщиком, вручную в Manager и при очистке кеша Manager. Frontend загружает готовый bundle без проверки SHA адаптеров. Ошибка сборки сохраняет прежний bundle и версию. Docker-маршрут удалён; тестовый mock-marketing хранится только в tests/.

EN: Builds remain in installation and authenticated Manager actions (manual rebuild and cache clear). Visitors load the prepared bundle without adapter hashing. Failed builds retain the working bundle/version. Docker-only routing was removed; mock-marketing is confined to tests/.

RU: restore-elements использует шесть фактических элементов transport-пакета, существующие ID, транзакцию и dry-run по умолчанию. Настройки не меняются.

EN: restore-elements uses the six actual transport elements, existing IDs, a transaction and a default dry run. Settings remain unchanged.
