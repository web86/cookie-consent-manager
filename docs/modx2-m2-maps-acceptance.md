# MODX 2: M2 + реестр сервисов и карты — отчёт приёмки

Дата: **12 октября 2026**, Europe/Istanbul. Репозиторий: приватный `web86/cookie-consent-manager`. База: `main`, `7ef77d35b7b24f607bd73e433d46dd982c982ace`. Ветка: `feature/modx2-provider-registry-maps`. Рабочий сайт и его данные не использовались; deployment/merge в main не выполнялись.

Реализация и тестовые команды: коммит `aff3e80` (`feat(modx2): add consent provider registry and gated map embeds`). Отчёт и санитизированное evidence оформлены следующим отдельным коммитом документации.

## Рекомендация по выпуску

**Локальная интеграция готова к review и дальнейшей проверке на staging. Безусловное разрешение на production не выдаётся.** Реальный MODX 2.8.8, запись PHP-аудита, приватные журналы, mock-сетевые сценарии и ограничения загрузки подтверждены тестами. Сторонние SDK/аккаунты, реальный GTM-контейнер, весь набор рабочих шаблонов, cookies существующих провайдеров и CSP конкретного сайта не проверялись. Эти сценарии ниже явно отмечены **NOT RUN**, их нельзя считать PASS.

Точная инструкция установки и миграции: [README](../README.md). Схема настроек, адаптеры, карта allowlist, расширение и ограничения GTM: [service-registry.md](service-registry.md). Санитизированные результаты каждого автоматического сценария: [evidence/modx2-results.json](evidence/modx2-results.json).

## Стенд и воспроизводимость

- Настоящий официальный дистрибутив **MODX Revolution 2.8.8-pl**, CLI installation, реальные modResource/modTemplate/modSnippet и таблицы modSystemSetting.
- Официальный архив: `https://modx.s3.amazonaws.com/releases/2.8.8/modx-2.8.8-pl.zip`. SHA256 скачанного файла: `e2eca7e39406a379ae337ccc552d56c69eec0b37697218226a0bbfef50d072a0`. Это зафиксированный хеш использованного архива, не заявление о подписанной upstream-аттестации.
- Apache, **PHP 8.2.34**, MariaDB 10.6, Docker Compose project `cookie-consent-acceptance`; отдельная БД `cookie_consent_test`. Порт опубликован только как `127.0.0.1:8888:80`, БД не опубликована наружу.
- Webroot `/var/www/html`; MODX core `/opt/cc-private/core/`; конфиг `/opt/cc-private/config.php`; каталог логов `/opt/cc-private/logs`. Всё приватное находится вне webroot. Setup после установки вынесен из публичного каталога.
- Playwright **1.62.1**, Chromium, desktop default 1280×720 и mobile 390×844. Реальные HTTP-запросы к MODX/JS/PHP. Все mock-файлы same-origin. Каждый внешний запрос в mock блокируется маршрутом; в live-guard он полностью завершается локальной заглушкой до обращения к провайдеру.
- Инсталлятор настроек и публичный wrapper работают с настоящим MODX API, не с имитацией `$modx`. Проверено отсутствие bootstrap HTML в JSON-ответах и сохранение настроек при обновлении.
- Тестовые секреты случайные, находятся только в игнорируемой `.local/private/`. ID Yandex/Mail сохранены в defaults исходников, но в live-guard заменены тестовыми значениями; никаких production account/credentials/логов не использовано.
- Стресс-матрица использует fixture limit 10000/мин; отдельный HTTP-тест переключает его на 1/мин и проверяет 429. Стандартный продуктовый limit в config.example.php остаётся 60/мин.

Фактически исполненные команды, из корня checkout:

```sh
bash tests/local/setup.sh
npm ci --offline --ignore-scripts --cache .local/npm-cache
docker compose --env-file .local/private/compose.env -f tests/local/compose.yaml exec -T -u www-data web php /opt/cc-source/tests/php.php
node tests/http.mjs
node tests/browser.mjs
node tests/manager.mjs
node tests/live-guard.mjs
node tests/summarize.mjs
```

