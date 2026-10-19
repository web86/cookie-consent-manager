# CookieConsentManager

## RU — Инструкции и руководство

Краткая инструкция по настройке CookieConsentManager. Откройте «Компоненты → CookieConsentManager», выберите категории и сервисы, затем нажмите «Сохранить». Посетители выбирают категории, а не отдельные сервисы.

> Важно: в Legacy-режиме сторонние сервисы могут запускаться до согласия посетителя. Включайте его только после проверки требований к конфиденциальности для вашего сайта.

### 1. Два режима работы

Строгий режим (по умолчанию): необязательные сервисы и карты ждут разрешения своей категории. Категории и сервисы включаются на вкладке «Сервисы», а доступные посетителю категории должны быть видимы в настройках cookie.

Legacy-режим: включите «Показывать старую кнопку „Принять“» на вкладке «Настройки». При первом посещении без сохранённого выбора включённые сервисы видимых категорий запускаются до клика. Кнопка «Принять» сохраняет согласие на все видимые категории, «Отклонить» — отказ. Сохранённые отказы, частичный выбор и устаревшее согласие не обходятся.

### 2. Подключение в шаблоне MODX

Добавьте [[!CookieConsentAssets]] один раз в <head>, а [[!CookieConsentBanner]] — один раз перед </body>. Кнопку открытия настроек можно разместить в любом удобном месте страницы:

```html
<head>
    [[!CookieConsentAssets]]
</head>
<body>
    <!-- Содержимое страницы -->
    <button type="button" data-cookie-settings-open>Настройки cookie</button>
    [[!CookieConsentBanner]]
</body>
```

Для старых шаблонов можно оставить один [[!CookieConsent]] вместо двух вызовов. Не используйте оба варианта одновременно. Уберите прямые подключения счётчиков и пикселей, которые обходят CMP.

Runtime находится в `assets/components/cookieconsentmanager/`, приватный код — в `core/components/cookieconsentmanager/`. Пути строятся от настроек MODX. Установщик создаёт `bootstrap.php` рядом с `audit.php` по фактическому `config.core.php`; перенесённые assets и core поддерживаются без ручных действий.

### 3. Как добавить свой JavaScript

Откройте «Сервисы» → «+ Добавить сервис» → «+ Создать пользовательский сервис». Укажите название, назначение, категорию и путь к .js-файлу, например /assets/js/my-widget.js, или полный HTTPS-адрес. Включите сервис, убедитесь, что категория видима, и сохраните настройки.

CMP сам загрузит файл, когда запуск разрешён выбранным режимом. Не вставляйте для этого же файла отдельный <script> в шаблон. Код и безопасность внешнего источника проверяет разработчик.

### 4. Как запустить собственный код через onAllowed()

Если нужно запускать собственный JavaScript программно, используйте onAllowed('категория', callback). В примере external_content — это категория; замените её на назначенную в настройках. Callback работает и в строгом, и в Legacy-режиме:

```javascript
document.addEventListener('DOMContentLoaded', function () {
    const cmp = window.web86CookieConsent;
    if (!cmp?.onAllowed) return;

    cmp.onAllowed('external_content', async function (stillAllowed) {
        if (!stillAllowed()) return;

        const module = await import('/assets/js/custom-map.js');
        if (!stillAllowed()) return;

        await module.initMap(stillAllowed);
    });
});
```

Метод stillAllowed() проверяет, разрешено ли продолжать работу; проверяйте его и после await. Файл custom-map.js — пример вашего модуля: он не должен сам запускать сторонние запросы при import. Можно указать { service: 'yandex_maps' }, чтобы дополнительно проверить включённый экземпляр с таким ключом и той же категорией (это не отдельное согласие).

### 5. Изменение JS-адаптеров

Адаптер — встроенный JavaScript, который подключает сервис с учётом разрешений посетителя. Путь указан в настройках сервиса рядом с «Исходный код адаптера». Измените этот файл на сервере и очистите кеш MODX в административной панели: CookieConsentManager автоматически обновит общий минифицированный JavaScript-файл.

Для принудительной пересборки откройте «Настройки → Дополнительные настройки → Сборка адаптеров → Пересобрать адаптеры». Здесь видны статус и время успешной сборки. При ошибке остаётся прежний рабочий файл: исправьте код или права записи и повторите. Отдельный JS-файл пользовательского сервиса в общую сборку не входит.

Обновление сохраняет изменённые файлы из services/ и не восстанавливает удалённые вами адаптеры. Если изменён и оригинал пакета, ваш вариант остаётся без автоматического слияния. Дополнительные файлы не включаются в сборку автоматически. При удалении обязательного исходника исправьте код или восстановите файл вручную: прежняя рабочая сборка продолжает обслуживать сайт.

