# Реестр сторонних сервисов

Каноническая настройка MODX Manager → System Settings → namespace `cookie_consent`: `cookie_consent.services` (`textarea`, JSON). Изменять её могут только пользователи с правом управления системными настройками MODX. Публичного API записи конфигурации нет. Для каждой страницы используется некэшируемый сниппет `[[!CookieConsentRegistry]]`; он читает `modSystemSetting`, проверяет весь документ и выводит безопасный JSON script. При ошибке конфигурации весь реестр пустой, загрузка сервисов запрещена; ошибка фиксируется в MODX error log.

## Формат

```json
{
  "schema": 1,
  "services": [
    {
      "key": "google_ga4",
      "name": "Google Analytics 4",
      "category": "analytics",
      "purpose": "Статистика посещений",
      "enabled": false,
      "loader": "google_ga4",
      "config": {}
    },
    {
      "key": "google_maps",
      "name": "Google Maps",
      "category": "external_content",
      "purpose": "Внешние интерактивные карты",
      "enabled": true,
      "loader": "google_maps",
      "config": {}
    }
  ]
}
```

Максимум 32 записи, 32768 байт JSON. Ключ уникален, `[a-z][a-z0-9_]{0,31}`. Все семь полей записи обязательны; неизвестные поля отклоняются. `enabled` — только boolean; `config` — объект. Название ≤100 байт, описание ≤500 байт UTF-8, непустые, без управляющих символов и `< >`. HTML, JS, URL скриптов, callback и CSS из настроек не принимаются. Текст в браузере добавляется через `textContent`.

## Адаптеры

| loader | category | config | Сетевые хосты для аудита |
|---|---|---|---|
| `yandex` | analytics | `id` — 1–20 цифр строкой; `clientId` — необязательный boolean | mc.yandex.ru, mc.yandex.com |
| `mailru` | analytics | `id` — 1–20 цифр строкой | top-fwz1.mail.ru, top.mail.ru |
| `google_ga4` | analytics | `id`: `G-[A-Z0-9]{4,20}` | www.googletagmanager.com, *.google-analytics.com |
| `google_ads` | marketing | `id`: `AW-[0-9]{4,20}` | www.googletagmanager.com, www.googleadservices.com, *.doubleclick.net, www.google.com |
| `google_gtm` | marketing + общий gate | `id`: `GTM-[A-Z0-9]{4,20}` | www.googletagmanager.com; внутри контейнера возможны дополнительные хосты |
| `google_maps` | external_content | `{}` | www.google.com, maps.googleapis.com, maps.gstatic.com |
| `yandex_maps` | external_content | `{}` | yandex.ru, api-maps.yandex.ru, *.maps.yandex.net |
| `mock_marketing` | marketing | `{}` | только текущий origin; live ничего не загружает |

Категории обязательны для соответствующего адаптера: GTM не является отдельной категорией. `necessary` всегда включена и не может назначаться стороннему адаптеру. Google GA4/GTM/Ads выключены в установочных defaults до задания ID и `enabled: true`. Исторические Yandex `23643118` и Mail.Ru `3265404` сохранены; для клиентского сайта следует проверить и заменить их при необходимости. Local mock использует исключительно файлы текущего origin.

Хосты задаются проверенным кодом, а не администратором. Это подсказки аудита, **не полный список подзапросов стороннего SDK и не сетевой firewall**. Автоматические тесты блокируют/подменяют весь внешний трафик, независимо от этих шаблонов.

## Разрешения и расширение

Категория выбирает все включённые сервисы этой категории; сервисы можно выбирать индивидуально. Загрузка требует обеих проверок: категория разрешена и точная конфигурация конкретного сервиса разрешена. Разрешение связывается с `loader`, category, name, purpose и отсортированным config. Новый сервис или изменение его ID/названия/цели не наследует старое разрешение. Отключённый сервис исчезает из интерфейса и не запускается при следующей навигации. Изменение реестра на сервере не выгружает SDK из уже открытой вкладки: обновить страницу.

Администратор может добавлять новые записи с уникальными `key`, используя имеющийся адаптер, и выключать их без редактирования JS. Для **нового типа адаптера** требуется проверенное изменение `CookieConsentServiceRegistry::CATALOG`, валидатора config, браузерного catalog/hostPatterns/loader и mock-фикстур, затем новые сетевые тесты. Пользовательские исполняемые модули из настроек не поддерживаются. Для новой категории также потребуется явное изменение клиентского UI и PHP-схемы; произвольные категории не принимаются.

