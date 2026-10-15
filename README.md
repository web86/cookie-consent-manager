# Cookie Consent Manager 1.0.0

> В этой review-ветке готовится непубликуемый кандидат 1.0.2: [полировка](docs/modx2-commercial-polish-guide.md) и [frontend/руководство onAllowed](docs/modx2-locale-guide.md). Стабильные main/v1.0.0 и опубликованный ZIP остаются прежними.

Стабильный native transport для **MODX Revolution 2.8.8**, PHP **8.1+**. Канонический источник — ветка [`main`](https://github.com/web86/cookie-consent-manager/tree/main). [Release Notes](docs/release-1.0.0.md), [приёмка PASS/FAIL/NOT RUN](docs/modx2-1.0.0-acceptance.md).

Компонент управляет согласиями, загружает сторонние сервисы после разрешения, локализует баннер на стороне PHP и записывает события через публичный PHP receiver в месячные JSONL-журналы. В Manager доступны сервисы, независимая видимость категорий, пользовательские RU/EN/дополнительные переводы, настройки журнала, Audit Viewer и CSV. Нативные install/upgrade/reinstall/uninstall используют modPackageBuilder, vehicles и штатные resolvers, без MODX plugins и отдельного lifecycle ledger.

## Установка и обновление

1. Сделайте backup DB, runtime, пользовательских/static исходников элементов, audit-конфигурации и журналов.
2. Проверьте SHA256 опубликованного `cookieconsent-1.0.0.transport.zip` по Release Notes.
3. В MODX Manager → Package Management загрузите ZIP, найдите локальный пакет и выполните Install/Upgrade. Setup Options отсутствуют.
4. Откройте Components → Cookie Consent Manager. Включите нужные сервисы с принадлежащими вам IDs и отметьте «Показывать в настройках cookie» для используемых категорий. На новой установке сервисы и необязательные категории выключены.
5. На вкладке «Основные» задайте каталог журнала и нажмите общий Save. Предлагается `MODX_CORE_PATH . 'cache/logs/'`, даже при core вне webroot. Локальная проверка записи/чтения не требует HTTP self-request. Если путь очищен — новые записи выключены; старые журналы остаются. Ошибка каталога сохраняет остальные корректные настройки и прежний рабочий путь.
6. Подключите один из способов ниже, очистите штатный кэш MODX и кэш HTML/CDN, проверьте сайт на staging.

Журналы могут содержать IP-адреса и технические сведения о посетителях. Ограничение HTTP-доступа к каталогу обеспечивает администратор сайта. Компонент не создаёт `.htaccess` и не проверяет тип веб-сервера. При ручной очистке всего `core/cache/` сохраните журналы; включайте их в backup. Файлы `YYYY-MM-cookie-consent.log` отделены от `error.log`; автоматического удаления нет.

При обновлении код пяти canonical элементов заменяется на месте с предупреждением: `CookiesPopup`, `CookieConsent`, `CookieConsentAssets`, `CookieConsentBanner`, `CookieConsentMap`. ID, category, properties и пользовательские метаданные сохраняются; stock-копии не создаются. Настройки, переводы, HTML, IDs сервисов, ключи и прежние журналы сохраняются. Старый `CookieConsentRegistry` может остаться на сайте, но больше не устанавливается и не вызывается. Uninstall удаляет поставляемые runtime-файлы и сохраняет DB-настройки, элементы, категории, ACL и пользовательские данные; предварительно уберите подключения из шаблонов. Не выполняйте uninstall старого пакета поверх обновлённой версии. Полный purge — отдельное решение владельца. При поздних файловых сбоях возможно частичное состояние; универсальный атомарный rollback не обещается, нужен backup/restore.

## Публичное подключение

Рекомендуемый split-контракт: **один** Assets в head и **один** Banner перед закрытием body.

```html
<head>
    [[!CookieConsentAssets]]
</head>
<body>
    ...
    <button type="button" data-cookie-settings-open>Настройки cookie</button>
    [[!CookieConsentBanner]]
</body>
```

Assets выводит минимальный JSON, один CSS и один JS с `defer` и content-hash cache busting; Banner — уже локализованный HTML. Тексты берутся из вкладки «Тексты», cultureKey и stock-лексиконов с fallback; JS не переписывает статические переводы. Настройки открываются пользовательской ссылкой/кнопкой в любом месте или `window.web86CookieConsent.openSettings()`; автоматической кнопки нет.

Для прежней интеграции оставьте единственный `[[!CookieConsent]]` вместо обоих новых сниппетов. **Не смешивайте legacy и split и не повторяйте теги.** Автоматическое исправление ошибочной интеграции не входит в контракт. MODX plugins/OnParseDocument не используются.

English integration: place `[[!CookieConsentAssets]]` once in `<head>` and `[[!CookieConsentBanner]]` once before `</body>`. Add your own `<button type="button" data-cookie-settings-open>Cookie settings</button>`. Alternatively retain one legacy `[[!CookieConsent]]`; never combine the methods. Static translations are resolved in PHP using saved overrides and stock fallbacks.

## Категории, callbacks и карты

Necessary всегда присутствует. Видимость analytics/marketing/external_content **не зависит от наличия интеграций**. На вкладке «Сервисы» каждый раздел имеет отдельный флаг видимости и независимую кнопку сворачивания. При upgrade beta32 старое правило наличия включённых сервисов однократно определяет начальные флаги. Затем используются сохранённые значения. Скрытие/повторное включение инвалидирует разрешение только этой категории, включая посетителей, отсутствовавших между изменениями; скрытая категория не разрешается автоматически.

Пользовательские интеграции можно вынести в свой чанк после Banner:

```html
<script>
window.web86CookieConsent.onAllowed('external_content', async function (stillAllowed) {
    if (!stillAllowed()) return;
    // Load your own reviewed local integration here.
    // Check stillAllowed() again after each await before SDK calls/network work.
});
</script>
```

Без опции `service` достаточно видимой разрешённой категории, даже без зарегистрированных сервисов. С `{service:'yandex_maps'}` требуется включённый экземпляр и совпадающий fingerprint. Callback выполняется один раз на регистрацию за страницу, включая сохранённое согласие и позднюю регистрацию. Возвращаемая `unsubscribe()` отменяет ожидание и делает `stillAllowed()` false; исключения изолированы. Draft Manager и audit не запускают callbacks. Перед reload при отзыве guard прекращает работу; он не отменяет уже отправленные запросы. Не подменяйте consent сохранённым внешним boolean.

[Пример пользовательского CustomScripts](examples/chunks/CookieConsentCustomScripts.html), [адаптация присланных JavaScript-карт](examples/client/yonder-map-many.consent.js), [нейтральная заглушка](examples/chunks/YandexMapPlaceholder.html), [подробный контракт onAllowed и карты](docs/modx2-beta32-callbacks.md). Эти файлы не управляются transport; владелец применяет их отдельно. Реальный клиентский TV/backend/API key в приёмке отсутствовал.

Для штатных iframe-карт используйте `CookieConsentMap` и поддерживаемые Google/Yandex HTTPS embed URLs. До согласия iframe отсутствует. При скрытой external_content кнопка карты не обходит запрет. Отзыв выполняется через общие настройки; отдельной кнопки отзыва у карты нет.

## Сервисы и безопасность

Поддерживаются Яндекс.Метрика, Top.Mail.Ru, GA4, GTM, Google Ads, VK Ads Pixel, Meta Pixel, Google Maps и Яндекс.Карты; можно добавить дополнительные экземпляры с постоянными ключами. Только проверенные SDK URLs, без редактора произвольного JS. VK и Meta — маркетинг; одинаковые включённые ID Mail.Ru/VK в разных категориях отвергаются. Meta использует per-ID init/trackSingle PageView, autoConfig off, consent revoke; без Advanced Matching/CAPI/email/phone. Доставка событий в реальные рекламные кабинеты не заявляется.

GTM запускается по маркетингу и своему fingerprint, без требования всех категорий. До SDK передаются отдельные Google Consent Mode v2 значения. Администратор обязан настроить consent checks тегов внутри контейнера: Consent Mode сам по себе не ограничивает произвольный Custom HTML. Аналитические теги должны требовать analytics_storage. [Ручной тест VK с действительным ID](docs/modx2-beta31-integration.md).

Интеграция Метрика → `#clientid`/Битрикс24 удалена из ядра. Legacy `clientId: true/false` безопасно удаляется при миграции; неверные типы отвергаются. Новый fingerprint Метрики требует явного повторного разрешения; остальные сервисы не получают автоматических новых прав. При необходимости создайте свой чанк по [YandexMetrikaClientId.html](examples/chunks/YandexMetrikaClientId.html). Он использует конкретный сервис и live guard, не загружает SDK сам и не мешает отправке формы без ClientID. [Описание миграции категорий и ClientID](docs/modx2-beta33-categories.md).

Аудит сохраняет schema 1/2, Origin validation, HMAC, rate limiting, replay protection, event_id/consent_id, IP/User-Agent, серверное время и ACK с event_id. Локальная файловая готовность не подтверждает приём событий: проверяйте реальный браузерный ACK и соответствующую запись. Вкладка «Журнал» и CSV доступны с `cookie_consent_view_logs` независимо от права изменения настроек.

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

## Сборка и проверка

`npm ci` устанавливает зафиксированные esbuild 0.28.2 и Playwright 1.62.1. `npm run build:frontend` собирает раздельные исходники в один публичный минифицированный JS и CSS. `_build/build.php` использует настоящий MODX 2 modPackageBuilder; `_build/normalize.py` нормализует ZIP metadata, `_build/verify.php` проверяет vehicles, hashes и отсутствие приватных данных. Минификация не выполняется в MODX runtime.

[Полный release harness](tests/release/run.mjs), [новые focused тесты](tests/beta33/README.md), [transport tests](tests/transport/). Только локальные именованные disposable DB и loopback fixtures. Shared main suites запускаются последовательно. Независимые beta-отчёты и immutable архивы сохранены в `docs/`; они описывают соответствующие исторические версии. Production deployment выполняется владельцем отдельно после staging.
## Публичный реестр

В review-кандидате браузер получает только технические данные сервисов; локализованные названия и описания остаются в PHP HTML. Fingerprint сохранённых согласий не меняется. [Контракт публичного реестра и обновление](docs/public-service-registry.md).
