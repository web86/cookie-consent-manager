# Cookie Consent Manager for MODX 3

Самостоятельная версия для **MODX Revolution 3.2.4-pl**, PHP **8.1+**, xPDO 3 и MariaDB. Ветка `modx3` содержит полный исходный код MODX 3; `main` остаётся версией для MODX 2. Общего CMS adapter, переключателя сборки и дополнительных таблиц компонента нет.

Текущий кандидат: **`cookieconsent3-0.1.0-beta2`**, native transport, **неопубликованный beta для review**. [Техническая приёмка](docs/modx3-implementation-acceptance.md), [машиночитаемые результаты](docs/evidence/modx3-implementation-results.json). Compatibility audit сохранён как историческое исследование исходной базы 1.0.2; принятое решение — независимые ветки/сборки.

Реальная локальная приёмка: MODX 3.2.4-pl, PHP 8.1.34, xPDO 3.1.7, MariaDB 11.8.9, Apache/Chromium. Все установки работают с `load_deprecated_global_class_aliases=false`. PHP использует настоящие namespaces MODX/xPDO; Manager следует `cultureKey` текущей сессии. Frontend JS/CSS и consent-форматы сохранены из проверенной базы 1.0.2.

## Установка и обновление

1. Сделайте backup БД, runtime, пользовательских/static исходников элементов, private audit config и журналов.
2. Проверьте SHA256 точного ZIP. Для beta2: `e55c66e9dceca74881b0568a9ebd7a6707f52e1571368cf8176247aac0a7fe87`.
3. Загрузите ZIP в штатный MODX Package Management и выполните Install/Upgrade. Setup Options отсутствуют.
4. Откройте Cookie Consent Manager в меню Extras. Включите нужные сервисы с вашими IDs и независимые флаги видимости категорий. На свежей установке необязательные категории и сервисы выключены, IDs в package defaults отсутствуют.
5. На «Основных» выберите существующий каталог журнала и нажмите Save. Default — `MODX_CORE_PATH . 'cache/logs/'`. Save проверяет локальную запись/чтение; при необходимости создаёт managed audit configuration в существующей MODX registry. Пустой путь отключает новые записи. Ошибка каталога сохраняет другие корректные настройки и прежний рабочий путь.
6. Подключите компонент, очистите обычный MODX/HTML/CDN cache и проверьте реальный browser ACK и запись event_id на staging.

Пакет **заменяет source пяти canonical элементов на месте**: CookiesPopup, CookieConsent, CookieConsentAssets, CookieConsentBanner, CookieConsentMap. ID, категории, properties, property sets, description и пользовательские метаданные сохраняются. Static elements становятся DB-backed; исходный static file не изменяется. Пользовательский код держите в своих чанках/JS. Retired CookieConsentRegistry не устанавливается и не вызывается.

Native uninstall удаляет только перечисленные runtime files и сохраняет элементы/settings/categories/menu/ACL, audit config/key и журналы. Заранее уберите component calls из шаблонов; оставшийся пункт меню без controller не будет работать. Purge — отдельное решение владельца. Native preserved.php не заменяет независимый backup и может быть перезаписан reinstall; атомарный DB/FS rollback при поздних сбоях не обещается.

Семейство `cookieconsent3` независимо от MODX 2 `cookieconsent`, но runtime namespace `cookie_consent`, пути и имена данных прежние. Не устанавливайте оба variants одновременно в одной CMS и **не выполняйте старый MODX 2 uninstall поверх нового runtime** на мигрированном сайте. Миграция самой CMS требует отдельного staging clone/backup; это не обычный package upgrade.

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

Сохраняются `window.web86CookieConsent`, `onAllowed()`, live `stillAllowed()` и возвращаемая `unsubscribe()`. Без service option callback требует согласия видимой категории; с `{service:'instance_key'}` — также enabled instance и совпадающий fingerprint. Не храните отдельный boolean вместо live guard; проверяйте его перед запросами и после каждого await.

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

Поддерживаются Яндекс.Метрика, Mail.Ru, GA4, GTM, Google Ads, VK Ads Pixel, Meta Pixel и карты. GTM запускается по marketing + fingerprint; consent checks тегов внутри контейнера настраивает владелец. Доставка в реальные рекламные кабинеты не заявляется локальными mock tests.

## Аудит и права

Browser consent → POST → ACK с event_id → месячный JSONL → Viewer/CSV. Сохраняются schema 1/2, Origin validation, replay window, rate limiting и server UTC. HMAC используется для IP rate bucket; клиентские события остаются неподписанными claims. Журналы могут содержать IP/User-Agent; HTTP-защиту выбранного каталога обеспечивает владелец. Компонент не создаёт `.htaccess` и не выполняет обязательный HTTP self-request на Save.

Managed secret хранится в options существующей native registry queue; новая таблица не нужна. Поддерживаются private JSON и trusted environment configuration вне DOCUMENT_ROOT. Настройки/ключ и старые файлы не заменяются upgrade/reinstall. Сохраняйте журналы перед ручной очисткой всего core/cache.

`cookie_consent_manage` управляет settings/preview/reconsent; `cookie_consent_view_logs` отдельно разрешает просмотр/details/CSV. Для logs-only роли есть `/manager/?a=logs&namespace=cookie_consent`; обычный component menu имеет manage permission.

## Сборка и локальная проверка

`npm ci` использует pinned esbuild 0.28.2 и Playwright 1.62.1. Frontend минифицируется при сборке, без runtime npm/Composer dependency компонента. `_build/build.php` использует MODX 3 modPackageBuilder и namespaced xPDO vehicles; normalization и verifier проверяют ZIP/SHA256/состав/отсутствие secrets. Два разных ZIP не должны иметь одну signature.

[Изолированная fixture и команды приёмки](tests/modx3/README.md). Project `cookie-consent-modx3-acceptance`, отдельные DB/volume/credentials/logs, loopback 18888/18889/18890. Старые MODX 2 fixtures не используются и не сбрасываются. Общие setting-mutating suites выполняются последовательно. Исторический reset helper отключён; runtime устанавливается через native Package Management.

Фактически принята 3.2.4-pl/PHP 8.1.34. Package requires ограничен `>=3.2.4,<3.3.0`; другие PHP/MODX versions, nginx/proxy/client hosting, полный CMS migration и тяжёлые failure/load cases ещё NOT RUN. Следующий этап — review и расширение release gates; GitHub Release/production deployment не выполнены.
