# Видео и доверенные встраивания — MODX 2, 1.0.5-beta1

В Manager включите сервис YouTube, RUTUBE или VK Видео, назначьте существующую необязательную категорию и включите её видимость. Рекомендуется `external_content`, но допустимы также `analytics` и `marketing`. Несколько экземпляров одного типа имеют разные ключи, например `youtube` и `youtube_help`. Выбор посетителя остаётся категорийным: кнопка на заглушке открывает настройки назначенной категории.

На новой установке все сервисы выключены. При upgrade существующий JSON сервисов сохраняется: добавьте новый тип из каталога Manager. Состав включённых сервисов, исторические fingerprints, версии категорий и сохранённые согласия от одного появления новых типов не меняются.

В Strict внешнее содержимое инертно до разрешения категории. Legacy запускает включённые сервисы видимых категорий на подтверждённом первом визите, без записи фиктивного согласия. Сохранённый отказ/частичный выбор, TTL, policy и версии категорий сохраняют приоритет. Отзыв удаляет управляемое содержимое и использует штатную перезагрузку. Уже отправленные запросы отозвать нельзя.

## 1. Проверенный iframe через CookieConsentVideo

```modx
[[!CookieConsentVideo?
    &provider=`youtube`
    &url=`https://www.youtube.com/watch?v=M7lc1UVf-VE`
    &title=`Видео о компании`
    &start=`30`
    &autoplay=`0`
    &controls=`1`
    &aspectRatio=`16:9`
    &poster=`/assets/img/video-preview.webp`
    &cssClass=`video--wide`
]]

[[!CookieConsentVideo?
    &provider=`rutube`
    &url=`https://rutube.ru/video/7716bd3e665725c3c008ae7ab4ff02e2/`
    &start=`30`
    &title=`Видео RUTUBE`
]]

[[!CookieConsentVideo?
    &provider=`vk_video`
    &url=`https://vkvideo.ru/video_ext.php?oid=-OWNER_ID&id=VIDEO_ID&hd=2`
    &title=`Видео VK`
]]
```

Замените тестовые ID своими. Для VK скопируйте **значение `src`** из «Поделиться → Код для встраивания», а не весь iframe. Если VK выдал `hash`, сохраните его. CMP не вычисляет hash и не преобразует обычные VK video-страницы. Код с `OWNER_ID`/`VIDEO_ID` — схема, которую валидатор отклонит до замены числами.

`service` задаёт ключ конкретного экземпляра; по умолчанию равен `provider`. Тип экземпляра обязан совпадать с provider. Неизвестный экземпляр не создаёт iframe. Сниппет проверяет адрес на сервере, экранирует атрибуты и выдаёт iframe внутри инертного template. JS повторно проверяет контракт сгенерированного адреса перед активацией. Ни SDK, ни внешние thumbnail API не используются.

| Параметр | Значение по умолчанию / контракт |
| --- | --- |
| `provider` | `youtube`; `rutube`, `vk_video` |
| `service` | Ключ стандартного экземпляра provider; допустим дополнительный ключ |
| `url` | Обязательный HTTPS URL из списка ниже |
| `title` | Локализованное «Видео» / “Video”; задайте содержательное название |
| `start` | Целые секунды, 0–9999999; только подтверждённые ниже провайдеры |
| `autoplay` | `0`; включение не гарантирует autoplay в браузере |
| `controls` | Настройка YouTube `0`/`1`; исходный default плеера `1` |
| `aspectRatio` | `16:9`; положительные целые компоненты до 4 цифр |
| `width`, `height` | Необязательные целые пиксели 1–99999; адаптивный контейнер имеет приоритет |
| `poster` | Локальный путь или HTTPS изображение; политика ниже |
| `cssClass` | Имена классов из букв, цифр, пробелов, `_`, `-` |
| `allowFullscreen` | `1`; `0` убирает разрешение fullscreen |
| `end`, `loop`, `playsinline` | Только YouTube; `loop=1` добавляет playlist с тем же video ID |
| `muted` | Не поддерживается; универсальное обещание mute отсутствует |

### Реальная поддержка параметров

| Настройка | YouTube | RUTUBE | VK Видео |
| --- | --- | --- | --- |
| Прямой URL → embed | watch, youtu.be, shorts, live; ID 11 символов | `/video/ID/`, `/video/private/ID/`; hex ID 32 символа | Нет; только готовый `video_ext.php` |
| Embed | `youtube.com/embed/ID`, `youtube-nocookie.com/embed/ID` → `www.youtube-nocookie.com` | `rutube.ru/play/embed/ID/` | `vk.com/video_ext.php`, `vkvideo.ru/video_ext.php` |
| `start` | `start`; исходный `t=90`/`t=1m30s` также нормализуется | `t` в секундах | Сниппет не генерирует; сохраняет `t` из официального embed |
| `autoplay` | `0`/`1`, default `0` имеет приоритет над URL | Не генерируется: публичный query-контракт не подтверждает эту настройку | `0`/`1`, default `0` имеет приоритет над URL |
| `controls` | `0`/`1` | Игнорируется | Игнорируется |
| `end`, `loop`, `playsinline` | Да | Игнорируются | Игнорируются |
| `muted` | Не генерируется | Не генерируется | Не генерируется |
| Доступ по ссылке | Возможность embed определяет YouTube | `p` сохраняется при нормализации и добавлении `t` | `hash` сохраняется, если был в официальном URL |

Неизвестные query-параметры, дубликаты ключей, фрагменты, userinfo, порты (включая явный `:443`), HTTP, поддельные hostname/path и произвольные iframe URL отклоняются. YouTube share-параметры `si`/`feature` допускаются и удаляются. Для RUTUBE также допускаются документированные `skinColor` и `getPlayOptions`. Для VK допускаются числовые `oid`, `id`, `hd`, необязательные `hash`, `t`, `autoplay`; другой официальный контракт используйте через доверенный template. URL могут быть синтаксически корректны, а само видео — удалено, закрыто или запрещено к встраиванию.

Официальные источники, проверены 16.10.2026: [YouTube player parameters](https://developers.google.com/youtube/player_parameters), [RUTUBE embed FAQ](https://rutube.ru/info/embed/), [VK Video Player](https://vk.com/dev/Video_Player), [VK video object / player](https://dev.vk.com/ru/api/objects/video). Документация VK в текущей среде недоступна; успешное реальное воспроизведение VK и применимость опций остаются отдельным release gate, не доказанным synthetic fixtures.

## 2. Доверенный HTML через template

```html
<div data-cc-embed="youtube" class="video-box">
  <div data-cc-placeholder>
    <p>Видео доступно после разрешения категории.</p>
    <button type="button" data-cc-settings>Открыть настройки cookie</button>
  </div>
  <template>
    <iframe src="https://www.youtube-nocookie.com/embed/M7lc1UVf-VE"
      title="Видео о компании" allow="fullscreen; picture-in-picture"
      allowfullscreen></iframe>
  </template>
