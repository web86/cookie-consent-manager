# beta26 — PHP localization и единый публичный bundle

Кандидат только для review; [приёмка и NOT RUN](modx2-beta26-acceptance.md). Основа — проверенная beta24 с единым локальным Save журнала. Merge/deployment не выполнялись.

## Контракт интеграции

Выберите **один** способ. Новый способ:

```html
<head>
  [[!CookieConsentAssets]]
</head>
<body>
  <!-- страница, включая footer и инертные карты -->
  [[!CookieConsentBanner]]
</body>
```

Каждый snippet вызывается **ровно один раз**: Assets в head, Banner перед `</body>`. Banner возвращает только готовую разметку, без регистрации файлов. Assets возвращает только JSON data/stylesheet/deferred bundle, без баннера. Оба independent fragments; штатный однократный вызов в cold/warm MODX cache проверен, включая Banner в footer. `defer`, не `async`, гарантирует, что HTML footer уже разобран к инициализации. Конфигурация находится перед script tag.

Альтернатива для существующих шаблонов:

```html
[[!CookieConsent]]
```

Legacy snippet сохраняет автоматическое подключение head assets и body banner через штатные методы MODX. Миграция шаблона не обязательна. **Нельзя использовать legacy одновременно с Assets/Banner или повторять новые tags.** Автоматического исправления неправильной интеграции нет. Одинаковые tags MODX подставляет как группу: подавление результата второго PHP вызова может убрать содержимое обоих. Поэтому новые snippets не имеют suppression flags, component не добавляет plugins/global event hooks и не переписывает страницу. Простая JS guard предотвращает повторную JS-инициализацию; это не ремонт дублированной разметки.

Live mode — default. Для изолированного mock стенда явно задайте mode баннера:

```html
[[!CookieConsentAssets]]
[[!CookieConsentBanner? &mode=`mock`]]
```

Или отдельно legacy `[[!CookieConsent? &mode=`mock`]]`. На рабочем сайте mock не включать. `CookieConsentMap` по-прежнему принимает reviewed Google/Yandex HTTPS embed URL и возвращает inert div/data; iframe src появляется только после отдельного matching provider grant. Для локальных tests используются first-party mock URLs; они не входят в executable bundle payload.

## Переводы и безопасность

`CookieConsentTexts::resolve()` читает контекстный cultureKey, stock RU/EN, base-language/requested-language overrides из `cookie_consent.texts`. PHP `CookieConsentBannerRenderer` создаёт все static banner headings/buttons/categories/ARIA/notice HTML. Manager Texts overrides не заменены простыми `[[%key]]`. HTML allowlist sanitizer сохранён; MODX/Fenom delimiters выводятся буквально через entity encoding. Пустые optional categories скрываются уже в SSR.

После JS initialization статические тексты/HTML/ARIA не переписываются. Public `cc-public-config` содержит только locale; полной `strings` коллекции и browser lexicon fetch нет. `cc-service-registry` сохраняет проверенные service descriptors, нужные текущему registry/fingerprint contract, без audit key/path/Manager data.

Для динамических элементов PHP отдаёт только необходимые части: reopen button template, templates **включённых** map providers с разрешёнными plain texts, 11 коротких runtime/map messages в hidden spans. JS клонирует готовый markup, привязывает handlers, создаёт/убирает iframe. Явный custom map title из безопасного data-attribute остаётся plain text; saved map/provider text overrides используются PHP. Minimal error messages не содержат notice/category/button dictionary. Хранение consent/migration/UUID/TTL/reconsent/fingerprint, strict GTM all-provider gate и audit payload/ACK не менялись.

## Сборка

Раздельные development sources: `runtime.js`, `provider-registry.js`, `consent-manager.js`, `assets/components/cookieconsentmanager3/css/cookie-consent.css`. Старые `i18n.js`/lexicons.json остаются историческими sources и не входят в новый transport production assets. Не подключайте их вместе с bundle. Исторический автономный `demo.html` не является приёмкой новой MODX integration; актуальный stand строится `tests/beta26/provision.php` на настоящем MODX.

