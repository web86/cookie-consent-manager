# Cookie Consent Manager

## RU — Инструкции и руководство

Cookie Consent Manager показывает настройки cookie, подключает сторонние сервисы после согласия посетителя и позволяет вести журнал согласий.

> Перед обновлением сделайте резервную копию базы данных, исходников элементов и журналов. Пакет заменяет код пяти элементов: CookiesPopup, CookieConsent, CookieConsentAssets, CookieConsentBanner и CookieConsentMap. Их ID, категории и параметры сохраняются.

### 1. Откройте настройки

После установки откройте «Компоненты → Cookie Consent Manager». Изменения применяются общей кнопкой «Сохранить».

### 2. Выберите категории и сервисы

На вкладке «Сервисы» отметьте «Показывать в настройках cookie» для нужных категорий. Видимость категории не зависит от количества сервисов; необходимые cookie всегда доступны. На новой установке необязательные категории и сервисы выключены.

Нажмите «+ Добавить сервис» сверху вкладки: готовый адаптер или «+ Создать пользовательский сервис». При наличии сервиса перейдите к нему либо создайте дополнительный экземпляр с другим ID. Выберите любую необязательную категорию по реальному назначению, включите сервис и сохраните. Посетитель выбирает только категории: разрешение запускает все включённые сервисы группы. Изменение состава или назначения обновляет версию затронутой категории и требует нового выбора. Видимость включается отдельно.

Запуск любого сервиса требует только enabled и разрешений назначенной категории и экземпляра. Consent Mode рассчитывает права обработки отдельно. При использовании GTM настройте consent checks для тегов внутри контейнера. Аналитические теги должны требовать analytics_storage: разрешение маркетинга само по себе не разрешает аналитику.

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

### 5. Подключение JavaScript и категорийные согласия

API onAllowed(category, callback, options) поддерживает analytics, marketing и external_content. Без options проверяется только согласие на видимую категорию, даже если в ней нет сервисов. Включите «Показывать в настройках cookie» для такой категории. Индивидуальных разрешений сервисов нет.

Регистрируйте callback после инициализации публичного bundle. Он вызывается один раз для каждой регистрации после подтверждённого разрешения; действующее сохранённое согласие также запускает callback, включая позднюю регистрацию. Пример A — собственная интеграция категории:

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

custom-map.js — пример принадлежащего сайту модуля. Импорт не должен сам загружать сторонние API. initMap(stillAllowed) обязан проверять guard перед каждым внешним SDK/запросом и после каждой асинхронной операции, прежде чем продолжать работу. Отзыв или unsubscribe делают guard ложным и останавливают последующие действия; уже отправленные запросы отменить задним числом нельзя.

Пример B — привязка callback к включённому сервису. В B/C cmp — window.web86CookieConsent; регистрируйте их после инициализации, как в A. Для управляемого SDK используйте { service: «ключ_экземпляра» }, если экземпляр зарегистрирован. yandex здесь — key, который может отличаться от loader: нужен включённый, настроенный экземпляр той же категории с разрешённой назначенной категорией. Параметр service проверяет существование и включение сервиса, а не отдельное согласие.

```javascript
cmp.onAllowed('analytics', function (stillAllowed) {
    if (!stillAllowed()) return;

    // Пользовательская логика разрешённого экземпляра Яндекс.Метрики.
}, { service: 'yandex' });
```

Пример C — onAllowed возвращает unsubscribe. Его можно вызвать, когда интеграция больше не нужна. Это отменяет ожидающий callback и делает переданный ему stillAllowed() ложным; уже загруженные скрипты и прошедшую сетевую активность unsubscribe не удаляет.

```javascript
const unsubscribe = cmp.onAllowed('external_content', function (stillAllowed) {
    if (!stillAllowed()) return;
    // Запустить разрешённую интеграцию.
});

// Когда интеграция больше не нужна:
unsubscribe();
```

Для простого локального JS используйте «+ Добавить сервис → + Создать пользовательский сервис». Укажите название, назначение, категорию и путь от корня сайта, например /assets/js/integrations/bitrix24.js, с учётом фактического assets_url. Сам файл подготавливает программист: до согласия он не запрашивается; после разрешения загружается один раз. Изменение пути, категории или назначения обновляет версию затронутой категории и требует нового согласия на категорию. Общий и индивидуальные тексты заглушек карт редактируются во вкладке «Тексты», {provider} подставляет имя карты. Исходный код готовых адаптеров: assets/js/cookie-consent/provider-registry.js, функция start(); публичный bundle собирается через npm run build:frontend. Не редактируйте минифицированный bundle вручную.

