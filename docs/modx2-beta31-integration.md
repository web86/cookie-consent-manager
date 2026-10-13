# beta31 — VK Ads, Meta Pixel и ручное открытие настроек

Ветка `feature/modx2-frontend-bundle`, база beta30. [Приёмка и NOT RUN](modx2-beta31-acceptance.md). GO только для review; merge и deployment не выполнялись.

## RU: подключение и обновление

```html
<head>
    [[!CookieConsentAssets]]
</head>
<body>
    <!-- Контент сайта -->
    <footer>
        <button type="button" data-cookie-settings-open>Настройки cookie</button>
    </footer>
    [[!CookieConsentBanner]]
</body>
```

Assets и Banner вызываются каждый один раз. Старый `[[!CookieConsent]]` остаётся альтернативой; не смешивайте два способа. Компонент **не создаёт кнопку настроек автоматически**. Администратор выбирает место для собственного button/link с `data-cookie-settings-open`. Делегированный обработчик поддерживает и элементы, добавленные позже; кнопка работает после скрытия баннера. Также доступен `window.web86CookieConsent.openSettings()`.

Карты до разрешения остаются заглушками с кнопкой загрузки. Кнопки отзыва у iframe отсутствуют. Чтобы отозвать разрешение, откройте общие настройки и выключите «Внешний контент». Iframe удаляются сразу; после штатной перезагрузки снова отображаются заглушки. Согласие на загрузку сохраняется после reload. `map_allow`, схемы аудита и старые записи не менялись.

На чистой установке оба пикселя присутствуют в реестре выключенными, без ID. На существующих сайтах Manager предлагает новые выключенные карточки, не переписывая `cookie_consent.services` при установке/GET. Они сохраняются при обычном Save. Действующие параметры сервисов, тексты/HTML, выбранный журнал, keys и canonical IDs сохраняются. При исчерпании существующего лимита 32 services сначала освободите место вручную.

Добавьте числовой Pixel ID, включите сервис и Save. В «Добавить ещё один счётчик» доступны оба адаптера для дополнительных ID. Категория marketing показывается посетителю только при наличии включённого маркетингового сервиса; включение адаптера не предоставляет посетителю разрешение автоматически. Новые/изменённые ID привязаны к существующему fingerprint и требуют нового выбора. Параметры — только данные; SDK URL и произвольный JS не редактируются.

Перед upgrade сохраните DB, пользовательский runtime/static source и журналы. Установите transport через native MODX Package Manager на staging после review, очистите кэш MODX и жёстко перезагрузите Manager. Source пяти canonical элементов обновляется на месте, IDs/properties/category сохраняются; старый Registry не удаляется. **Добавьте свой opener в шаблоны**, где раньше использовалась автоматически созданная кнопка.

ZIP: `.local/release/cookieconsent-0.1.0-beta31.transport.zip`.

SHA256: `aff907145f3cec7a51cc072661fccdc80619477b82f37ae4b60bbb618fd87ec4`.

## Адаптеры и границы

VK использует тот же `top-fwz1.mail.ru/js/code.js`, что и Top.Mail.Ru, и очередь `_tmr` с ID, `pageView`, временем запуска. Shared SDK загружается один раз за страницу, события — отдельно по разрешённым ID. Нет noscript, pid, пользовательских идентификаторов или дополнительной обработки dataLayer. Analytics-only может загрузить эту общую библиотеку для разрешённого Mail.Ru с другим ID; VK event не отправляется. Совпадающие активные Mail.Ru/VK ID, в том числе разные написания с ведущими нулями, отклоняются PHP, frontend validator и Manager: аналитика и маркетинг не должны разделять один счётчик.

Meta использует стандартный fbq queue/callMethod и один `connect.facebook.net/en_US/fbevents.js` за страницу. Для каждого разрешённого ID: `set autoConfig false` перед `init`, затем ровно один `trackSingle(id, PageView)` после готовности SDK. Нет Advanced Matching arguments, CAPI opt-in, email/phone, ecommerce/dataLayer/form integration или custom events. `disablePushState` исключает автоматические события history navigation; adapter отправляет только собственный PageView. Идентичные ID не инициализируются/не трекаются дважды.

При отзыве Meta сразу получает `consent revoke`; pending init/grant commands удаляются, ожидающий SDK PageView не отправляется. Pending VK events также удаляются из ещё не обработанной очереди. Затем действует прежний reload после audit или timeout. Уже отправленный запрос нельзя отозвать; собственные новые события блокируются. Остаточные действия стороннего реального SDK требуют отдельной staging-проверки, не обещаются по mock-тестам.

Удалите отдельные Meta/VK scripts, noscript-пиксели, preconnect/prefetch и дублирующие настройки GTM. Компонент не контролирует произвольный код/пиксели, подключённые вне него. GTM запускается по согласию на маркетинг и собственному fingerprint независимо от аналитики и внешнего контента. До контейнера передаются denied defaults и отдельные состояния Consent Mode v2: analytics_storage соответствует аналитике, ad_storage/ad_user_data/ad_personalization — маркетингу. Маркетинг не разрешает аналитику. Отзыв обновляет состояния перед штатной перезагрузкой; после неё GTM блокируется. Новый или изменённый ID требует нового согласия.