Обновление переносит JS-файлы из старого services/ без изменения байтов и сохраняет историю SHA-256. Удалённые адаптеры не восстанавливаются. Конфликт разных файлов останавливает перенос без перезаписи. Очистка после успешной сборки удаляет только известные старые файлы с точным совпадением SHA-256; чужие и изменённые файлы сохраняются.

### 6. Видео и встраивания

В «Сервисах» включите YouTube, RUTUBE или VK Видео и назначьте видимую необязательную категорию. В Strict видео ждёт её разрешения. В Legacy действует политика режима: первый визит без сохранённого выбора может загрузить видео до клика; сохранённый отказ, частичный выбор и устаревшее согласие не обходятся.

В «Текстах» редактируются общий текст внешнего содержимого, отдельные тексты Google Maps и Яндекс Карт и единая кнопка «Настройки cookie». Шаблон {provider} подставляет название сервиса. Пустой индивидуальный текст карты использует общий. Пользовательские переводы сохраняются.

1. Через CookieConsentVideo. Замените ID своими. Для VK скопируйте значение src из официального «Поделиться → Код для встраивания», включая hash, если он выдан. Обычная ссылка на страницу VK не подходит; OWNER_ID и VIDEO_ID ниже замените числами.

```modx
[[!CookieConsentVideo? &provider=`youtube` &url=`https://youtu.be/M7lc1UVf-VE` &title=`YouTube`]]
[[!CookieConsentVideo? &provider=`rutube` &url=`https://rutube.ru/video/7716bd3e665725c3c008ae7ab4ff02e2/` &title=`RUTUBE`]]
[[!CookieConsentVideo? &provider=`vk_video` &url=`https://vkvideo.ru/video_ext.php?oid=-OWNER_ID&id=VIDEO_ID&hd=2` &title=`VK`]]
```

2. Через собственный template с iframe. Укажите ключ включённого сервиса; iframe остаётся инертным до разрешённого запуска. Для RUTUBE/VK замените ключ и iframe официальным кодом сервиса. Безопасность доверенного HTML обеспечивает разработчик.

```html
<div data-cc-embed="youtube">
  <template>
    <iframe src="https://www.youtube-nocookie.com/embed/M7lc1UVf-VE"
      title="YouTube" allowfullscreen></iframe>
  </template>
</div>
```

3. Через onAllowed для собственного плеера. Замените категорию и ключ сервиса на назначенные; модуль company-video.js не должен делать внешние запросы при import. Проверяйте stillAllowed() после await и внутри init перед запросами.

```javascript
document.addEventListener('DOMContentLoaded', function () {
    const cmp = window.web86CookieConsent;
    if (!cmp?.onAllowed) return;
    cmp.onAllowed('external_content', async function (stillAllowed) {
        if (!stillAllowed()) return;
        const module = await import('/assets/js/company-video.js');
        if (!stillAllowed()) return;
        await module.init(stillAllowed);
    }, { service: 'youtube' });
});
```

После AJAX-вставки template вызовите web86CookieConsent.mountEmbeds(root). Кнопка заглушки открывает настройки категории. Локальный poster загружается до выбора; внешний не загружается даже после согласия. aspectRatio задаёт пропорцию (16:9 по умолчанию, возможна 9:16), width — максимальную ширину в пикселях. height не отменяет адаптивную пропорцию. Проверенные HTML-примеры постеров, фиксированных размеров и адаптивной ширины — в docs/modx2-embed-display-examples.md.

---

## EN — Instructions and guide

A quick guide to CookieConsentManager. Open Extras → CookieConsentManager, choose categories and services, then click Save. Visitors consent to categories, not individual services.

> Important: in Legacy mode, third-party services may run before visitors give consent. Enable it only after checking the privacy requirements for your website.

### 1. Choose a mode

Strict mode (default): optional services and maps wait for permission for their category. Enable the categories and services you need on Services, and make the relevant categories visible in cookie settings.

Legacy mode: enable Show legacy Accept on Settings. On a first visit with no saved choice, enabled services in visible categories start before a click. Accept records consent for all visible categories; Reject records a refusal. Previously saved refusals, partial choices and outdated consent are not bypassed.

### 2. Add to your MODX template

Place [[!CookieConsentAssets]] once in <head>, and [[!CookieConsentBanner]] once before </body>. You can put the button for reopening preferences anywhere on the page:

```html
<head>
    [[!CookieConsentAssets]]
</head>
<body>
    <!-- Page content -->
    <button type="button" data-cookie-settings-open>Cookie settings</button>
    [[!CookieConsentBanner]]
