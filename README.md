# Cookie Consent Manager для MODX Revolution 2

Согласие по категориям и отдельным сервисам, безопасные заглушки карт, серверный PHP-аудит с поддержкой старых JSONL и новых файлов с текстовым заголовком. Реализация и приёмка рассчитаны на **MODX 2.8.8, PHP ≥8.1**, same-origin endpoint и существующий каталог журналов внутри или вне webroot. HTTP-доступ к журналам ограничивает владелец сайта; компонент не создаёт `.htaccess` и не выполняет HTTP probes. Основная проверенная конфигурация — локальный mock. Актуальная установка, canonical update и SSR: [beta21](docs/modx2-canonical-elements.md); [Viewer](docs/modx2-consent-audit-viewer.md), [приёмка beta21](docs/modx2-canonical-elements-acceptance.md). Историческая настройка журналов: [beta15](docs/modx2-log-policy-acceptance.md). Историческая матрица: [отчёт](docs/modx2-m2-maps-acceptance.md). Это не подтверждение безопасности произвольного GTM-контейнера или готовности любого существующего сайта к live-запуску.

## Состав

- `CookiesPopup.html` — чанк баннера, четыре совместимых переключателя кнопок.
- `assets/js/cookie-consent/provider-registry.js` — проверка реестра, адаптеры Yandex/Mail.Ru/GA4/GTM/Ads, карты, host patterns.
- `assets/js/cookie-consent/consent-manager.js` — UI, отдельные разрешения, 90-дневное хранение, отзыв, аудит.
- `assets/css/cookie-consent.css`, `assets/scss/cookie-consent.scss` — стили, прокрутка настроек на небольших экранах.
- `assets/js/cookie-consent/mock/` — исключительно first-party имитации; `demo.html` — автономное демо без PHP-аудита.
- `server/src/`, `server/public/audit.php` — приватный серверный код; `server/modx2-public-endpoint.example.php` — публичный wrapper.
- `server/bin/install-modx2.php` — CLI установка/обновление системных настроек без перезаписи выбранных администратором значений.
- `server/modx2-registry-snippet.php` — сниппет вывода проверенной публичной конфигурации.
- `tests/local/` — отдельный настоящий MODX 2.8.8 + MariaDB + Apache/PHP, публикация только на loopback.

Старые `analytics.js` и `marketing.js` оставлены для совместимости исходников M1. При установке нового реестра **подключайте только provider-registry.js и consent-manager.js**; одновременное подключение прежних адаптеров и прямых счётчиков нарушает контроль загрузки.

## Нативный transport для MODX 2

Предпочтительная установка/обновление — через настоящий Package Manager: [инструкция transport](docs/modx2-transport-package.md), [архитектура](docs/modx2-transport-architecture.md), [актуальная native приёмка](docs/modx2-native-minimal-acceptance.md). Private beta сохраняет пользовательские settings/elements и JSONL; fresh install выключает все необязательные сервисы. Аудит нужно явно настроить приватно, включая JSON-вариант для shared hosting без environment variables.

## Ручная установка на тестовый MODX 2 (прежний workflow)

1. Сделать резервную копию шаблона, чанка CookiesPopup, старого JS и системных настроек. Для первой установки использовать отдельную тестовую копию сайта. Основной MODX core и код компонента разместить вне DOCUMENT_ROOT. Защитить также конфиг MODX/БД и доступ к Manager. Пример:

   - DOCUMENT_ROOT: `/srv/example/public`
   - MODX_CORE_PATH: `/srv/example/private/modx-core/`
   - серверный код: `/srv/example/private/modx-core/components/cookieconsent/{src,public}`
   - логи: `/srv/example/private/cookie-consent-logs`
   - приватный конфиг: `/srv/example/private/cookie-consent-config.php`

   Эти пути — примеры, не готовые значения для вашего сервера. Перенос core требует штатной настройки config.core.php у MODX; установка компонента сама core не переносит. В fixture это выполняется до установки MODX.

