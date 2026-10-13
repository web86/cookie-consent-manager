# beta32 — callbacks и клиентские JavaScript-карты

Рабочая ветка `feature/modx2-frontend-bundle`, база beta31. Без merge и production deployment. [Приёмка](modx2-beta32-acceptance.md).

## RU: API

```js
const unsubscribe = window.web86CookieConsent.onAllowed(
    'external_content',
    async function (stillAllowed) {
        // Выполняется один раз для этой регистрации на этой странице.
        await localPreparation(); // ваша локальная функция
        if (!stillAllowed()) return;
        // Только теперь — следующая операция с разрешённым сервисом.
    },
    { service: 'yandex_maps' }
);
// Отменяет ожидающий callback и делает его stillAllowed() ложным:
unsubscribe();
```

Категории: `analytics`, `marketing`, `external_content`. Без `service` проверяется только категория — подходит для локальной логики сайта. Для внешнего SDK задайте конкретный service key. Сервис должен быть включён, принадлежать категории и иметь действующий fingerprint в валидированном consent. Неизвестный/выключенный/другой service не выполняет callback. Изменённый fingerprint требует нового выбора посетителя. Неверные аргументы/неизвестные options вызывают TypeError.

Callback вызывается после инициализации с сохранённым consent, после фактического Save/Accept или сразу при поздней регистрации с уже действующим разрешением. На каждый вызов onAllowed создаётся отдельная подписка: даже одинаковая функция, зарегистрированная дважды, имеет две регистрации. Каждая выполняется не более одного раза за страницу. После reload регистрации выполняются заново по сохранённому валидированному состоянию. Draft checkbox/audit events не дают разрешений. Исключения и rejected promises из callbacks изолированы.

`stillAllowed()` — дополнительный необязательный аргумент callback, нулевые аргументы также работают. Он читает текущее внутреннее состояние CMP, включая service/fingerprint. После unsubscribe или Save с отзывом он сразу false, до reload. Проверяйте его **после каждого await и перед каждым новым SDK request/constructor**. При отзыве CMP не запускает новые callbacks во время ожидания reload; новые разрешения применятся на следующей странице.

Механизм не sandbox: он не остановит произвольный код, который игнорирует guard, SDK из стороннего шаблона, автоматически выполняющийся script, или уже отправленный запрос. Категорийный callback нельзя использовать как разрешение всех внешних сервисов. Не читайте localStorage для самостоятельной проверки.

## Пользовательский чанк

Создайте **самостоятельно** `CookieConsentCustomScripts` с содержимым [примера](../examples/chunks/CookieConsentCustomScripts.html). Он не устанавливается/не обновляется/не удаляется transport. В шаблоне один раз:

```html
<head>[[!CookieConsentAssets]]</head>
<body>
    <!-- Содержимое сайта и ваши контейнеры карт -->
    [[!CookieConsentBanner]]
    [[$CookieConsentCustomScripts]]
</body>
```

Legacy `[[!CookieConsent]]` остаётся альтернативой Assets/Banner; не смешивайте их. Чанк регистрирует три callbacks, а Maps использует `{service:'yandex_maps'}`. JavaScript хранится в пользовательском чанке/файлах сайта, не в Manager provider settings. API доступен на странице с инициализированным CMP; если CMP отсутствует, пример ничего не загружает.

## Исследование присланного yonder-map-many.js

Владелец предоставил полный исходный код текстом. Файл отсутствовал в рабочих копиях; клиентский сайт/TV/backend/API key не предоставлены. [Функциональная копия исходника](../tests/beta32/client-source/yonder-map-many.original.js) содержит тот же исполняемый код с уплотнённым форматированием/комментариями; это не byte-identical snapshot клиентского файла.

- `DOMContentLoaded → observeMaps → IntersectionObserver` автоматически запускает `loadYandexApi()` для видимых `.js-yandex-map`.
- API URL фиксированный HTTPS `api-maps.yandex.ru/2.1/?lang=ru_RU`, ключ берётся из первого контейнера. `apiLoaded/apiLoading/initQueue` делят SDK между картами.
- **Публичная функция уже существует: `window.YMAP_RESCAN = observeMaps`**. Она не зависит от DOMContentLoaded; её можно вызвать позднее. Сам DOMContentLoaded handler не сработает при поздней загрузке скрипта.
- Повторные rescans создавали observer для ещё не помеченных `inited` элементов: при ожидающем SDK возможны дубликаты. `inited` bbox ставился после async данных.
- Existing `script[data-ymaps]`, уже завершивший load, мог оставить очередь ожидающей навсегда. Адаптация сначала проверяет `window.ymaps`.
- Single поддерживает point и fallback data-coords. Bbox поддерживает point/polygon/line, IFNS polygons/labels, clustering, region geocode и debounce. Single polygon исходник не поддерживает; новое поведение для него не заявляется.