</div>

<div data-cc-embed="rutube">
  <template><iframe src="https://rutube.ru/play/embed/7716bd3e665725c3c008ae7ab4ff02e2/"
    title="RUTUBE" allowfullscreen></iframe></template>
</div>

<div data-cc-embed="vk_video">
  <template><!-- Вставьте сюда полный официальный iframe из VK. --></template>
</div>

<div data-cc-embed="yandex_maps">
  <template><iframe src="https://yandex.ru/map-widget/v1/?ll=37.62%2C55.75&amp;z=10"
    title="Карта проезда" loading="lazy"></iframe></template>
</div>

<div data-cc-embed="google_maps">
  <template><iframe src="https://www.google.com/maps/embed/v1/place?key=YOUR_KEY&amp;q=Moscow"
    title="Google map" loading="lazy"></iframe></template>
</div>
```

**Граница доверия:** CMP не разбирает, не санитизирует, не переписывает и не валидирует HTML/URL внутри этого template. Его безопасность и соответствие сервису обеспечивает вебмастер. Не вставляйте пользовательский недоверенный HTML. Сложные VK-страницы и иной официальный HTML, который не поддерживает автоматический сниппет, можно подключить этим путём.

Обёртка проверяет зарегистрированный включённый экземпляр, его назначенную категорию, видимость и `runtimeAllowed(category)`. Атрибуты в template не могут выдать consent. Без собственной заглушки создаётся нейтральная RU/EN заглушка с кнопкой настроек. Template должен быть прямым дочерним элементом обёртки; собственная заглушка — тоже. Управляемые клоны вставляются один раз и удаляются при отзыве в пределах этой обёртки. Перемещение стороннего DOM за её пределы и SDK-состояние, созданное доверенным HTML, остаются ответственностью разработчика; штатная перезагрузка очищает страницу.

Обычные уже активные iframe автоматически не обнаруживаются и не оборачиваются: их запросы могли уйти до запуска CMP.

### AJAX/modal

```javascript
const host = document.getElementById('ajax-result');
// Добавьте сюда доверенную обёртку с template.
window.web86CookieConsent.mountEmbeds(host); // включает сам host и его потомков
window.web86CookieConsent.mountEmbeds();     // ищет по document
```

Вызывайте после вставки DOM в document. Повторный вызов безопасен. Новые элементы сразу учитывают действующее разрешение или Legacy первого визита. Постоянного MutationObserver нет. Удалённые узлы не хранятся в глобальном массиве. Не передавайте второй источник прав или собственные provider grants.

## 3. Собственный JavaScript через onAllowed

```javascript
const cmp = window.web86CookieConsent;
cmp.onAllowed('external_content', async function (stillAllowed) {
  if (!stillAllowed()) return;
  const module = await import('/assets/js/company-video.js');
  if (!stillAllowed()) return;
  await module.init(stillAllowed);
}, { service: 'youtube' });
```

Замените категорию на реально назначенную. Модуль не должен сам инициировать внешние запросы при import. Проверяйте `stillAllowed()` после каждого await и перед запросами. Код и teardown своего SDK контролирует разработчик. Категорийный callback без `{ service }` работает и без сервисов.

## CookieConsentMap

Прежний вызов сохраняет **точный исходный HTML** и прежнюю URL allowlist:

```modx
[[!CookieConsentMap? &provider=`yandex_maps` &src=`https://yandex.ru/map-widget/v1/?ll=37.62%2C55.75&z=10`]]
```

Новые необязательные `title`, `cssClass`, `width`, `height`, `aspectRatio`, `loading`, `poster`, `allowFullscreen`, `referrerPolicy` используют общие правила отображения. Без них остаются прежние высота 320px, fullscreen, sandbox и `strict-origin-when-cross-origin`. `loading`: `lazy`/`eager`; referrer policy: `no-referrer`, `same-origin`, `strict-origin`, `strict-origin-when-cross-origin`. `unsafe-url` не допускается. Не задавайте `no-referrer` для плееров/ключей, которым нужен Referer; YouTube может вернуть 153. Штатные map attributes `data-cc-map-provider` / `data-cc-map-src` сохранены.

```modx
[[!CookieConsentMap?
 &provider=`yandex_maps`
 &src=`https://yandex.ru/map-widget/v1/?ll=37.62%2C55.75&z=10`
 &title=`Как добраться`
 &aspectRatio=`16:9`
 &loading=`lazy`
 &poster=`/assets/img/map.webp`
 &allowFullscreen=`1`
 &referrerPolicy=`strict-origin-when-cross-origin`
]]
```

## Обложки, доступность, audit и CSP

Same-origin poster показывается до разрешения; cross-origin poster хранится инертно, нейтральная заглушка не отправляет запрос. Автоматические обложки YouTube/RUTUBE/VK не запрашиваются. После активации placeholder скрывается, поэтому внешняя обложка не скачивается и тогда; используйте её в собственном разрешённом коде, если она необходима. Локальная обложка может перенаправить на другой домен: вебмастер должен исключить такие редиректы на своём origin.

Кнопки доступны с клавиатуры и открывают назначенную категорию. Если обёртка находится в открытом modal dialog, диалог временно закрывается для настроек и восстанавливается после разрешения. Общие Save/reject и audit schema 3/ACK/event_id работают штатно; `map_allow`/`embed_allow` не создаются.

**Почему пустой плеер после согласия?** Проверьте CSP `frame-src`: разрешите необходимые `https://www.youtube-nocookie.com`, `https://rutube.ru`, `https://vk.com`, `https://vkvideo.ru`; для карт — прежние origins. Не расширяйте `script-src` ради iframe, SDK для этих адаптеров не нужен. Внутри внешнего iframe действуют собственные зависимости сервиса. Для собственного poster нужен соответствующий `img-src`. CSP не заменяет consent.

**Нужны inline scripts/style?** Production использует один `cookie-consent.min.js` и штатный CSS. Runtime применяет проверенное `aspect-ratio`/размеры через CSSOM; HTML сниппета не содержит inline scripts/handlers. Доверенный template может содержать произвольные атрибуты/скрипты; согласуйте их с CSP своего сайта самостоятельно.

**Почему autoplay не сработал?** Браузеры ограничивают автоматическое воспроизведение. Разрешение категории и iframe autoplay permission не отменяют эти ограничения. RUTUBE autoplay не обещается; используйте подтверждённый официальный код через template при необходимости.