Node/npm не принимал цепочку CA этой среды; TLS-проверка не отключалась. Пакеты скачаны curl по HTTPS с публичного npm, SHA512 сравнен с metadata registry, затем установлены из локального cache через npm ci. Playwright сначала был доступен из bundled runtime; финальная матрица использует установленные пакеты из переносимого package-lock.json. В обычной среде достаточно `npm ci` и `npx playwright install chromium`.

## Изменения продукта

1. Установка namespace `cookie_consent`, `cookie_consent.log_dir` и `cookie_consent.services` через CLI. Existing admin values сохраняются. Сам компонент не переносит существующий MODX core автоматически.
2. Строгая schema реестра: уникальные keys, текстовые name/purpose, фиксированная категория адаптера, boolean enabled, проверенные ID/config. PHP и JS валидируют данные; произвольные JS/HTML/URL модулей не принимаются. При ошибке реестр пустой.
3. GA4, GTM и Ads реализованы отдельно, в defaults disabled. GTM требует всех включённых сервисов и трёх необязательных категорий; частичный выбор не запускает контейнер. Общая библиотека gtag грузится один раз; config выдаётся только выбранному Google-сервису.
4. Карты используют `external_content` и индивидуальные разрешения провайдеров. До выбора нет активного iframe, удалённого thumbnail, SDK, пикселя или иных внешних ресурсов карты. Исходная URL хранится только в data attribute и проверяется по allowlist. Заглушка, Load map, persistent revoke, normal page и существующий dialog поддержаны.
5. Necessary остаётся locked; все четыре кнопки сохранены. UI автоматически перечисляет enabled services. Добавление/изменение сервиса не наследует разрешение прежней конфигурации. Добавление существующего адаптера через Manager не требует правки JS; новый тип адаптера требует review кода.
6. Consent identity — случайный UUID, устойчивый между draft/reload/commit. `popup_yurist` игнорируется. M2 preference без provider permissions не включает новые сервисы. TTL/version проверяются при загрузке страницы.
7. JSONL schema 2 добавляет external_content/providers/целевой provider. Schema 1 продолжает приниматься и читаться, исторические файлы не меняются. Committed и draft разделены.
8. Публичный endpoint принимает только same-origin POST JSON; bootstrap-output очищается, секрет и log_dir не берутся из запроса. Все неудачные записи дают 503. Клиент считает аудит доставленным только при HTTP 200, `ok:true`, совпадающем event_id и server_time.
9. Каталог проверяется до файловых операций: существующий absolute/canonical/private/writable, без symlink/`..`/fallback. Файлы и limiter-state также проверяются против symlink/hardlink. Глобальный replay gate по event_id между IP, per-IP HMAC rate count, flock и проверка полного append. Обнаруженный partial new record откатывается к прежней длине; архива не касается.

## Проверенные gates

Итоговые точные количества assertion/scenario приведены в машинном evidence и итоговой сводке ниже. PASS означает фактически исполненный тест, в указанном режиме.