**Настройте consent checks каждого тега внутри GTM.** Для аналитических тегов требуйте analytics_storage, для маркетинговых — соответствующие рекламные разрешения. Consent Mode не блокирует автоматически Custom HTML и сторонние теги; Google tags могут отправлять запросы без cookies даже в denied mode. Для полного запрета аналитических запросов используйте Additional Consent Checks → Require additional consent → analytics_storage. Не подключайте GTM отдельно от компонента. [Google: consent checks](https://support.google.com/tagmanager/answer/10718549?hl=en), [порядок consent commands до контейнера](https://developers.google.com/tag-platform/security/guides/consent).

API проверен по [официальному Meta template](https://github.com/facebook/GoogleTagManager-WebTemplate-For-FacebookPixel/blob/457a9e0c6d0a2288375e33a49f61756257158e63/template.tpl): queue/callMethod, consent, autoConfig и per-ID tracking. [Get started](https://developers.facebook.com/docs/meta-pixel/get-started/) запрошен, но сервер документации вернул HTTP 429; доступность этой страницы не выдана за успешное чтение. Ни CAPI, ни другие дополнительные возможности шаблона не перенесены.

## EN: integration and settings access

```html
<head>[[!CookieConsentAssets]]</head>
<body>
    <!-- Your page content -->
    <footer><a href="#cookie-preferences" data-cookie-settings-open>Cookie settings</a></footer>
    [[!CookieConsentBanner]]
</body>
```

Call each snippet once, or keep legacy `[[!CookieConsent]]` as an alternative. Do not mix them. No launcher is generated automatically: add your own button/link wherever appropriate, including after consent has been saved. Dynamically inserted openers also work. The programmatic API is `window.web86CookieConsent.openSettings()`.

Maps retain the initial placeholder/load button and saved permission. Revoke map permission in general Cookie settings by disabling External content; frames are removed and placeholders return after reload. There is no per-map revoke control.

Enable VK Ads or Meta Pixel in Services, enter a numeric Pixel ID and Save. Both are disabled by default and belong to Marketing. Extra instances use Add another counter. Never use the same active ID for analytics Mail.Ru and marketing VK; this conflict is rejected. Pixel SDKs/events are gated by matching category/provider consent, and added/changed IDs do not inherit old grants. Remove standalone tracker/GTM duplicates. Meta delivery to an actual account has **NOT RUN** status.

## Ручной тест VK с настоящим ID владельца — NOT RUN автоматически

1. Владелец создаёт пиксель в VK Рекламе и предоставляет его действительный ID для своей staging-копии. Проверяет принадлежность пикселя/домена. Вымышленные ID для реальной доставки не использовать.
2. Удалить standalone VK/Mail.Ru/GTM duplicates. В Manager включить VK, записать свой ID и Save, проверить поле после reload. Если Mail.Ru активен, выбрать другой ID или отключить его.
3. В новой browser session очистить только consent storage сайта. В DevTools Network до выбора и после Reject проверить отсутствие VK events/SDK; если отдельный Mail.Ru разрешён, проверить его отдельный ID в shared SDK queue.
4. При analytics-only VK event должен отсутствовать. Разрешить Marketing: проверить SDK один раз и `_tmr` pageView с правильным ID, без pid/user IDs. Не делать дополнительные ручные `_tmr.push` при проверке.
5. Проверить событие в кабинете VK с учётом обработки/задержки платформы, blockers и network policy. Только владелец может подтвердить реальную доставку.
6. Отозвать Marketing через свой opener, дождаться reload: новые VK events отсутствуют. Повторить разрешение; проверить одно событие за новую инициализацию страницы. Поменять ID на другой действительный owner pixel и убедиться, что старое согласие не запускает его автоматически.
7. Проверить соответствующий event_id ACK в месячном JSONL и Audit Viewer. Сохранить результаты PASS/FAIL, реальные network evidence и подтверждение кабинета отдельно от автоматической mock-приёмки.

## Локальные автоматические проверки

```sh
node _build/transport.mjs /var/www/html /opt/cc-private/new-beta31-build 31
python3 _build/normalize.py .local/private/new-beta31-build/cookieconsent-0.1.0-beta31.transport.zip
# Скопировать ZIP и inventory в .local/artifacts.
CC_INSTALL_SERVICES=web node tests/transport/install-current.mjs
node tests/beta31/pixels.mjs
node tests/beta31/manager.mjs
python3 tests/transport/reset.py clean publiccore
node tests/beta31/native.mjs
node tests/browser.mjs
node tests/live-guard.mjs
node tests/provider-parameters.mjs
node tests/manager-i18n.mjs
node tests/beta26/frontend.mjs
node tests/beta28/localization.mjs
node tests/viewer/browser.mjs
node tests/http.mjs
```

Все fake-ID SDK/pixel requests перехвачены контролируемыми ответами. Реальный receiver/JSONL работают локально. Tests main, меняющие settings, запускаются последовательно. Native reset архивирует только disposable fixtures. Immutable ZIP не перезаписывается.

## Real GTM acceptance

Owner container GTM-WJD8XJD6 publishes a Custom HTML tag incrementing window.__ccGtmTest. Tests download the real container on local MODX and intercept all other external requests. Published version 2 has no analytics tag: separate actual analytics-tag acceptance is NOT RUN until the owner publishes a test tag with consent checks. Tests do not change the GTM workspace.
