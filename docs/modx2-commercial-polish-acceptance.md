# Приёмка: полировка Manager и минимальный публичный реестр — 1.0.1 review

Дата: 14 октября 2026. Ветка: `feature/modx2-commercial-polish-performance`.
База: стабильный `b6c4402`; полировка: `18cc944`; публичный реестр: `00b3c48`.
**GO только для review.** 1.0.1 — локальный кандидат, не опубликованный релиз.
`main`, `v1.0.0` и опубликованный ZIP 1.0.0 не изменены. Production deployment отсутствует.

Итог последнего полного прогона: **501 проверка, 4121 assertion, 0 итоговых FAIL**.
[Машиночитаемый отчёт с именами сценариев и измерениями](evidence/modx2-commercial-polish-results.json).
Среда: настоящий MODX Revolution **2.8.8-pl**, PHP **8.2.34**, MariaDB,
Apache, Chromium/Playwright 1.62.1, esbuild 0.28.2. Три одноразовых локальных
установки, включая core вне webroot и core внутри webroot. Реальный native
Package Manager, modPackageBuilder, object/file/script vehicles; не имитация установки.

## Изменения и архитектура

- Коммерческий Changelog 1.0.0 сокращён до семи пунктов. Исторические beta-отчёты,
  архивы и опубликованные Release Notes остались прежними; обновлён текст в review-ветке.
- RU/EN руководство имеет один источник `_build/user-guide.json`. Build генерирует
  Package Manager Readme и PHP-данные для модального окна; hashes проверяются при сборке.
  На «Основных» — кнопка руководства; DOM через textContent, примеры кода не исполняются.
  Закрытие, Escape, возврат фокуса, прокрутка и сохранение несохранённого draft проверены.
- «Сервисы»: chevron в кликабельном заголовке, независимый checkbox видимости,
  hit-area 44px, aria-expanded, клавиатура и focus. Выравнены карточки и спокойные статусы.
  Save, inline validation, раскрытость, preview, журнал и тексты сохраняют поведение.
- Footer разработчика ниже всей страницы, включая view-only журнал. HTTPS-ссылка,
  noopener/noreferrer; нет автоматических запросов на сайт разработчика.
- Пять системных настроек читаются одним штатным getCollection вместо пяти getObject.
  Сохранены порядок ключей/revision, fresh reads и fallback. Новый кэш не добавлен.
- `publicRegistry()` формирует отдельную проекцию. В JSON только key/category/enabled/
  loader/config и заданный purpose_id. name/purpose остаются в полной серверной
  конфигурации: PHP Texts/Renderer, Manager и локализованные HTML-шаблоны карт.
  Сохранённая canonical schema MODX не меняется. Минимальный и строго проверенный
  прежний JS-контракт поддерживаются; остальные поля/ID/options/adapters/URL проверяются.
  [Потребители полей и контракт](public-service-registry.md).

Новых MODX-плагинов, событий, таблиц, lifecycle ledger, runtime markdown parser,
сторонних UI-библиотек, дополнительных HTTP self-request или обязательных AJAX нет.
Assets/Banner вызываются однократно по документированному контракту; legacy допустим
как альтернативный способ. Новых stock-копий элементов нет.

## Обязательная проверка сохранённого согласия

Установлен **неизменяемый transport 1.0.0** с SHA256
`0ed4563a2e92cf5e40ba1c269dc0d39bd0acdb6b3fb12a86f734983ce2f4b04b`.
В настоящем браузере подтверждено наличие name/purpose в старом JSON и сохранено
согласие на все категории. Зарегистрированы Яндекс.Метрика, Mail.Ru, GA4, GTM,
Google Ads, VK, Meta и обе карты; у Метрики задан purpose_id=owner.analytics.

В том же browser context выполнен настоящий native upgrade на кандидат, затем reload.
**PASS:** raw localStorage, consent_id, saved permissions и каждый fingerprint v2
побайтно прежние; баннер не показан повторно; все разрешённые mock SDK и карты
загрузились. Проверена точная формула `[2, loader, category, purpose_id || key, privacy]`.
Настройки, private audit configuration и хеши журналов до/после upgrade совпали.
Нет изменений policy_version/category_versions, состояния провайдеров или audit schema.

Дополнительно PASS: минимальный/прежний контракт даёт одинаковые fingerprints;
unknown fields/SDK URL/arrays/bad ID/booleans/category/adapter/stable purpose отвергаются.
Scoped onAllowed и документированный ClientID-чанк работают с техническими полями.