| Gate | Результат | Доказательство/границы |
|---|---|---|
| Реальный локальный MODX 2.8.8 → баннер → выбор → mock → PHP → JSONL | PASS | реальные resource/template/snippet/DB; audit HTTP 200 и разобранный JSONL |
| Первый визит, reject, save без выбора, draft без commit | PASS | нет mock provider loads, нет внешних network attempts, draft отдельно |
| Все 8 наборов analytics/marketing/external_content | PASS | точное множество запрошенных JS/HTML, reload и stable consent ID |
| Все 256 наборов восьми отдельных сервисов | PASS | provider powerset, точное множество mock-загрузок и сохранённых разрешений |
| Analytics only: Yandex/Mail/GA4/ClientID, без maps/marketing | PASS | локальные скрипты; `MOCK-CLIENT-23643118`; локальная тестовая форма отправляется без ClientID |
| Marketing only: Ads/marketing; GTM частично заблокирован | PASS | нет analytics/maps; GTM gate закрыт |
| Google Maps only и Yandex Maps only | PASS | только выбранный iframe provider; analytics/marketing false; разрешение сохраняется |
| Карты в normal page и существующем dialog | PASS | до выбора iframe отсутствует; отдельная кнопка; revoke удаляет iframe/reload |
| Accept all / legacy accept / revoke / revisit | PASS | загрузки после финального выбора; после revoke на reload отсутствуют |
| TTL expiry, policy mismatch, old M2, popup_yurist | PASS | новые провайдеры не получают старое/просроченное разрешение |
| Новые/disabled services из MODX setting | PASS | новый checkbox defaults off; disabled отсутствует в UI и network |
| Добавить/отключить через native Manager UI | PASS | authenticated updatefromgrid и изменение публичного UI; не CLI-имитация UI |
| Неавторизованная запись настроек MODX | PASS | connectors refused; реестр остался прежним |
| Admin HTML/JS/unsafe adapter/config | PASS | schema rejects; нет выполнения пользовательского HTML/JS |
| Private monthly path, IP/UA server derived, UTC | PASS | 0600; Origin POST; X-Forwarded-For не меняет IP; UA очищается/ограничивается |
| Method/content type/origin/fetch metadata/JSON/body/schema | PASS | 405/415/403/400/413 с JSON, без HTML bootstrap |
| Duplicate event_id / concurrent requests / rate limit | PASS | 409; двадцать конкурентных HTTP append; один из 8 replay POST — 200, остальные 409; 429/Retry-After:60 |
| Concurrent PHP processes и write failure | PASS | 20 независимых процессов; корректные полные JSONL; частичный fwrite симулирован stream wrapper |
| Invalid/private path, symlink, denied directory/file | PASS | 503, target/sentinel не изменены; нет публичного fallback |
| Старые журналы >180 дней при смене log_dir | PASS | синтетические архивные байты сохранены; новый файл только в новой настройке; prune отсутствует |
| Failed audit 503 и ложный 200 acknowledgement | PASS | delivery ok=false; выбор пользователя работает; успешная запись не заявляется |
| Mobile/keyboard/focus | PASS | 390px без горизонтального overflow, Enter/Escape, focus heading, доступ к scrollable Save; визуально просмотрен screenshot |
| Live URL/queue/gates с перехваченными ответами | PASS | только route fulfillment: исходные map query сохранены, GA/Ads config разделены, gtag once, GTM partial blocked |
| Реальная работа Google/Yandex/Mail SDK, Bitrix24-форм и live GTM tags | NOT RUN | намеренно не обращались к провайдерам; local stubs не подтверждают их поведение |
| Все рабочие шаблоны/плагины/формы и network на production | NOT RUN | рабочий сайт не предоставлен/не использовался |
| Ручная проверка screen reader, Firefox/WebKit, touch devices | NOT RUN | Chromium + keyboard + визуальная оценка mobile screenshot не заменяют эти проверки |
| Настоящий ENOSPC, crash/power loss, distributed filesystem | NOT RUN | fwrite failure simulated; не испытание потери питания или сетевой ФС |
| Переход месяца/года реальными часами, PHP 8.1/другие версии MODX | NOT RUN | тесты выполнялись в текущем UTC-месяце на PHP 8.2.34/MODX 2.8.8 |

## Сетевые доказательства и журналы

Индивидуальные HAR, screenshots и полные локальные результаты находятся в `.local/evidence/`, исключены из Git. Они содержат только fixture-трафик, но raw HAR не публикуется, чтобы не переносить cookies/служебные данные Manager. В репозиторий включены санитизированные **summaries каждого сценария**, имена mock-файлов, число requests, audit statuses, counts/assertions и образец JSONL с заменёнными IP/UA/UUID.