2. Создать приватный **существующий канонический** каталог логов, доступный пользователю PHP. На Linux, например:

   ```sh
   install -d -m 0700 -o www-data -g www-data /srv/example/private/cookie-consent-logs
   ```

   Настройка принимает абсолютный реальный путь без симлинков и `..`, вне webroot. Каталог не создаётся автоматически по HTTP. Небезопасное, пустое, относительное или недоступное значение вызывает HTTP 503; публичного fallback нет.

3. Скопировать `server/src/*.php` в `MODX_CORE_PATH/components/cookieconsent/src/`, `server/public/audit.php` — в `components/cookieconsent/public/`. Запустить из checkout:

   ```sh
   php server/bin/install-modx2.php /srv/example/public /srv/example/private/cookie-consent-logs
   ```

   Будут созданы namespace `cookie_consent` и только отсутствующие настройки:

   | Настройка | xtype | Значение |
   |---|---|---|
   | `cookie_consent.log_dir` | textfield | канонический приватный каталог |
   | `cookie_consent.services` | textarea | валидированный реестр JSON |

   Также создаются только отсутствующие `cookie_consent.options`, `cookie_consent.texts` и `cookie_consent.audit_config_file`. Повторная установка сохраняет существующие значения. Изменить каталог или состав сервисов можно в **MODX Manager → System Settings → namespace cookie_consent**. Реестр описан в [service-registry.md](docs/service-registry.md). Некорректный реестр блокируется целиком; после исправления обновить страницу.

4. Создать приватный конфиг по `server/config.example.php`: точный origin, без завершающего `/`, случайный секрет минимум 32 символа (например, `php -r 'echo bin2hex(random_bytes(32));'`), стандартный лимит 60 событий/IP/мин. **log_dir в конфиг не добавлять**: источник только системная настройка. Ограничить права конфигурации; пользователю PHP нужен read. Настроить в окружении Apache/FPM:

   ```text
   COOKIE_CONSENT_AUDIT_CONFIG=/srv/example/private/cookie-consent-config.php
   ```

   Публичный audit endpoint не принимает путь через URL/POST; настройка пути выполняется только оператором или через авторизованный CMP. FPM должен пропускать эту env-переменную в пул. После обновления приватного PHP-конфига учитывать OPcache/reload пула.

5. Разместить `server/modx2-public-endpoint.example.php` как `/assets/components/cookieconsent/audit.php`. Относительный путь `dirname(__DIR__,3).'/index.php'` рассчитан именно на эту глубину. Wrapper включает MODX_API_MODE, читает **modSystemSetting** и удаляет bootstrap-output перед JSON. Если структура core отличается, адаптировать приватные include-пути.

6. Создать сниппет `CookieConsentRegistry` из `server/modx2-registry-snippet.php`, **без открывающего `<?php`**. Заменить чанк CookiesPopup на `CookiesPopup.html`. Подключить после чанка (или в head с defer), именно в этом порядке:

   ```html
   <link rel="stylesheet" href="/assets/css/cookie-consent.css">
   [[!CookieConsentRegistry]]
   <script src="/assets/js/cookie-consent/i18n.js" defer></script>
   <script src="/assets/js/cookie-consent/provider-registry.js" defer></script>
   <script src="/assets/js/cookie-consent/consent-manager.js" defer></script>
   ```

   Не кэшировать HTML конфигурации/сниппет внешним page cache без инвалидирования при изменении настроек. В live отсутствие реестра запрещает сервисы. Standalone mock без сниппета использует локальные demo defaults.

7. Удалить старые прямые скрипты счётчиков, GTM, `noscript`-пиксели, `window.onload` для ClientID и любые preconnect/prefetch внешних сервисов. В формах ClientID остаётся необязательным: отсутствие аналитики не мешает отправке. Установочные ID Yandex `23643118` и Mail.Ru `3265404` сохранены для совместимости; проверять принадлежность перед live. GA4/GTM/Ads изначально disabled.

