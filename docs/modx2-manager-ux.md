# Manager UX — beta7

Исходная ветка: feature/modx2-transport-package, baseline 59e17bf. Работа в feature/modx2-manager-ux. Установка остаётся штатной: native modPackageBuilder, object/file/script vehicles, без Setup Options, ledger и собственного rollback. Runtime заменяется native file vehicles; canonical и versioned элементы не перезаписываются, настройки и журналы сохраняются.

## Обновление beta5

1. Сохранить полный backup DB (включая native registry tables), core/assets, элементов/шаблонов, конфигурации аудита и JSONL. Проверить SHA256 нового ZIP по отчёту приёмки. Beta5 не заменять ZIP с новой начинкой.
2. Локально/staging: MODX Package Manager → Upload a Package → Search Locally → cookieconsent-0.1.0-beta7 → Install. Setup Options нет. Не запускать uninstall старых ledger-based beta поверх нового пакета.
3. Открыть Extras → Cookie Consent Manager. Старые options/services/texts/log_dir/audit_config_file сохраняются; добавляется только отсутствующая cookie_consent.audit. Новый публичный CookieConsent и отдельный CookieConsentMap создаются, если их нет. Свои чанки/сниппеты installer не заменяет. Для изменений сравнить *_package_0_1_0_beta7 с canonical и применить явно. Не менять purpose_id при косметическом редактировании.
4. Существующий ENV/приватный JSON продолжает работать. Для новой установки нажать «Настроить аудит», выбрать каталог, сохранить, проверить POST→журнал. При конфликтах старой сессии перечитать форму после сохранения локального черновика. Информация о запросе включает action, HTTP status, безопасный code/reason и request_id для поиска в MODX error log. Тело формы и ключ туда не пишутся.
5. В общем шаблоне убрать прежние отдельные подключения registry/CSS/JS/баннера и добавить **один** uncached `[[!CookieConsent]]`. Удалить прямые аналитические SDK/scripts и noscript-пиксели. Installer шаблоны не редактирует. Карт в общей инструкции нет.
6. Проверить реальные HTTP/JSONL, языки, шаблонный cache и Network на staging. Локальная приёмка не заменяет проверку HTTP-конфигурации конкретного хостинга.

## Минимальная схема аудита

Managed setup выполняется явно в CMP, а не при Install. Origin берётся из MODX site_url, rate_limit_per_minute по умолчанию 60. `cookie_consent.audit` содержит только эти два параметра. HMAC — 32 случайных байта (64 hex) в штатной MODX DB Registry: options одной серверной queue cookieconsent-audit-private; сообщений с ключом нет. Это серверная конфигурация, не lifecycle state. Нет отдельной схемы DB, таблицы или служебного private package directory. Настройка транзакционно сериализует инициализацию по native system-setting row, повторные нажатия не меняют ключ.

Почему не хранить ключ в system setting: MODX 2 system/config.js передаёт системные настройки в Manager JS. Ключ читается непосредственно native ORM из options queue, без eval и без native Registry send, который способен вывести payload при ошибке. Имя с дефисами намеренно запрещено штатными read/send processors MODX 2.8.8; authenticated regression подтверждает невозможность чтения/изменения через них. В messages секрет не записывается: native DB read способен читать одинаковый topic из разных queues, поэтому сообщения не подходят для конфиденциальных данных. API CMP, MODx.config, публичный registry и ZIP ключа не содержат. Администратор DB/Registry и права чтения backups остаются доверенной границей. Не применять native clear/remove к этой queue. Потеря записи отключает аудит; штатная проверка не восстанавливает и не вращает ключ молча. Backup DB должен включать register_queues.

Приоритет: COOKIE_CONSENT_AUDIT_CONFIG → сохранённый audit_config_file → managed config. Legacy PHP допускается только из доверенного ENV; настройка пути принимает только приватный JSON. Обычный интерфейс путь не показывает, но сохраняет его. Legacy миграция не создаёт ненужный новый ключ. Ключ не включать в переводы, публичные файлы, tickets и диагностические журналы.

«Проверить POST→журнал» делает настоящий HTTP POST к публичному PHP receiver и находит event_id в текущем monthly JSONL; это не вызов logger напрямую. Проверка добавляет отдельное событие reject с page=/cookie-consent-audit-check и User-Agent CookieConsent-Manager-AuditCheck. События не удаляются. Ready означает валидную конфигурацию/защиту каталога; успешный POST проверяется отдельно. Неправильный origin, ключ, path, права или защита приводят к отказу, без webroot fallback.

## /logs/cookies/ внутри DOCUMENT_ROOT

Рекомендуется существующий PHP-writable **приватный** каталог вне настоящего DOCUMENT_ROOT. В поле вводится абсолютный путь файловой системы, например /var/www/html/logs/cookies; его HTTP-адрес — /logs/cookies/. Нельзя вводить URL вместо filesystem path. Канонизация, symlink/hardlink/traversal и проверки доступности сохраняются. Manager и receiver используют настоящий DOCUMENT_ROOT, а не только MODX_BASE_PATH (важно при установке MODX в подкаталог).

Внутри webroot поддерживается только прямой Apache. «Проверить защиту каталога» создаёт `.htaccess` с `Require all denied`, если его нет; иной пользовательский файл не заменяет и требует отдельного решения администратора. Само наличие файла ничего не доказывает. Проверка создаёт безопасные случайные JSONL/log/.rate JSON probes и требует **403** через HTTP для обычного URL и URL с nonce. Проверяются существующие JSONL/monthly logs, будущий monthly path и точный .rate/state.json даже до его создания. Проверка повторяется при status/read, Save и каждом разрешённом POST. В finally удаляются только собственные безопасные probes; старые журналы не удаляются.