Основная категория analytics выдаёт `yandex.js`, `bitrix24-clientid.js`, `mailru.js`, `google_ga4.js`; marketing выдаёт `marketing.js`, `google_ads.js`; external_content — `google_maps.html`, `yandex_maps.html`. GTM mock появляется только при полном разрешении. При нулевом выборе выдаётся только first-party код менеджера, без mock provider files. В публичном mock нет ни одного внешнего network attempt.

Для live-guard проверены исходные адреса Google/Yandex iframe, GA4/Ads gtag URL и отдельные config-команды, одиночная gtag library, gated GTM URL, rejection URL injection и cross-origin audit-url (включая backslash form). **Все внешние URL исполнены локальными route.fulfill, фактических соединений с провайдерами не было**. Это PASS механизма ограничения загрузки, а не PASS реального поставщика.

MODX Manager при входе запрашивает `www.gravatar.com` для аватара администратора; оба запроса были abort в тесте. На публичном resource такого подключения нет. При необходимости отключить MODX `enable_gravatar` отдельно. Google Fonts и reCAPTCHA в исходниках проекта/тестовой публичной странице не обнаружены. Это не вывод об их отсутствии на рабочем сайте и не автоматическая классификация функциональных/защитных сервисов в analytics.

## Проблемы, исправления и ограничения

- В исходном `main` не было реестра/карт и реальной MODX-приёмки. Новый пакет добавляет их, сохраняя основные M2 поля и ID.
- Выявлено: строковая проверка audit-url `/...` не учитывала URL normalization/backslash. Теперь URL парсится и сравнивается фактический origin; malformed/cross-origin адрес не отправляет аудит.
- В исходном пути был mkdir до полной canonical validation; теперь HTTP не создаёт каталог и fail closed на небезопасных настройках. Проверки symlink/hardlink распространяются на log/state.
- Replay раньше был per-IP. Теперь один event_id блокируется между IP в общем 5-минутном окне; проверено unit-тестом со вторым IP. Per-IP rate identity остаётся HMAC; IP не является identity consent.
- HTTP 200 сам по себе раньше считался доставкой. Теперь требуется содержимое подтверждения, совпадающий event_id; ложный 200 проверен отдельно.
- Исправлены проблемы fixture: перенос core между bind mounts нельзя сделать rename; setup требует полного набора штатных констант; OPcache revalidation задерживает изменения приватного PHP config; проверка concurrent JSONL должна читать текущий месяц, не произвольный контрольный архив; live HTML replacement первоначально менял comment, а не banner mode. Неудачные промежуточные прогоны не выданы за успешные результаты.
- Во время конкурентного создания `.rate` был ожидаемый mkdir race warning; подавлен только этот warning, результат mkdir по-прежнему проверяется и при ошибке возвращается 503.
- Нельзя обеспечить безопасность произвольного GTM контейнера простым client-side флагом: нужен аудит всех тегов, Consent Initialization, Additional Consent Checks и исключение повторных прямых счётчиков. Непроверенный контейнер оставлять disabled. Хостовые шаблоны — metadata, не firewall для SDK.
- Данные аудита поступают от недоверенного клиента. Origin/UUID/limiter препятствуют некоторым ошибкам и browser cross-site spam, но не доказывают личность или факт клика; сторонний HTTP-клиент способен подделать Origin/UA. Отдельного криптографического consent receipt нет.
- Лимитер ограничивает валидные события и размер state/payload. Инфраструктурные лимиты body/timeouts/connection rate, защита ресурсоёмкого MODX bootstrap и trusted proxy policy остаются задачей webserver/hosting.
- При 503 событие может уже быть зарезервировано в replay state; для повторной попытки нужен новый event_id. Между limiter state и JSONL нет транзакции на случай питания/crash; настоящий ENOSPC/crash не испытан.
- При revoke SDK документа могут продолжать работу до reload (ожидание аудита ≤900 мс); карты удаляются синхронно. Ранее отправленные данные не отзываются. Полная очистка сторонних cookies/прошлых SDK effects не реализована.
- TTL и изменение server registry применяются при загрузке/выборе; уже открытая вкладка не отслеживает удалённые настройки непрерывно. Поздние AJAX map nodes автоматически не обрабатываются; в этой версии поддержаны embeds, существующие при инициализации.
- IP/UA/path и stable local UUID требуют контроля доступа/политики обработки. Автопуржа журналов нет; старые файлы не меняются. Произвольные forwarded headers не принимаются. Consent Audit Viewer формы ещё не интегрирован.

