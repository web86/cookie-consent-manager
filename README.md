# Cookie Consent Manager 1.0.0

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

## Сборка и проверка

`npm ci` устанавливает зафиксированные esbuild 0.28.2 и Playwright 1.62.1. `npm run build:frontend` собирает раздельные исходники в один публичный минифицированный JS и CSS. `_build/build.php` использует настоящий MODX 2 modPackageBuilder; `_build/normalize.py` нормализует ZIP metadata, `_build/verify.php` проверяет vehicles, hashes и отсутствие приватных данных. Минификация не выполняется в MODX runtime.

[Полный release harness](tests/release/run.mjs), [новые focused тесты](tests/beta33/README.md), [transport tests](tests/transport/). Только локальные именованные disposable DB и loopback fixtures. Shared main suites запускаются последовательно. Независимые beta-отчёты и immutable архивы сохранены в `docs/`; они описывают соответствующие исторические версии. Production deployment выполняется владельцем отдельно после staging.