## Регрессия

| Набор | Статус | Проверки | Assertions |
| --- | --- | ---: | ---: |
| `ui-results` | PASS | 7 | 215 |
| `package-results` | PASS | 1 | 12 |
| `native-results` | PASS | 8 | 226 |
| `reinstall` | PASS | 1 | 63 |
| `settings` | PASS | 1 | 20 |
| `settings-validation` | PASS | 1 | 26 |
| `categories-php` | PASS | 1 | 198 |
| `viewer-php` | PASS | 1 | 62 |
| `provider-config` | PASS | 16 | 287 |
| `browser-results` | PASS | 281 | 1423 |
| `categories-results` | PASS | 23 | 200 |
| `managerCategories-results` | PASS | 4 | 73 |
| `callbacks-results` | PASS | 13 | 44 |
| `maps-results` | PASS | 9 | 42 |
| `frontend-results` | PASS | 9 | 77 |
| `viewer-results` | PASS | 11 | 77 |
| `http-results` | PASS | 37 | 121 |
| `clientIdExample-results` | PASS | 4 | 13 |
| `localization-results` | PASS | 4 | 112 |
| `publicJson-results` | PASS | 3 | 92 |
| `liveGuard-results` | PASS | 11 | 51 |
| `providerParameters-results` | PASS | 4 | 18 |
| `pixels-results` | PASS | 32 | 175 |
| `gtm-results` | PASS | 9 | 126 |
| `config-php` | PASS | 1 | 53 |
| `public-registry-browser` | PASS | 6 | 43 |
| `public-registry-php` | PASS | 1 | 85 |
| `syntax` | PASS | 1 | 187 |
| `zip` | PASS | 1 | 0 |

Browser suite содержит все **256 комбинаций** существующей матрицы провайдеров.
Пиксели дополнительно покрыты 32 сценариями: consent, несколько IDs, dedup,
Mail.Ru/VK collision, revoke, fingerprint и аудит. Для Meta/VK SDK перехвачены;
реальные данные с тестовыми ID не отправлялись.

PASS: RU/EN/TR и пользовательские overrides, безопасные HTML-ссылки/буквальные
MODX/Fenom delimiters, SSR без JS, cold/warm cache, server-localized map templates,
split/legacy; Google/Yandex iframe placeholders, allow/revoke/reload; owner JS-карты
с контролируемыми SDK/backend и stillAllowed/unsubscribe.

PASS: до согласия и для disabled/unapproved SDK нет запросов; после отзыва блокировка
возвращается. GTM-WJD8XJD6, опубликованная версия 4: реальный контейнер и безопасные
Custom HTML счётчики, маркетинг отдельно от analytics_storage, отсутствие дубликатов.
Остальные внешние запросы перехвачены; GTM workspace не изменялся.

PASS: реальные POST в PHP endpoint, ACK/event_id/JSONL, schema 1/2, Origin,
IP/User-Agent, replay/rate limiting и ошибки; Audit Viewer/details/pagination/CSV,
права view-only. Receiver/logger source и формат месячных журналов не менялись.
Старые записи не удалялись; native upgrade не изменил хеши файлов журналов.

PASS: чистая установка с/без категории CookieConsent, полный внутренний/минимальный
публичный реестр, native upgrade 1.0.0, reinstall, uninstall. Пять canonical элементов
обновлены на месте; ID/category/properties/пользовательские метаданные сохранены,
retired Registry не вызывается и не создаётся на чистой установке; чужие элементы,
переводы/сервисы/ключи/настройки/данные сохранены. Финальная reinstall проверила 55 runtime hashes.

## Измерения на одинаковых данных

40 независимых HTTP/PHP-запросов для каждой пары язык/режим после пяти warmup;
CLI 100 повторов после пяти warmup. Время фрагмента измеряется после MODX bootstrap.
Это локальные медианы, не обещание производительности на клиентском хостинге.

| Метрика | 1.0.0 | Кандидат |
| --- | ---: | ---: |
| JSON #cc-service-registry, байт | 2638 | 939 (−64.4%) |
| Два Settings::read, SQL | 10 | 2 |
| Два Settings::read, CLI median ms | 2.954 | 1.594 |
| Split HTTP: SQL на фрагмент | 16 | 8 |
| RU live: PHP median ms | 6.872 | 5.922 |
| RU mock: PHP median ms | 7.111 | 5.739 |
| EN live: PHP median ms | 7.585 | 6.043 |
| EN mock: PHP median ms | 7.342 | 6.088 |
| Два hash_file: CLI median ms | 0.185 | 0.191 |
| Публичный JS, байт | 20012 | 20201 |
| Публичный CSS, байт | 3286 | 3286 |