## Дальнейшая установка и live gates

1. Следовать README на отдельной копии MODX; создать приватный каталог и CLI settings; проверить права, API_MODE, exact origin/env и некэшируемый registry snippet.
2. Заменить popup_yurist/direct scripts/noscript и активные maps на inert markup; сохранить backups; поставить mode=mock.
3. Прогнать матрицу/HTTP-проверки, убедиться в committed JSONL по системной настройке, не переносить archival records в публичные каталоги.
4. Проверить каждый реальный template/плагин/form/modal, CSP, доступность и current provider settings; GTM container review обязателен перед enabled/live.
5. На staging проверить реальные SDK с тестовыми account/keys, actual Network и revoke/cookies. Эти live gates сейчас NOT RUN.
6. Рабочий deployment и merge в main возможны только после отдельного подтверждения владельца; в этой работе они не выполнялись.

## Итоговые числа

| Набор | Сценарии | Assertions | Ошибки |
|---|---:|---:|---:|
| Playwright на MODX, включая powerset | 281 | 1161 | 0 |
| HTTP/PHP wrapper security | 36 | 118 | 0 |
| Native Manager UI/auth | 4 | 9 | 0 |
| Live guards с локальным fulfillment | 11 | 50 | 0 |
| PHP, user www-data, path/validator/limiter/concurrency/write | набор unit/integration checks | 80 | 0 |
| **Всего** | **332 сценария + PHP checks** | **1418** | **0** |

HAR exporter дополнительно просмотрел все **3855 записей 281 публичного mock HAR**, ни одна не указывает на внешний origin. `observedRequestWindowCount` в evidence — окно запросов, используемое конкретной проверкой; `harEntryCount` — полная длина HAR этого сценария, включая повторные навигации. HAR entries включают browser request/cache observations и не объявляются числом соединений TCP.

Накопленный тестовый текущий месячный JSONL содержит **2834** корректных строки: **95 schema 1**, **2739 schema 2**, **2834 уникальных event_id**. Это весь журнал нескольких запусков fixture, не только финальная матрица. Санитизированный пример schema 2 и точные counts включены в evidence; raw IP/UA/UUID в Git не перенесены. Двадцать конкурентных PHP-процессов используют свой disposable private directory; их строки не входят в этот месячный HTTP-журнал.

Дополнительно прошли PHP/JS syntax checks и `git diff --check`; `/setup/` возвращает HTTP 404 после воспроизводимого setup. `main` не изменялся этой работой.

## Опорная документация

- [MODX: CLI installation](https://docs.modx.com/2.x/en/getting-started/installation/cli) — официальный workflow XML/CLI, проверенный на этом дистрибутиве.
- [Google: basic Consent Mode](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic) — блокировка загрузки Google tag до разрешения. Наш gate дополнительно требует отдельный выбранный сервис.
- [Google: consent and Tag Manager](https://developers.google.com/tag-platform/security/guides/consent) — контейнерные consent checks требуют отдельной настройки; произвольный контейнер не сертифицируется нашим флагом.
- [Google Maps: embedding a map](https://developers.google.com/maps/documentation/embed/embedding-map) — iframe URL/API параметры; actual vendor response в этой приёмке не запрашивался.
