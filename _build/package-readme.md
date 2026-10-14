# Cookie Consent Manager

## RU — Инструкции и руководство

Cookie Consent Manager показывает настройки cookie, подключает сторонние сервисы после согласия посетителя и позволяет вести журнал согласий.

> Перед обновлением сделайте резервную копию базы данных, исходников элементов и журналов. Пакет заменяет код пяти элементов: CookiesPopup, CookieConsent, CookieConsentAssets, CookieConsentBanner и CookieConsentMap. Их ID, категории и параметры сохраняются.

### 1. Откройте настройки

После установки откройте «Компоненты → Cookie Consent Manager». Изменения применяются общей кнопкой «Сохранить».

### 2. Выберите категории и сервисы

На вкладке «Сервисы» отметьте «Показывать в настройках cookie» для нужных категорий. Видимость категории не зависит от количества сервисов; необходимые cookie всегда доступны. На новой установке необязательные категории и сервисы выключены.

Включите нужные сервисы и укажите принадлежащие вам ID. Для нескольких счётчиков используйте «Добавить ещё один счётчик». Тексты и переводы настраиваются во вкладке «Тексты».

При использовании GTM настройте consent checks для тегов внутри контейнера. Аналитические теги должны требовать analytics_storage: разрешение маркетинга само по себе не разрешает аналитику.

### 3. Настройте журнал согласий

В конце «Основных» выберите существующий доступный PHP каталог и нажмите «Сохранить». По умолчанию предлагается папка cache/logs/ в каталоге core MODX. Можно указать иной путь внутри сайта или абсолютный путь. Пустой путь выключает новые записи, сохраняя старые файлы. Если проверка каталога не пройдена, остальные корректные настройки сохраняются, а прежний рабочий путь остаётся.

Журналы могут содержать IP-адреса и технические сведения о посетителях. Ограничение HTTP-доступа к каталогу обеспечивает администратор сайта. Включайте журналы в резервные копии; сохраняйте их при ручной очистке всего core/cache/. Для просмотра, поиска и CSV откройте вкладку «Журнал».

### 4. Подключите компонент к шаблону

Вызовите Assets один раз в head, а Banner один раз перед закрытием body. Кнопку повторного открытия настроек разместите там, где удобно посетителям:

```html
<head>
    [[!CookieConsentAssets]]
</head>

<body>
    <!-- Содержимое страницы -->

    <button type="button" data-cookie-settings-open>
        Настройки cookie
    </button>

    [[!CookieConsentBanner]]
</body>
```

Альтернативный legacy-вариант — один прежний вызов CookieConsent. Не используйте оба способа одновременно и не повторяйте теги:

```modx
[[!CookieConsent]]
```

Удалите старые прямые подключения счётчиков, пикселей, GTM и noscript-пиксели, которые могут обходить согласие. CookieConsentMap используется для iframe-карт, onAllowed() — для собственных JavaScript-интеграций. Такие интеграции проверяйте отдельно.

### 5. Проверьте сайт перед публикацией

Очистите штатный кэш MODX и кэш HTML/CDN. Проверьте в новом профиле браузера отказ, каждую используемую категорию, сохранённый выбор после перезагрузки и отзыв через свою кнопку настроек. В Network не должно быть запросов неразрешённых сервисов.

Если журнал включён, проверьте реальное действие посетителя и соответствующую запись во вкладке «Журнал». Проверка каталога при сохранении не подтверждает получение браузерных событий. Сначала выполните приёмку на тестовом сайте; доставка в сторонние кабинеты требует действительных IDs.

Перед удалением пакета уберите его вызовы из шаблонов. Настройки, элементы и журналы сохраняются; полное удаление данных выполняется владельцем отдельно.

---

## EN — Instructions and guide

Cookie Consent Manager displays cookie preferences, loads third-party services after visitor consent and provides an optional consent audit log.

> Before upgrading, back up the database, element source files and consent logs. The package replaces the code of five elements: CookiesPopup, CookieConsent, CookieConsentAssets, CookieConsentBanner and CookieConsentMap. Their IDs, categories and properties are retained.

### 1. Open settings

After installation, open Extras → Cookie Consent Manager. Apply changes with the shared Save button.

### 2. Choose categories and services

On Services, select Show in cookie settings for the categories you use. Visibility is independent of the number of services; necessary cookies are always available. Optional categories and services start disabled on a new installation.

Enable the required services and enter IDs owned by you. Use Add another counter for multiple instances. Configure texts and translations on Texts.

For GTM, configure consent checks for tags inside the container. Analytics tags must require analytics_storage: marketing consent alone does not grant analytics consent.

### 3. Configure consent logging

At the end of Main, choose an existing directory writable by PHP and click Save. The default suggestion is cache/logs/ under your MODX core directory. You may choose another site-relative or absolute path. An empty path stops new records while preserving old files. If directory validation fails, other valid settings are saved and the previous working path is retained.

Logs may contain IP addresses and technical visitor information. The site administrator must restrict HTTP access to the directory. Include logs in backups and preserve them before manually clearing all of core/cache/. Open Log to view, search and export CSV.

### 4. Connect the component to your template

Call Assets once in head and Banner once before the closing body tag. Place your settings opener where visitors can find it:

```html
<head>
    [[!CookieConsentAssets]]
</head>

<body>
    <!-- Page content -->

    <button type="button" data-cookie-settings-open>
        Cookie settings
    </button>

    [[!CookieConsentBanner]]
</body>
```

Alternatively, retain one legacy CookieConsent call. Never combine both integration methods or repeat the tags:

```modx
[[!CookieConsent]]
```

Remove old direct counter, pixel and GTM scripts and noscript pixels that could bypass consent. Use CookieConsentMap for iframe maps and onAllowed() for your own JavaScript integrations. Verify custom integrations separately.

### 5. Verify before publishing

Clear the normal MODX cache and HTML/CDN cache. In a new browser profile, test rejection, each category used, saved preferences after reload and withdrawal through your settings opener. Network must show no requests to services without permission.

If logging is enabled, perform a real visitor action and find its matching record on Log. The directory check on Save does not confirm browser event reception. Validate on a test site first; delivery to third-party accounts requires genuine IDs.

Before uninstalling, remove component calls from templates. Settings, elements and logs remain; the owner handles full data removal separately.
