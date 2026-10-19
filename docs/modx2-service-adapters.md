# MODX 2: сопровождение встроенных сервисов (1.0.4-beta5)

Цель beta5 — независимые исходники SDK при прежнем единственном production bundle.
Поведение сравнивается с beta4 `de41eaa0f976c54c0d2836b605c7474ad874c472`.
PHP registry, categories_v2, category_versions, migration, schema 3, публичные API,
Strict/Legacy и карты сохраняют прежний контракт. MODX 3 не изменяется.

## Файлы

Все пути ниже относительно `assets/components/cookieconsentmanager/js/cookie-consent/`:

| Loader | Исходник для обновления интеграции | Общая зависимость |
| --- | --- | --- |
| `yandex` | `services/yandex.js` — ym queue, параметры init, URL | runtime script loader |
| `mailru` | `services/mailru.js` — регистрация pageView | `services/mailru-common.js` |
| `vk_ads` | `services/vk-ads.js` — регистрация VK ID/pageView | `services/mailru-common.js` |
| `google_ga4` | `services/google-ga4.js` — параметры Google signals | `services/google-common.js` |
| `google_ads` | `services/google-ads.js` — Google Ads config | `services/google-common.js` |
| `google_gtm` | `services/google-gtm.js` — gtm event, контейнер и URL | `services/google-common.js` |
| `meta_pixel` | `services/meta-pixel.js` — fbq queue, init, PageView, revoke | runtime script loader и live guard |
| `custom_js` | `services/custom-js.js` — загрузка проверенного пути | runtime script loader и URL validator |
| `mock_marketing` | `services/mock-marketing.js` — явный live no-op | общая mock-загрузка, `mock/marketing.js` |
| `google_maps`, `yandex_maps` | `embeds.js` — прежний iframe lifecycle | consent owner; не SDK-адаптеры |

`service-runtime.js` содержит один cache загрузки URL, instance tokens и общее
разрешение. `service-loaders.js` создаёт закрытый явный реестр адаптеров, получает
validated instances от `web86Providers`, сохраняет порядок registry, проверяет
permission, запускает, ловит ошибки и координирует revoke. SDK init и URL в нём нет.

Порядок определения файлов задан явно в `_build/frontend.mjs`: runtime, URL,
registry, service runtime, общие helpers и adapters, dispatcher, embeds, consent
manager. Каталог не сканируется для подключения; внешние loader names не могут
загружать произвольный модуль. Нет runtime imports, code splitting и новых globals.
Фабрики — lexical constants внутри прежней IIFE.

## PHP и разрешения

`server/src/CookieConsentServiceRegistry.php` остаётся доверенным allowlist:
имена loaders, ID rules, default options, разрешённые параметры и URL. Browser
registry проверяет минимальный публичный payload и предоставляет frozen instances.
Адаптер получает уже проверенный экземпляр; не регистрирует права администратора.
В beta5 PHP контракт и JS registry не менялись.

Объект `runtime` передаётся один раз фабрике адаптера. `start(service, mode, value)`
вызывается с committed snapshot того apply. Для отложенной работы проверяется
`runtime.allowed(service, runtime.currentValue)`: этот метод использует живой
`runtimeAllowed(category)` consent owner, enabled, visibility и общий stopping flag.
Storage и category grants адаптер не читает и не создаёт. Meta проверяет guard после
await; Custom JS — перед запросом. Уже запущенный чужой JS универсально остановить
нельзя. Общий revoke немедленно ставит stopping, затем очищает принадлежащие CMP
Google/Meta/VK pending commands и оставляет прежний ACK/reload consent owner.

До выбора Legacy не пишет Google consent commands, не урезает обычные параметры
и не выдаёт фиктивного согласия. Strict, saved reject/partial/expired/stale и ошибки
storage проходят прежний путь consent manager.

## Общая загрузка и shared SDK

`runtime.script(url)` нормализует абсолютный URL относительно location и хранит
Promise в одном Map. Повторный запрос возвращает тот же Promise, включая rejected;
автоматических retries нет. Script async и тексты network errors прежние. Instance
token резервируется до запуска, как в beta4; ошибка не превращается в повторный init.
Цикл apply вызывает адаптеры в порядке registry без ожидания предыдущей сети,
сохраняя порядок синхронной регистрации очередей. Ошибки попадают в общий warning.

Google common владеет dataLayer/gtag, Consent Mode, CMP command ownership и одним
`gtag-library` token для GA4/Ads. GA4 вычисляет собственный allow_google_signals;
общая настройка сохраняет ad personalization, остальные validated config options
и режим Legacy. GTM формирует свой event и URL отдельно, используя общие queues.

Mail.Ru common владеет `_tmr`, URL `top-fwz1.mail.ru/js/code.js`, флагом загрузки и
множеством VK IDs. Mail.Ru и VK регистрируют собственные pageView. При отзыве до
готовности SDK удаляются только ожидающие VK pageView, как в beta4. Meta queue
принадлежит своему адаптеру; повторные IDs/grant и pending PageView сохраняют
прежнюю семантику. Mock dispatch общий, Custom JS исполняется из своего пути даже
в mock. Все десять `mock/*` fixtures сохранены.

## Обновление одного сервиса

Например, для изменения Яндекс.Метрики отредактируйте `services/yandex.js`.
Менять dispatcher не требуется. Если поставщик требует новых параметров, это уже
изменение контракта: синхронизируйте PHP allowlist/defaults/ID validation, JS registry,
Manager options, локализацию и соответствующие тесты отдельной задачей.