## Изменение клиентского компонента — отдельно от установки CMP

Подготовлена [полная адаптированная копия](../examples/client/yonder-map-many.consent.js) и [review diff](../examples/client/yonder-map-many.consent.patch). Diff построен относительно уплотнённой копии, не предназначен для слепого git apply к оригинальному форматированию. На staging владелец должен сопоставить свой действительный файл, сохранить backup и вручную применить изменения или адаптированную копию. Пакет не меняет `myyandexcoordstv`.

1. Удалить безусловное подключение исходного auto-start скрипта через `loadYandexMaps` и любые прямые Yandex SDK/preconnect/noscript. Существующие TV `YandexCoor`, window geometry variables, data attributes, single/bbox оставляются.
2. У адаптированной копии убрать DOMContentLoaded auto-start. `YMAP_RESCAN(stillAllowed)` остаётся существующей функцией; теперь получает живой guard. Без guard старт заблокирован.
3. Проверять guard перед SDK, `ymaps.ready`, Map/geometry construction, async polygon/point responses, событиями/таймерами и geocode continuation. SDK/map initialization защищены от повторных rescans.
4. Пользовательский чанк после разрешения загружает **только адаптированный** локальный файл, повторно проверяет guard после load и вызывает `YMAP_RESCAN(stillAllowed)`. Поздняя загрузка локального файла после отзыва остаётся инертной и не подключает API.
5. В существующий контейнер добавьте [заглушку](../examples/chunks/YandexMapPlaceholder.html). Она использует ручной `data-cookie-settings-open`; после инициализации удаляется. Автоматический per-map revoke не возвращается. Отзыв — через общие настройки и reload.
6. Включите штатный `yandex_maps`; не используйте разрешение Метрики. Если меняется раскрытое назначение сервиса, смените его существующий `purpose_id` для нового fingerprint. API key/геометрия находятся в клиентском компоненте, не в новой CMP config schema.

Адаптация сохраняет координаты, geometry-var, режимы, endpoints, стили объектов, zoom/scroll behavior. Присланный script использует один API key первого контейнера: разные ключи за страницу не добавлены. Backend mappoints/mappolygons и безопасность их HTML/URL/данных не проверены и не переписаны. Point/polygon/line проверены на контролируемом SDK и локальных endpoint fixtures, **не на реальном клиентском сайте**.

## EN: callbacks and JS maps

Create your own `CookieConsentCustomScripts` chunk using the example and include it once after the CMP integration. Transport never owns or overwrites it. Keep Assets once in head and Banner once before closing body, or use the separate legacy integration.

`onAllowed(category, callback, {service})` uses committed, validated consent. The three optional categories are supported. Each registration runs once per page, including late registrations or restored consent. Unsubscribe cancels pending execution and invalidates the callback's live `stillAllowed()` argument. Synchronous errors and rejected promises cannot stop other callbacks. Draft/audit events are not permission signals. For external SDKs require the actual enabled service and matching fingerprint; category-only callbacks are for local logic.

Check stillAllowed after every await and before new requests or constructors. Withdrawal invalidates it before the existing reload; callbacks do not sandbox scripts or undo dispatched traffic. The original owner-supplied map code auto-loads the API via DOMContentLoaded/IntersectionObserver and has a real public YMAP_RESCAN function. Replace its automatic start with the consent-adapted copy on your staging site; the sample chunk loads that local copy after consent and calls YMAP_RESCAN(stillAllowed). Geometry variables, TV, single/bbox modes and server endpoints remain owned by your component. Add the neutral placeholder with the manual cookie-settings opener. No native iframe adapter is changed.

Review diff uses a compacted source transcription, not exact original formatting. Real client installation, genuine Yandex API/key/tile/geocode delivery and backend/TV integration are NOT RUN. The controlled tests prove the adaptation contract and race guards; they do not prove your hosting or arbitrary unmodified scripts safe.