GTM — исполняемый контейнер. Он не загружается при частичном согласии, даже если выбран сам GTM: нужны analytics, marketing, external_content и все включённые сервисы. Это консервативное ограничение. Consent Mode сам по себе не ограничивает произвольный Custom HTML контейнера. Перед live включением нужен аудит содержимого, триггеров, Consent Initialization/Additional Consent Checks и отсутствия нераскрытых сервисов. Нельзя подключать одинаковый счётчик одновременно напрямую и через GTM. Контейнер, который не прошёл аудит, должен оставаться disabled. Автоматические проверки здесь исполняют локальный mock/пустую перехваченную заглушку, **не подтверждают безопасность конкретного live-контейнера**.

## Карты

Разрешение выдаётся на провайдера: все карты с одним `key` на странице и последующих посещениях получают это разрешение. Оно не выдаёт разрешений аналитике/маркетингу. Заглушка показывает название карты, провайдера, пояснение о передаче IP/браузера и кнопку «Загрузить карту»; после загрузки остаётся кнопка отзыва. Отзыв удаляет iframe сразу и перезагружает страницу после доставки аудита или таймаута 900 мс.

Исходный embed всегда хранится в **инертном div**, не в активном iframe/script/img:

```html
<div data-cc-map-provider="google_maps"
     data-cc-map-title="Наш офис"
     data-cc-map-src="https://www.google.com/maps/embed?pb=REPLACE_WITH_EMBED_PARAMETERS"></div>
<div data-cc-map-provider="yandex_maps"
     data-cc-map-title="Наш офис"
     data-cc-map-src="https://yandex.ru/map-widget/v1/?ll=37.6%2C55.7&amp;z=10"></div>
```

Google allowlist: HTTPS, ровно `www.google.com`, `/maps/embed` или `/maps/embed/v1/{place,view,directions,search,streetview}`. Yandex: HTTPS, ровно `yandex.ru`, `/map-widget/v1[/]`. Проверяются допустимые имена query-параметров; credentials, нестандартный port, fragment, иной host/path, неизвестные параметры отклоняются. Принятые параметры сохраняются через URL API. Для Google Embed API v1 требуется настроенный ограниченный API key; ключ виден в iframe URL, он не является секретом сервера. Произвольные SDK/script embeds в этой версии не поддерживаются: используйте iframe-эквивалент. Google/Yandex thumbnails, preconnect, prefetch, noscript, CSS backgrounds и любые активные embed из старого шаблона необходимо удалить.

В mock разрешены только `/assets/components/cookieconsentmanager3/js/cookie-consent/mock/google_maps.html` и `yandex_maps.html` текущего origin, без query/fragment. Включение внешнего адреса в mock блокируется. Начальные карты, включая карты внутри существующего `<dialog>`, создаются при инициализации. Для добавленных позднее AJAX-карт нужно создать их до инициализации или отдельно разработать lifecycle; автоматический MutationObserver не реализован.

## Аудит

Старые девять полей M2 без `schema` остаются допустимы и пишутся как JSONL `schema:1`. Новые события содержат дополнительно `schema:2`, `external_content`, `providers` (объект boolean по включённым ключам), `provider` (ключ целевого сервиса либо null). События `map_allow/map_deny` — committed; `provider_allow/provider_deny`, `external_content_allow/external_content_deny` — draft. Сервер проверяет соответствие провайдера текущему реестру и категории; draft не загружает сервисы. При одновременном изменении реестра уже открытый клиент может получить 400: обновить страницу; успешный аудит не заявляется.

Исторические файлы не переписываются. Читателю JSONL следует поддержать обе схемы; в schema 1 отсутствие external_content/providers означает «не записано», а не новое разрешение карт. Преференции M2 могут сохранять consent_id, но не дают разрешения новым провайдерам. `popup_yurist` полностью игнорируется.


## Дополнение Manager/i18n

При новой установке теперь все необязательные записи disabled. CLI upgrade сохраняет существующие значения. Контракт schema 1 расширен optional purpose_id и типизированными boolean-параметрами; актуальный перечень и схема переводов — [архитектура Manager](modx2-manager-architecture.md). Сведения выше описывают baseline M3, включая первоначальное связывание имени/описания с разрешением. Текущий fingerprint v2 исключает переводы/display text и cosmetic show_title, включает стабильное назначение и effective privacy config. Переход требует нового выбора старых per-provider permissions, сохраняет consent_id и JSONL. Отдельные серверные настройки texts/options читаются тем же публичным snippet; конкурирующего реестра нет.