Отзыв сразу блокирует штатные загрузчики и consent guards, затем перезагружает страницу. Уже выполненный произвольный JS и отправленные им запросы нельзя отменить автоматически. Для SDK с асинхронным жизненным циклом используйте wrapper с onAllowed и stillAllowed(). Это управление согласием, а не sandbox или замена CSP. В Network проверьте отказ, разрешение, reload и отзыв; действующий сохранённый выбор не должен вызывать лишних запросов. Таблица журнала показывает МСК (UTC+03:00), детали и CSV остаются UTC.

Карты используют ту же модель категорий. Кнопка карты открывает настройки, ничего не разрешает сама; после выбора категории запускаются все её включённые сервисы. Новый выбор хранится как categories_v2 без providers. Новый аудит schema 3 не содержит индивидуальных разрешений; прежние schema 1/2 остаются читаемыми и не переписываются.

### 6. Проверьте сайт перед публикацией

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

Click + Add service at the top: choose an adapter or + Create custom service. Open an existing instance or create another with a different ID. Assign any optional category according to the actual purpose, enable and Save. Visitors choose only categories: permission launches every enabled service in the category. Changes to processing composition or purpose update affected category versions and require a new choice. Enable category visibility separately.

Every service launches only when enabled and its assigned category and instance are permitted. Consent Mode calculates processing rights separately. For GTM, configure consent checks for tags inside the container. Analytics tags must require analytics_storage: marketing consent alone does not grant analytics consent.

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

### 5. JavaScript and category consent

The onAllowed(category, callback, options) API supports analytics, marketing and external_content. Without options it checks only permission for a visible category, even when no services are registered in it. Enable Show in cookie settings for that category. There are no individual service permissions.

Register callbacks after the public bundle initializes. Each registration runs once after confirmed permission; valid restored consent also triggers it, including late registrations. Example A — a category-based custom integration:

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

custom-map.js is an illustrative website-owned module. Importing it must not automatically load third-party APIs. initMap(stillAllowed) must check the guard before each external SDK/request and after every asynchronous operation before continuing. Revocation or unsubscribe makes the guard false and prevents subsequent work; already-dispatched requests cannot be undone.

Example B — a callback bound to an enabled service. In B/C, cmp is window.web86CookieConsent; register after initialization as in A. For controlled SDKs, use { service: "instance_key" } when an instance is registered. Here yandex is an instance key, which can differ from its loader: an enabled, configured instance in the same category with an allowed assigned category is required. The service option checks existence and enabling, not separate consent.

```javascript
cmp.onAllowed('analytics', function (stillAllowed) {
    if (!stillAllowed()) return;

    // Custom logic for an approved Yandex.Metrika instance.
}, { service: 'yandex' });
```

Example C — onAllowed returns unsubscribe. Call it when the integration is no longer needed. It cancels a pending callback and makes its stillAllowed() guard false; it does not remove scripts already loaded or reverse previous network activity.

```javascript
const unsubscribe = cmp.onAllowed('external_content', function (stillAllowed) {
    if (!stillAllowed()) return;
    // Start the approved integration.
});

// When the integration is no longer needed:
unsubscribe();
```

For a local JS file, use + Add service → + Create custom service. Enter its name, purpose, category and a root-relative path such as /assets/js/integrations/bitrix24.js using the actual assets_url. A developer prepares the file: no request before consent; one load after permission. Changing path, category or purpose updates affected category versions and requires new category consent. Edit general and per-map placeholder texts in Texts; {provider} inserts the map name. Ready adapters live in assets/js/cookie-consent/provider-registry.js, start(); build with npm run build:frontend. Do not edit the minified bundle manually.

Withdrawal blocks managed loaders and consent guards immediately, then reloads the page. Already executed arbitrary JS and previously dispatched requests cannot be undone automatically. Use an onAllowed/stillAllowed wrapper for asynchronous SDK lifecycles. Consent management is not a sandbox or a CSP replacement. Verify rejection, permission, reload and withdrawal in Network. The audit table displays Moscow time (UTC+03:00); details and CSV remain UTC.

Maps use the same category model. Their button opens preferences and never grants permission itself; selecting a category launches all its enabled services. New choices use categories_v2 without providers. New audit schema 3 omits individual permissions; historical schemas 1/2 remain readable and unchanged.

### 6. Verify before publishing

Clear the normal MODX cache and HTML/CDN cache. In a new browser profile, test rejection, each category used, saved preferences after reload and withdrawal through your settings opener. Network must show no requests to services without permission.

If logging is enabled, perform a real visitor action and find its matching record on Log. The directory check on Save does not confirm browser event reception. Validate on a test site first; delivery to third-party accounts requires genuine IDs.

Before uninstalling, remove component calls from templates. Settings, elements and logs remain; the owner handles full data removal separately.