8. Оставить `data-cc-mode="mock"` и настроить аудит `/assets/components/cookieconsent/audit.php`. Map embeds заменить на инертные `div data-cc-map-provider/data-cc-map-src`; полные примеры и allowlist в [реестре](docs/service-registry.md). Для mock используются локальные HTML-карты. Не оставлять исходный iframe с src: браузер запрашивает его до выполнения consent JS.

9. Добавить постоянный доступ к настройкам в футер:

   ```html
   <button type="button" data-cookie-settings-open>Настройки cookie</button>
   ```

   Кнопки «Отклонить», «Настроить», «Принять все» и «Принять» сохраняют настройки `data-cc-show-{reject,configure,accept-all,accept}`. `1` показывает, `0` скрывает; legacy accept включён только при `1`. Если все четыре скрыты, показывается «Настроить». «Принять все» и legacy accept разрешают также внешние карты, как явно описано в тексте баннера. Necessary locked.

10. Проверить баннер → committed event → только выбранные mock-загрузки → POST 200 → JSONL в каталоге настройки. Затем все остальные проверки отчёта. Live-переключение выполнять только после проверки всех шаблонов, CSP, реальных адаптеров с тестовыми учётными записями и GTM-контейнера; рабочий deployment требует отдельного решения владельца сайта.

## Состояние, миграция и отзыв

`localStorage.web86_cookie_consent` хранит version, necessary, analytics, marketing, external_content, providers (разрешённые fingerprint), savedAt и случайный consentId. По умолчанию срок 90 дней, настраивается `data-cc-ttl-days` (1–3650); по истечении срока или при смене `data-cc-policy-version` новые загрузки при навигации блокируются до выбора. Служебный ключ `web86_cookie_consent_id` сохраняет identity между draft, reload и окончательным выбором. IP не используется как consent identity. Блокировка localStorage означает, что выбор может не пережить reload.

Для миграции с `popup_yurist` удалить старый обработчик, прямые счётчики и пиксели. Его значение **не является согласием** и новым менеджером не читается. Старые предпочтения M2 без per-provider permissions не разрешают новые сервисы. Попросить новый выбор через ссылку настроек либо поднять policy version. Не превращать архивные события schema 1 в разрешения карт.

Draft клики записываются отдельно от committed действий; загрузки запускаются только после committed. «Загрузить карту» даёт разрешение лишь одному провайдеру карт; analytic/marketing не меняются. Разрешение распространяется на все embeds этого провайдера. Отзыв карты удаляет iframe сразу, затем выполняется reload после ответа аудита или таймаута 900 мс. Для других SDK reload прекращает текущий документ; старые SDK могут работать во время этого короткого ожидания. Нельзя отменить ранее отправленные запросы или гарантированно удалить сторонние cookies; автоматическая очистка всех third-party cookies не реализована. В уже открытой вкладке изменение server settings/TTL само SDK не выгружает: применяется при следующей навигации/выборе.

## PHP-аудит и приватность

Каждый месяц UTC создаётся `YYYY-MM-cookie-consent.log`, файлы 0600, каталог 0700. **Автоудаления нет**, `prune.php` отсутствует, архивы не перемещаются/не переписываются при смене log_dir. Переход на другую настройку только направляет новые записи в новый каталог. Настройка лимитера хранится отдельно в `.rate/state.json`, старые записи временного replay-state удаляются из него через 5 минут; это не затрагивает аудит.

PHP записывает server UTC, REMOTE_ADDR, очищенный и ограниченный 512 байт User-Agent, event_id, consent_id, stage, категории, policy version и pathname без query/fragment. Клиентские IP/UA и неожиданные поля не принимаются. Не доверяет X-Forwarded-For. За proxy REMOTE_ADDR обычно содержит IP proxy; отдельную доверенную настройку proxy делать на уровне webserver с точным allowlist адресов. Ротация секретного HMAC-ключа меняет rate bucket identity; журналы от неё не удаляются.