Хеш локализованного HTML баннера одинаков до/после во всех четырёх группах.
JS вырос на 189 байт для совместимости со старым полным JSON; CSS неизменён.
Число запросов совпало в шести сценариях first visit/reject/return/allow/revoke:
два собственных assets, 0 audit POST на first/return, один при reject,
два при checkbox+Save; после withdrawal/reload сторонние SDK не запускаются.
Новых запросов ради руководства/реестра нет. hash_file оставлен: измеренная стоимость
мала, content hash обеспечивает cache busting без нового runtime cache/manifest.
Временный benchmark endpoint после измерений удалён.

## Начальный FAIL и ограничения

Первый запуск native install пересобранной **локальной** подписи 1.0.1 остановился
на verify-install: OPcache содержал resolver прежней review-сборки. Он не отмечен PASS.
После перезапуска одноразового PHP выполнены actual 1.0.0 → candidate upgrade,
проверка сохранённого согласия, полный regression и reinstall — PASS.
Это особенность повторного использования development signature; старый локальный
review ZIP сохранён отдельно. Стабильный 1.0.0 ZIP не пересобирался.

Также воспроизведено: ExtJS подавляет native Escape default; локальный обработчик
dialog исправляет закрытие. Tab может перейти в browser chrome; проверяется inert
background, без собственного keyboard trap. Запросы штатного MODX Gravatar блокируются
и отдельно исключаются из component network assertions.

**NOT RUN:**

- Production/client hosting, нагрузка/concurrency/DB latency, CDN/HTML cache deployment.
- Новый прогон nginx/reverse proxy/LiteSpeed/IIS; этот итоговый прогон выполнялся на Apache.
- PHP 8.1/прочие версии, Firefox/WebKit, старые браузеры без native dialog, screen readers.
- Реальная доставка событий Meta/VK/прочих кабинетов, реальные API key/tiles/geocode
  клиентских JS-карт и backend владельца. Только контролируемые SDK/endpoint fixtures;
  безопасный GTM-контейнер проверен отдельно.
- Полный новый набор late filesystem/DB failure injection, ENOSPC, power loss и races.
  Native install не обещает атомарного rollback; перед upgrade необходим backup/restore.
- Публикация 1.0.1, merge/default-branch/tag/release изменения и production deployment.

## Артефакт и установка для review

`cookieconsent-1.0.1.transport.zip`, два независимых native builds байт-в-байт одинаковы.
71 vehicle: 14 object, 55 file, 2 script; 136 ZIP entries. Состав/пути/секреты/Setup Options/
запрет plugins/ledger/copies, runtime hashes и SHA256 проверены.

SHA256: `cb239c590c9e1f4df42409e98c642b9b927e82934520748310830e4c9f24b3d4`.

Локальный immutable артефакт:
`.local/review/public-registry/cookieconsent-1.0.1.transport.zip` (read-only),
рядом SHA256 и две inventory. Предыдущий review-кандидат не перезаписан.
Это не GitHub Release и не production package publication.

1. На отдельном staging сделайте backup DB, runtime/пользовательских элементов,
   audit configuration и всех журналов. Проверьте SHA256 этого конкретного ZIP.
2. MODX Manager → Package Management → Upload → Install/Upgrade. Setup Options отсутствуют.
3. Очистите штатный кэш MODX и ваш HTML/CDN cache. Существующие настройки не сбрасывайте.
4. Сохраните split-контракт: один CookieConsentAssets в head, один CookieConsentBanner
   перед body close. Или прежний CookieConsent как альтернативу; не смешивайте их.
5. Проверьте собственные тексты/карты, Network до и после согласия и реальное событие
   с ACK/event_id в журнале. Согласие на неизменные сервисы не должно запрашиваться заново.
   Пользовательский код использует service key/loader/config, а не runtime name/purpose.

[Руководство и оформление Manager](modx2-commercial-polish-guide.md),
[RU/EN Package Manager Readme](../_build/package-readme.md),
[Services screenshot](evidence/commercial-services-ru.png),
[мобильное руководство](evidence/commercial-guide-ru-mobile.png).

Рекомендация: **GO для review и контролируемой staging-проверки**. Публикация
patch-релиза и deployment остаются отдельными действиями; непроверенные окружения
и доставка событий не объявлены PASS.
