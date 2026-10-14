# beta32 — приёмка callbacks и адаптации JS-карт

Дата: 2026-10-14. Ветка `feature/modx2-frontend-bundle`, база beta31 `b2f6b5a`, реализация `3114b82`. **GO только для review.** Main и production не изменялись.

Финальный результат: **453 сценария/проверочные suite entries, 3233 assertions, 0 FAIL**. PHP/build suites считаются одним entry, не каждой assertion. [Безопасный results JSON](evidence/modx2-beta32-results.json).

## Реализация и diff

В существующий `web86CookieConsent` добавлен `onAllowed(category, callback, options?)`, возвращающий unsubscribe. Три разрешённые категории; опциональный service должен быть включён, принадлежать категории и иметь совпадающий fingerprint. Источник разрешений — приватное валидированное состояние CMP. Нет нового permission store, БД, provider schema, Manager JS editor, MODX plugins/events или managed CustomScripts chunk.

Callback исполняется один раз на регистрацию/страницу после initial restored consent, фактического commit или поздней регистрации. Draft/audit events не запускают подписки. Ошибки и rejected promises изолированы. Перед unsubscribe/отзывом отменяется будущая работа; дополнительный аргумент `stillAllowed()` позволяет собственному async коду проверить текущее разрешение перед новым SDK request/constructor. После Save с отзывом он false до существующего reload. Уже начавшиеся запросы/произвольный SDK не откатываются автоматически.