Origin обязателен и должен совпасть с приватным site_origin; Fetch Metadata допускает same-origin либо отсутствие, но не same-site/cross-site. POST JSON максимум 8192 байта. Дубликат event_id по всем IP в 5-минутном окне получает 409; превышение лимита — 429/Retry-After:60; ошибки записи/пути — 503, **не 200**. JSONL append и limiter защищены файловыми flock, запись проверяется полностью. Частично записанная новая строка при обнаруженной ошибке откатывается к прежней длине файла. Событие резервируется до append: после 503 повторить действие с новым event_id; тот же ID может получить 409. При сбое питания между состоянием лимитера и логом нет гарантии транзакционной durability; для более строгого аудита нужен транзакционный backend.

Формат schema 2 сохраняет совместимость чтения schema 1: старые строки не меняются. Аудит — утверждение недоверенного клиента, а не криптографическое доказательство личности/согласия. Сервер не проверяет подлинность пользовательского клика. IP/UA и даже путь страницы могут содержать персональные данные; ограничить доступ к журналам/бэкапам и отразить фактическую обработку в политике. Consent Audit Viewer для форм автоматически не интегрирован.

## Локальная воспроизводимая приёмка

Нужны Docker Compose, Python 3, curl, Node 22 и Playwright. Команды из корня checkout:

```sh
bash tests/local/setup.sh
npm ci
npx playwright install chromium
npm run test:browser
npm run test:http
node tests/live-guard.mjs
node tests/manager.mjs
docker compose --env-file .local/private/compose.env -f tests/local/compose.yaml exec -T -u www-data web php /opt/cc-source/tests/php.php
```

Запускать наборы последовательно: часть тестов временно изменяет настройки **только fixture** и восстанавливает их. Стенд использует лимит 10000/мин для матрицы; тест лимитера отдельно проверяет 1/мин. Реальный default продукта остаётся 60/мин. При проблеме доверия npm TLS настроить корректное CA-хранилище Node или `NODE_EXTRA_CA_CERTS`; не отключать TLS-проверку. В среде приёмки использован проверенный SHA512 cache пакетов и `npm ci --offline --ignore-scripts --cache .local/npm-cache` из-за проблемы цепочки CA Node; lockfile переносимый, без путей локального runtime.

Результаты JSON/HAR/screenshots сохраняются в игнорируемом `.local/evidence/`; конфиги, БД и секреты — `.local/private/`/Docker volume и не коммитятся. Live-guard перехватывает каждый внешний запрос и отвечает локальным stub, не обращаясь к Google/Yandex/Mail.Ru. Он проверяет URL и consent gate, а не реальные SDK/контейнеры. Standalone демо без сервера: `php -S 127.0.0.1:8000`, затем `/demo.html`; там аудит отключён и никакого подтверждения серверной записи нет.

Остановить локальный стенд, сохранив БД и журналы:

```sh
docker compose --env-file .local/private/compose.env -f tests/local/compose.yaml stop
```

Рабочий сайт этим проектом/приёмкой не разворачивается автоматически.

## Административная страница MODX 2 и переводы

Новый milestone добавляет **Пакеты/Extras → Cookie Consent Manager** с вкладками «Основные», «Сервисы», «Тексты», «Журнал» и правым sandbox-предпросмотром. Подробная модель настроек, миграция fingerprint, безопасность и fallback: [архитектура Manager/i18n](docs/modx2-manager-architecture.md). Результаты: [новая приёмка](docs/modx2-manager-i18n-acceptance.md). Предыдущий отчёт выше сохранён как baseline, его числа не следует приписывать новому коду без повторного прогона.

Установка/обновление дополняет шаги предыдущей инструкции:

1. Скопировать `server/{src,public,controllers,templates,processors,lexicon}` в соответствующие каталоги `MODX_CORE_PATH/components/cookieconsent/`. Копировать `.class.php` processors, не создавать flat-file proxy. Код core по-прежнему приватный.
2. Скопировать `assets/components/cookieconsent/{manager.js,manager.css}` и `server/modx2-manager-connector.php` (как `connector.php`) в `/assets/components/cookieconsent/`; публичный `audit.php` оставить на прежнем пути.
3. Обновить `assets/js/cookie-consent/`, CSS/SCSS и сниппет CookieConsentRegistry из текущих исходников. Перед provider-registry подключить **i18n.js**, в таком порядке:

   ```html
   [[!CookieConsentRegistry]]
   <script src="/assets/js/cookie-consent/i18n.js" defer></script>
   <script src="/assets/js/cookie-consent/provider-registry.js" defer></script>
   <script src="/assets/js/cookie-consent/consent-manager.js" defer></script>
   ```

4. Повторить `php server/bin/install-modx2.php /absolute/public/root /absolute/private/logs`. Существующие services/log_dir сохраняются; создаются только отсутствующие options/texts, namespace/menu/permission. Новый компонент по умолчанию выключает **все** необязательные сервисы, включая Yandex/Mail/Maps. Это правило не сбрасывает существующие enabled значения при upgrade.
5. Очистить cache MODX и войти заново. Super User доступен автоматически; для обычного администратора добавить `cookie_consent_manage` в его назначенную mgr Access Policy. Это право не раздаётся всем пользователям. Публичным пользователям connector недоступен; MODAUTH/session проверки не отключать.
6. Сохранять форму по кнопке Save. Перед сохранением поля остаются local draft; preview получает очищенную копию. При ошибке формы draft не пропадает; при конфликте revision обновить страницу, предварительно сохранив необходимые введённые значения.

Журнал — справочная вкладка с безопасным path и объяснением. Viewer/search/export в этот milestone не входят. JSONL schema 1/2, consent_id, rate/replay и запрет auto-prune сохранены.

Язык посетителя определяется `cultureKey` текущего MODX context. Язык страницы Manager берётся из системного `manager_language`; переключатель языка preview не меняет язык сайта. Доступные языки берутся из MODX lexicon directories; безопасные custom culture codes также поддерживаются. Пользовательские переводы в `cookie_consent.texts`, не в PHP lexicon файлах, поэтому обновление их не перезаписывает. RU notice_html содержит исходный HTML клиента целиком. Для основного поля используется source textarea или уже загруженный совместимый CodeMirror, без WYSIWYG.

Legacy Accept отключает Configure/Accept all в effective configuration, сохраняя их прежние preferences. Reject независим. Постоянная settings ссылка остаётся; если шаблон не содержит opener, клиент добавляет кнопку. Включение сервиса в Manager не является согласием посетителя.

Fingerprint теперь независим от переводов: purpose_id + canonical effective privacy parameters. Название/описание можно переводить без нового согласия; Webvisor/ID/Google privacy flags требуют нового разрешения. Cosmetic show_title карты не влияет на согласие. Переход с fingerprint предыдущей ветки требует одного нового выбора per-provider, сохраняет consent_id и не меняет исторические журналы. При устаревшем разрешении баннер снова появляется, изменённый сервис остаётся заблокирован.

После установки повторить прежние тесты и новые:

```sh
node tests/manager-i18n.mjs
node tests/provider-parameters.mjs
docker compose --env-file .local/private/compose.env -f tests/local/compose.yaml exec -T -u www-data web php /opt/cc-source/tests/manager-i18n-php.php
```

Запускать последовательно на disposable fixture: интеграционный CMP-тест временно проверяет отсутствие/создание component settings, языки и draft values, затем восстанавливает snapshot. Screenshots и новые результаты находятся в `.local/manager-i18n-evidence/`; secrets и raw logs туда не публикуются. Native MODX chrome может использовать отдельные session/user language preferences; компонент по требованию использует именно системный manager_language.