Toolchain: esbuild **0.28.2**, exact dependency/package-lock integrity, Node 22.23.2 в приёмке. [Официальный transform/minify API](https://esbuild.github.io/api/#minify). Bundle состоит только из трёх публичных source modules, без Manager JS/CSS, vendor SDK implementations и mock fixture content. Reviewed adapters динамически запрашивают SDK после consent; их код и mock path routing сохранены. `document.currentScript.src` у classic deferred bundle даёт base JS directory без query, поэтому relative mock paths корректны.

```sh
npm ci
npm run build:frontend
php _build/build.php /absolute/MODX-root /new/build-directory
python3 _build/normalize.py /new/build-directory/cookieconsent-0.1.0-beta26.transport.zip
```

На локальном Docker stand `node _build/transport.mjs /var/www/html /opt/cc-private/new-build 26` **всегда** выполняет minification перед native builder. PHP builder проверяет `_build/frontend-manifest.json`: pinned tool version, source/tool/lock hashes и output hashes; stale bundle не допускается к упаковке. Во время MODX request минификации/Node/npm нет — только content hash существующих min files для cache busting.

Public production files:

- `assets/components/cookieconsentmanager3/js/cookie-consent/cookie-consent.min.js` — 17243 bytes, SHA256 `764d59ecd0492a8cae443f1c837050df7791c8a2c9da11cbf26c96813f1c7c5e`.
- `assets/components/cookieconsentmanager3/css/cookie-consent.min.css` — 3545 bytes, SHA256 `23bff258002e08e4520fdcf0c6105f46f8db5649d29d54e4f89f42f5924b5193`.

URLs содержат `?v=` с первыми 20 hex content hash: изменение bytes меняет cache key. Manager preview использует тот же min CSS. Transport runtime больше не подключает отдельные public development JS/lexicon/CSS files. Старые неиспользуемые файлы предыдущей установки не удаляются произвольно; убедитесь, что их прямые tags отсутствуют в шаблоне.

## Установка/обновление beta24 → beta26

Release ZIP: `.local/release/cookieconsent-0.1.0-beta26.transport.zip` относительно checkout.

```text
SHA256 d02c26f29354ba793843ee204a273c6eca2984b79c87762f8bc566ea98e79c4e
```

1. Backup DB/native private registry, settings/texts, элементы/static sources/templates/runtime и logs с `.rate/`. Сохраните beta24 ZIP и нужный native preserved snapshot до reinstall.
2. После review установите beta26 через настоящий MODX Package Manager на отдельную staging-копию. Metadata warning означает обновление canonical source на месте; old IDs/type/properties сохраняются. Добавляются постоянные `CookieConsentAssets` и `CookieConsentBanner`, без `*_package_VERSION` copies. Plugins/event bindings в пакете отсутствуют. Setup Options нет.
3. Existing `[[!CookieConsent]]` можно оставить. Для split integration замените его на один Assets в head и один Banner перед body end; не смешивайте и не дублируйте calls. Удалите прямые старые JS/CSS/analytics pixels вне component. Убедитесь, что используется один deferred public script и один stylesheet.
4. Обновите browser/CDN cache согласованно; content hash URLs проверены. Очистите штатный MODX cache. Проверьте RU/EN/additional locale overrides, literal delimiters, custom notice links, SSR с выключенным JS и dynamic map/load/revoke/error messages.
5. Проверьте visitor consent/refusal/reopen, отсутствие provider requests до grants, unchanged old consent IDs/fingerprints и отсутствие автоматического разрешения нового provider. Проверьте actual browser audit ACK/event_id и monthly record, Viewer/CSV/ACL.
6. Journal настройки beta24 остаются в конце Main и используют общий локальный Save без HTTP self-request. Fresh target-host default/core/cache handling и intentionally disabled paths сохраняются. [Инструкция журнала](modx2-beta24-upgrade.md).

Native vehicles сохраняют настройки/ключи/логи/элементы при uninstall; runtime files удаляются. Перед uninstall отключите template calls. Native rollback при произвольных DB/FS outages не обещается; используйте согласованный backup. [In-place canonical restore](modx2-canonical-elements.md) теперь также поддерживает новые постоянные snippet names, если snapshot для них существует.