```sh
npm ci
npm run build:frontend
CC_REFACTOR_BASELINE=tests/frontend-refactor/service-adapters-baseline.json \
  CC_REFACTOR_EVIDENCE=.local/service-adapters/focused \
  node tests/frontend-refactor/equivalence.mjs --focused
node tests/provider-parameters.mjs
node tests/legacy-autoload/browser.mjs
node tests/legacy-autoload/matrix.mjs
```

Differential использует immutable beta4 из git и одинаковые локальные SDK fixtures;
сравнивает URL, параметры, порядок, очереди, consent commands, storage/audit, API
и maps. Для намеренного изменения SDK обновляйте expectation осознанно: сравнение
с beta4 должно показать и документировать именно запланированное отличие.
Для Google дополнительно `tests/live-guard.mjs`, для VK/Meta —
`tests/beta31/pixels.mjs`; реальные публичные SDK —
`tests/legacy-autoload/direct-vendors.mjs` в существующей контролируемой среде.
Telemetry там перехватывается; получение событий кабинетом — отдельный ручной gate.

## Пример нового адаптера (не включён в продукт)

Это схема для будущей работы, не реализация нового сервиса:

```js
const web86CreateExampleAdapter = runtime => ({
  async start(service) {
    if (!runtime.allowed(service, runtime.currentValue)) return;
    await runtime.script(service.config.path); // только после PHP/JS URL validation
    if (!runtime.allowed(service, runtime.currentValue)) return;
    // Здесь provider-specific init проверенного SDK.
  }
});
```

1. Добавьте фиксированное имя и контракт в PHP и JS registry, defaults, Manager.
2. Добавьте файл фабрики с init/options/provider lifecycle. Для shared SDK используйте
   существующий helper; не создавайте новый consent engine или script cache.
3. Укажите файл в явном build list до dispatcher, добавьте фиксированную запись
   внутреннего реестра. Публичный JSON не расширяет этот реестр.
4. При необходимости добавьте revoke hook в установленном порядке общего revoke.
5. Проверьте Strict/Legacy, каждую категорию, hidden/disabled, dedup/shared SDK,
   pending revoke, ошибки, сохранённый выбор и audit ACK; обновите source inventory.

## Сборка и native transport

`npm run build:frontend` использует pinned esbuild **0.28.2**, deterministic input
order, прежний ES2020 target и init guard. Manifest содержит hashes всех исходников
и outputs. Публичный JS остаётся `assets/components/cookieconsentmanager/js/cookie-consent/cookie-consent.min.js`;
PHP Assets по-прежнему добавляет content hash. Исходные adapters не поставляются
отдельными HTTP assets. Bundle вручную не редактировать.

На существующих disposable MODX 2 fixtures (не на клиентской БД):

```sh
node _build/transport.mjs /var/www/html /tmp/cc-beta5-build-a
# docker cp из web: ZIP и inventory в новую локальную папку; затем:
python3 _build/normalize.py <новый-native.zip>
# Повторите native build в независимой папке b, normalize и сравните SHA256.
node tests/frontend-refactor/build.mjs
node tests/frontend-refactor/equivalence.mjs
node tests/frontend-refactor/acceptance.mjs --native
node tests/frontend-refactor/manager.mjs
```

Builder требует свежих version/guide/frontend manifests. Для очередной версии
измените `_build/package.json`, выполните `_build/version.mjs`, `_build/user-guide.mjs`
и используйте новые output directories, не перезаписывая предыдущие ZIP.
`build.mjs` ожидает normalized copies в `.local/service-adapters/final-a` и `final-b`
и доставляемую копию в `.local/artifacts`. Native verifier выполняется внутри web:
`php /opt/cc-source/_build/verify.php /opt/cc-source/.local/artifacts/<signature>.transport.zip`.

Полная приёмка последовательна, так как suites используют общие disposable БД:
20 universal suites, native fresh/upgrade/reinstall/uninstall, beta4 upgrade,
PHP 8.1/8.2, Fenom RU/EN cold/warm, Manager, real SDK fixtures и SHA reproducibility.
`--native` архивирует/сбрасывает только именованные clean/publiccore fixtures.

## Исторические исходники

Повторный поиск потребителей и native inventory подтвердил отсутствие production
подключений корневых `analytics.js` и `marketing.js`; они удалены из sources.
Не путать с сохранённым `mock/marketing.js`. Их прежние версии доступны в git/beta4.

`i18n.js` и `lexicons.json` перенесены без изменения bytes в
`archive/standalone-i18n/`. Это архив прежнего standalone helper, не способ подключения
актуального CMP. Три browser compatibility cases RU/EN/inline overrides продолжают
выполнять архив из `tests/locale-guide/examples.mjs`, без SKIP. PHP lexicons и renderer
остаются текущим источником локализации. Архив не входит в bundle/native payload.

Никакой install/uninstall cleanup старых файлов на сайтах не добавлен. При ручных
исторических подключениях администратору нужно проверить шаблоны, chunks и CDN,
убрать старые script tags после перехода на штатные Assets/Banner и очистить cache.
Старые acceptance reports, audit schemas, consent migration, API и transport ZIP
сохранены. Новые сервисы, видео и generic templates этой версией не реализуются.