200, 404, redirect, timeout, TLS error и известные CDN/cache headers не принимаются за защиту. nginx/unknown SERVER_SOFTWARE, известные proxy/CDN forwarded headers отвергаются для публичного каталога; выбрать приватный. `AllowOverride None` локально проверен: наличие guard при HTTP 200 даёт отказ, receiver возвращает 503 без записи. Apache может отключать директивы .htaccess через AllowOverride: [официальная документация](https://httpd.apache.org/docs/2.4/mod/core.html#allowoverride).

Безопасность проверена на конкретном локальном Apache, а не на всех вариантах CDN/rewrite/server-config. Не ставить публичный каталог за CDN/alternate vhost; требуется прямой origin. Внешние aliases, смена конфигурации между probe и append и произвольные серверные маршруты не могут получить универсальную гарантию. Для таких окружений использовать приватный каталог. Частичное filesystem failure не обещает атомарного отката.

Только fixtures используют COOKIE_CONSENT_LOCAL_PROBE=1 совместно с CC_DB_PASSWORD и loopback origin, чтобы соединиться с Docker SERVER_ADDR:80 с тем же Host: опубликованный host port внутри контейнера недоступен. На реальном сервере флаг не устанавливать; запрос идёт по настроенному origin с проверкой TLS, без redirect.

## Подключение и карты

`[[!CookieConsent]]` использует regClientCSS, regClientStartupHTMLBlock и regClientScript. Registry/public JSON расположен до JS; порядок: i18n → provider-registry → consent-manager. Баннер зарегистрирован один раз native HTML block до footer scripts. Это устраняет проблему повторных проходов MODX parser по одинаковым uncached tags. Рекомендуются обычные закрывающие head/body теги. Runtime mode по умолчанию live; `[[!CookieConsent? &mode=\`mock\`]]` — только для локальной приёмки.

На конкретной странице карты:

```html
[[!CookieConsentMap? &provider=`google_maps` &src=`https://www.google.com/maps/embed?pb=YOUR_EMBED_VALUE`]]
[[!CookieConsentMap? &provider=`yandex_maps` &src=`https://yandex.ru/map-widget/v1/?um=YOUR_EMBED_VALUE`]]
```

API возвращает только div с data-атрибутами; iframe src, изображения, SDK отсутствуют до разрешения. Разрешены только указанные providers/HTTPS hosts/paths без credentials/port. JS повторно проверяет URL и consent; сервис должен быть включён в registry. Заглушки и отзыв разрешений остаются частью прежнего map API. Сниппет не разрешает произвольный HTML/JS. Системные параметры загрузки и кеширования контента задаются стандартным MODX; dynamic snippet обязательно uncached. Изменённые оператором canonical CookieConsentRegistry/CookiesPopup остаются его ответственностью. При изменении cultureKey самого MODX context действует штатный cache/OPcache; тест ждёт 2.3 секунды после refresh при opcache.revalidate_freq=2. Это не требуется для чтения options/services/texts: они читаются непосредственно из DB. Немедленная смена языка того же context до обновления native PHP cache не обещается.

## Тексты, сервисы и предпросмотр

Один select стандартных языков MODX; default — Manager language. HTML source editor принимает прежний whitelist: a/p/br/strong/em/span, без scripts/assets/handlers/styles. Редактируются только notice HTML, названия/описания четырёх категорий и названия сервисов. Technical/designer strings, base/fallback selector, произвольное добавление языка и Restore убраны. Существующие произвольные locales, скрытые strings/descriptions/map notices, base_language и accidental cookie_consent.upgrade_elements override сохраняются; последний исключается из публичных строк. Пакетный ключ исправлен на m.upgrade_elements.

Fallback для обычных строк: requested override → requested RU/EN lexicon → сохранённый legacy base override → legacy base lexicon → EN. Для сервисов сохраняется прежний display fallback registry с локальным override и stock lexicon; purpose_id остаётся стабильным идентификатором fingerprint. RU/EN stock одинаково полны. Нестандартный старый locale продолжает работать через cultureKey, хотя новый произвольный код нельзя добавить в обычной форме. Косметические тексты/язык не меняют fingerprint или policy_version.

«Добавить ещё один счётчик»: approved adapter, имя, ID; категория берётся из каталога, уникальный key/purpose_id создаётся автоматически. Новая карточка выключена по умолчанию, подтверждение сообщает о необходимости общей Save. Произвольный JS/HTML/смена adapter category запрещены. Название переопределяется во вкладке Тексты. GTM по-прежнему требует разрешений всех включённых сервисов.

Preview автоматически использует язык Manager, во вкладке Тексты — выбранный язык. Три режима сохранены, iframe sandbox/CSP изоляция остаётся, техническая подсказка/языковой select убраны. Несохранённые изменения обновляют preview; SDK/audit requests в нём не выполняются.

Policy version скрыта. Только подтверждённое расширенное действие «Запросить согласие повторно у всех посетителей» меняет её. При несохранённых изменениях требуется сначала Save/discard, чтобы действие не потеряло черновик. Обычно текстовые изменения не обнуляют действующие согласия.

## Uninstall / сбои

Uninstall удаляет exact package runtime files, сохраняя settings/элементы/menu/ACL, native DB Registry key, managed/legacy config и JSONL/untracked files. Сначала удалить template подключения; оставленные элементы/menu могут ссылаться на удалённый код. Полная очистка — отдельное решение оператора. Native archives core/packages не заменяют backup DB/файлов. При частичном install/uninstall проверить консоль, журналы и содержимое; устранить причину и повторить установку либо восстановить backup. Атомарный rollback при DB/FS failure не заявляется.