Изменение CMP — **37 добавленных строк в consent-manager.js**. Среди 55 runtime targets native ZIP отличается от beta31 только `cookie-consent.min.js`; остальные 54 файла и все native objects идентичны. CSS, PHP receiver, registry/fingerprint, Viewer, переводы, канонические элементы и настройки не изменены. [Diff реализации](https://github.com/web86/cookie-consent-manager/compare/b2f6b5a...3114b82).

## Исследование клиентского скрипта

Владелец предоставил полный `yonder-map-many.js` текстом после первоначального поиска, не нашедшего файл. Исходник реально изучен: автозапуск на DOMContentLoaded → IntersectionObserver → loadYandexApi; приватные apiLoaded/apiLoading/initQueue; **существующий публичный `window.YMAP_RESCAN`**; несколько `.js-yandex-map`, single/bbox, geometry-var, point/polygon/line, IFNS labels, clusterer, region geocode и debounce.

Подготовлена отдельная [адаптированная копия](../examples/client/yonder-map-many.consent.js), [review diff](../examples/client/yonder-map-many.consent.patch) и пользовательский [CustomScripts chunk](../examples/chunks/CookieConsentCustomScripts.html). Изменения: убрать автозапуск, передавать live guard в существующий YMAP_RESCAN, проверять его у async/SDK границ, исключить повторную инициализацию и корректно использовать уже готовый API. TV/geometry-var/координаты/modes/endpoints/styles остаются прежними. Single polygon не поддерживался исходником; такая новая поддержка не заявляется.

Функциональная копия исходника имеет уплотнённое форматирование/комментарии, не является byte-identical snapshot. Diff построен относительно этой копии и предназначен для review, не слепого git apply к клиентскому файлу. Сравнение authorized geometry/style/view operations исходника и адаптации выполнено с контролируемым SDK.

**Изменение клиентского сайта необходимо отдельно.** Transport не устанавливает файлы myyandexcoordstv и не меняет loadYandexMaps. Владелец должен убрать безусловное подключение auto-start скрипта, применить адаптированную копию на staging, создать свой чанк и добавить заглушку. Установка одного beta32 ZIP сама по себе не исправляет сторонний скрипт.

## PASS/FAIL

| Проверка | Статус | Подтверждение |
|---|---|---|
| Регистрация до CMP init/согласия, отдельно A/M/E | PASS | Ранняя регистрация до initialize; выбранная категория выполняется одна, остальные 0 |
| Сохранённый consent / поздняя регистрация / split и legacy | PASS | Настоящие страницы MODX, повторный Save не вызывает дубль; reload регистрирует новый lifecycle |
| Draft / fake audit / изменённый localStorage | PASS | Не могут разрешить callback без реального commit |
| Несколько callbacks / sync throw / async rejection | PASS | Другие callbacks/CMP продолжают работу; нет unhandled pageerror |
| Unsubscribe до и после выполнения | PASS | Ожидающий callback отменён; live guard отменён; unsubscribe идемпотентен |
| Service отсутствует/выключен/другой категории/изменён | PASS | Совпадающий fingerprint обязателен; без service проверяется только категория |
| Новый сервис / expired/invalid stored state | PASS | Не наследует разрешение; используется стандартная validation CMP |
| Отзыв | PASS | Guard false до reload; после reload отозванная регистрация не выполняется |
| Целевая callbacks suite | PASS | 13 сценариев / 44 assertions |
| JS maps pre-consent/draft/analytics-only | PASS — controlled | Нет загрузки локального map script/API; четыре нейтральные заглушки |
| JS maps grant/reload/once/rescan/готовый API | PASS — controlled | Один SDK за страницу, четыре map instances, нет дублей |
| Point/polygon/line/fallback/styles/view | PASS — controlled | Сохранённая геометрия; функциональное сравнение с присланным исходником |
| Отзыв во время local script / SDK / endpoint response | PASS — controlled | После Save нет поздних SDK operations; reload возвращает заглушки |
| Изменённый fingerprint / disabled JS-map service | PASS — controlled | Custom script/API не загружаются после reload |
| Целевая JS-map suite | PASS — controlled | 9 сценариев / 42 assertions; SDK/endpoints перехвачены, реальные Яндекс/TV/backend не проверены |
| Native clean/reuse category/31→32/reinstall/uninstall | PASS | 7 / 216 через настоящие Package Manager processors; пользовательский CustomScripts не перезаписан |
| Final native main reinstall | PASS | 88 assertions: custom chunk, IDs/metadata/settings/config/keys/старые журналы сохранены |
| 256 комбинаций провайдеров + остальная browser matrix | PASS | 281 / 1419; 3434 first-party HAR requests, 0 external в mock matrix |
| Реальный owner GTM v4 | PASS | 9 / 126; actual marketing/analytics Custom HTML tests, tag-level analytics_storage check |
| VK/Meta/ручная кнопка/iframe-карты/отзыв | PASS — controlled SDK | 32 / 175; Meta/VK доставки в кабинеты не проверены |
| GA4/Ads/GTM/Mail.Ru/Метрика GET/POST/config serialization | PASS | 16 / 295, настоящие Manager поля/Save/reload/booleans |
| SSR RU/EN/TR, overrides/HTML/delimiters, head/footer/cache busting | PASS | 9 / 77 + 4 / 112; no-JS, cold/warm |
| Viewer / CSV / поиск / история / ACL / XSS | PASS | 11 / 77 и PHP 62 assertions |
| PHP audit/schema 1/2/Origin/HMAC/replay/rate/JSONL/IP/UA | PASS | 37 / 121; настоящий endpoint; receiver code побайтно сохранён |
| Live URL guards / SDK parameters | PASS — intercepted | 11 / 51 + 4 / 18 |
| PHP registry/settings/SSR compatibility | PASS | 36 + 53 + 47 assertions |
| Syntax/runtime/ZIP/reproducibility/scope | PASS | 61 syntax checks; 55 installed hashes; два byte-identical ZIP; stock objects/targets сохранены |

Промежуточные тестовые сбои исправлены и повторены: синтаксис контролируемого SDK; MODX parsing двойных скобок fixture geometry (исправлен escaped JSON.parse); race test первоначально снимал счётчик до Save и учитывал законную работу до отзыва. Теперь счётчик снимается после Save, held response возвращается позже. Отменённый navigation wait был обработан, известный disposable registry восстановлен после прерванного теста. Эти сбои не отмечены как успешные прогоны; таблица отражает финальные завершённые результаты.

## Артефакт и обновление

Immutable, read-only ZIP: `.local/release/cookieconsent-0.1.0-beta32.transport.zip`.

SHA256: `a6b1a3f18a6183f8dbbff9c706932330b054859ab4bdef90ea9f442ccad62a82`.

Native transport: **71 vehicles = 14 object / 55 file / 2 script; 136 ZIP entries**, пять canonical элементов, без CustomScripts/client JS-map vehicles. Beta31 immutable archive не изменён.

Public JS: 19492 bytes, SHA256 `cdb13b63fc3182aaa180e143ceffa94e2f594678bb93cfdbecf1e7f39ff6c635`. CSS прежний: 3286 bytes, SHA256 `9d5ba1e5c0e6e1394806309a04f31a7d7a1b94acbed88ffca5ade89cef61ff88`. Locked esbuild 0.28.2; minification только при build, cache busting — content hash. Клиентские примеры/тестовые SDK в bundle/ZIP не включены.

Сохраните DB/runtime/custom elements/logs; установите ZIP штатным Package Manager на staging после review, очистите кэш MODX и проверьте обновлённый JS hash. Самостоятельно создайте CustomScripts и примените отдельное изменение myyandexcoordstv только после сравнения со своим файлом. Не подключайте исходный auto-start script одновременно с адаптацией. [RU/EN API, интеграция и ограничения](modx2-beta32-callbacks.md).

## NOT RUN

- Реальный клиентский MODX, TV YandexCoor, PHP endpoints/backend, настоящий Yandex SDK/API key/tiles/geocode и browser network на клиентском хостинге. Контролируемый тест адаптации не выдаётся за эту приёмку.
- Доставка в реальные Meta/VK/Analytics/Ads кабинеты и фоновая работа vendor SDK после отзыва. Уже отправленный запрос не откатывается; guard останавливает собственные новые операции, reload завершает страницу.
- Production/staging deployment, настоящие CDN/browser caches, Firefox/WebKit, другие PHP/MODX, Windows/IIS/LiteSpeed.
- Полная nginx/reverse-proxy/lifecycle failure injection матрица для beta32; receiver/private audit не изменены.
- ENOSPC/power loss/DB outage/произвольные FS races; универсальный atomic rollback не обещается.

[ZIP inventory](evidence/modx2-beta32-zip-inventory.json). Рекомендация: review CMP и отдельной клиентской адаптации, затем staging с настоящими TV/backend/API key. Production GO не выдаётся.