</body>
```

Existing templates may keep a single [[!CookieConsent]] call instead of the two snippets. Never use both methods together. Remove direct counter and pixel scripts that bypass the CMP.

Runtime lives under `assets/components/cookieconsentmanager/`; private code remains under `core/components/cookieconsentmanager/`. The installer generates `bootstrap.php` beside `audit.php` from the actual `config.core.php`, including relocated assets and core, without extra setup.

### 3. Add your own JavaScript

Go to Services → + Add service → + Create custom service. Enter a name, purpose, category and a .js path such as /assets/js/my-widget.js, or a full HTTPS URL. Enable the service, make its category visible and Save.

The CMP loads the file when the selected mode permits it. Do not add a second <script> tag for the same file in your template. A developer is responsible for reviewing custom code and external sources.

### 4. Start custom code with onAllowed()

For code that you start yourself, register onAllowed('category', callback). In the example external_content is a category; replace it with the category you configured. The callback works in both Strict and Legacy modes:

```javascript
document.addEventListener('DOMContentLoaded', function () {
    const cmp = window.web86CookieConsent;
    if (!cmp?.onAllowed) return;

    cmp.onAllowed('external_content', async function (stillAllowed) {
        if (!stillAllowed()) return;

        const module = await import('/assets/js/custom-map.js');
        if (!stillAllowed()) return;

        await module.initMap(stillAllowed);
    });
});
```

stillAllowed() tells your code whether work may continue; check it again after await. custom-map.js is an example of your own module and must not start third-party requests merely from being imported. You may add { service: 'yandex_maps' } to also require an enabled instance with that key in the same category (not separate service consent).

### 5. Edit JS adapters

An adapter is built-in JavaScript that connects a service according to visitor permissions. Find its file path next to Adapter source in the service settings. Edit that file on the server, then clear the MODX cache in Manager: CookieConsentManager automatically updates the shared minified JavaScript file.

To force a rebuild, open Settings → Advanced settings → Adapters build → Rebuild adapters. This block shows the status and successful build time. A failed build keeps the previous working file: fix the code or write permissions and retry. A custom service’s separate JS file is not part of this shared build.

Updates retain edited files in services/ and do not restore adapters you deleted. If the package original also changed, your file is kept without an automatic merge. Extra files are not added to the bundle automatically. If a required input is missing, fix the code or restore the file manually; the previous working bundle continues serving the site.

Upgrades move user JS adapters unchanged and retain SHA-256 history. Deleted adapters stay deleted; conflicting destination files stop migration without overwriting either version. After a successful build, cleanup removes only exact known legacy hashes; unknown/changed files remain.

### 6. Videos and embeds

Enable YouTube, RUTUBE or VK Video in Services and assign a visible optional category. Strict waits for category permission. Legacy follows its mode policy: a first visit with no saved choice may load video before a click; saved refusals, partial choices and outdated consent are not bypassed.

Texts provides a shared external content message, separate Google Maps and Yandex Maps messages, and one “Cookie settings” button label. The {provider} token inserts the service name. An empty individual map text uses the common message. Custom translations are preserved.

1. Use CookieConsentVideo. Replace the sample IDs. For VK copy the src value from the official Share → Embed code, keeping hash if supplied. A regular VK page URL is not supported; replace OWNER_ID and VIDEO_ID below with numbers.

```modx
[[!CookieConsentVideo? &provider=`youtube` &url=`https://youtu.be/M7lc1UVf-VE` &title=`YouTube`]]
[[!CookieConsentVideo? &provider=`rutube` &url=`https://rutube.ru/video/7716bd3e665725c3c008ae7ab4ff02e2/` &title=`RUTUBE`]]
[[!CookieConsentVideo? &provider=`vk_video` &url=`https://vkvideo.ru/video_ext.php?oid=-OWNER_ID&id=VIDEO_ID&hd=2` &title=`VK`]]
```

2. Use your own template with an iframe. Set an enabled service key; the iframe stays inert until its mode permits loading. For RUTUBE/VK replace the key and iframe with the service’s official code. A developer is responsible for trusted HTML security.

```html
<div data-cc-embed="youtube">
  <template>
    <iframe src="https://www.youtube-nocookie.com/embed/M7lc1UVf-VE"
      title="YouTube" allowfullscreen></iframe>
  </template>
</div>
```

3. Use onAllowed for your own player. Use the assigned category and service key; your company-video.js module must not make external requests when imported. Check stillAllowed() after await and inside init before requests.

```javascript
document.addEventListener('DOMContentLoaded', function () {
    const cmp = window.web86CookieConsent;
    if (!cmp?.onAllowed) return;
    cmp.onAllowed('external_content', async function (stillAllowed) {
        if (!stillAllowed()) return;
        const module = await import('/assets/js/company-video.js');
        if (!stillAllowed()) return;
        await module.init(stillAllowed);
    }, { service: 'youtube' });
});
```

After inserting a template via AJAX call web86CookieConsent.mountEmbeds(root). The placeholder button opens category settings. A local poster loads before choice; an external poster is not fetched even after consent. aspectRatio sets the ratio (16:9 by default, also 9:16); width caps the pixel width. height does not override responsive sizing. Tested HTML examples for posters, fixed dimensions and responsive width are in docs/modx2-embed-display-examples.md.
