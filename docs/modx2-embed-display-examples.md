# Постеры и размеры / Posters and dimensions — MODX 2, 1.0.6

RU: Подключите `[[!CookieConsentAssets]]` в head и `[[!CookieConsentBanner]]` перед закрывающим body. В Manager включите экземпляр `youtube`, назначьте видимую категорию. Каждый пример ниже независим. Замените video ID своим, а локальный poster — существующим файлом на вашем сайте без внешнего редиректа. В Strict iframe внутри template не загружается до разрешения категории; Legacy следует выбранной политике режима.

EN: Include `[[!CookieConsentAssets]]` in head and `[[!CookieConsentBanner]]` before the closing body. Enable the `youtube` instance in Manager and assign a visible category. Each example below is independent. Replace the video ID and supply your own existing local poster without an external redirect. Strict keeps the template iframe inert until category permission; Legacy follows its mode policy.

## 1. Локальный постер / Local poster

RU: Изображение с вашего сайта загружается до согласия. Оно находится в заглушке, которая скрывается при загрузке видео.

EN: The same-origin image loads before consent. It belongs to the placeholder, which is hidden when the video loads.

```html
<!-- example: local-poster -->
<div data-cc-embed="youtube" data-cc-poster="/assets/img/video-preview.webp"
     data-cc-aspect-ratio="16:9" data-cc-width="720">
  <template><iframe src="https://www.youtube-nocookie.com/embed/M7lc1UVf-VE"
    title="YouTube" allowfullscreen></iframe></template>
</div>
```

## 2. Внешний постер / External poster

RU: Адрес хранится в data-атрибуте. CMP не создаёт img для другого origin: запросов к постеру нет ни до, ни после согласия. Это не отложенная загрузка внешнего постера. Для видимой обложки сохраните разрешённое изображение на своём сайте и используйте пример 1.

EN: The address is stored in a data attribute. CMP creates no cross-origin img: the poster is requested neither before nor after consent. This does not provide deferred external poster loading. To display a cover, host an authorized image locally and use example 1.

```html
<!-- example: external-poster -->
<div data-cc-embed="youtube" data-cc-poster="https://images.example.test/poster.webp"
     data-cc-aspect-ratio="16:9" data-cc-width="720">
  <template><iframe src="https://www.youtube-nocookie.com/embed/M7lc1UVf-VE"
    title="YouTube" allowfullscreen></iframe></template>
</div>
```

## 3. Видео 16:9 / Landscape video

```html
<!-- example: landscape -->
<div data-cc-embed="youtube" data-cc-aspect-ratio="16:9">
  <template><iframe src="https://www.youtube-nocookie.com/embed/M7lc1UVf-VE"
    title="YouTube" allowfullscreen></iframe></template>
</div>
```

## 4. Вертикальное видео 9:16 / Portrait video

RU: Меняется пропорция контейнера, а не само видео. Плеер может показывать поля, если исходное видео имеет другую пропорцию.

EN: This changes the container ratio, not the source video. The player may add bars if the source has a different ratio.

```html
<!-- example: portrait -->
<div data-cc-embed="youtube" data-cc-aspect-ratio="9:16" data-cc-width="360">
  <template><iframe src="https://www.youtube-nocookie.com/embed/M7lc1UVf-VE"
    title="YouTube" allowfullscreen></iframe></template>
</div>
```

## 5. Пользовательские размеры iframe / Custom iframe dimensions

RU: Generic template сохраняет HTML iframe без изменений. Для фиксированных размеров задайте стандартные width/height непосредственно у iframe и не задавайте обёртке aspect ratio. Здесь требуется минимум 720px доступной ширины.

EN: A generic template preserves iframe HTML unchanged. Set standard width/height directly on the iframe for fixed dimensions, and omit the wrapper aspect ratio. This example needs at least 720px of available width.

```html
<!-- example: fixed-size -->
<div data-cc-embed="youtube">
  <template><iframe src="https://www.youtube-nocookie.com/embed/M7lc1UVf-VE"
    width="720" height="405" style="border:0" title="YouTube"
    allowfullscreen></iframe></template>
</div>
```

## 6. Адаптивная ширина / Responsive width

RU: Контейнер занимает 100% доступной ширины, максимум 960px. `data-cc-width` — максимальная ширина в пикселях, не проценты. CSS компонента растягивает прямой дочерний iframe по контейнеру с заданной пропорцией.

EN: The container uses 100% of available width, capped at 960px. `data-cc-width` is a pixel maximum, not a percentage. Component CSS fits a direct child iframe into the container at the selected ratio.

```html
<!-- example: responsive -->
<div data-cc-embed="youtube" data-cc-aspect-ratio="16:9" data-cc-width="960">
  <template><iframe src="https://www.youtube-nocookie.com/embed/M7lc1UVf-VE"
    title="YouTube" allowfullscreen></iframe></template>
</div>
```

RU: У сниппета `CookieConsentVideo` этим опциям соответствуют `poster`, `aspectRatio`, `width`. Например:

```modx
[[!CookieConsentVideo? &url=`https://youtu.be/M7lc1UVf-VE` &poster=`/assets/img/video-preview.webp` &aspectRatio=`9:16` &width=`360`]]
```

RU: Его пропорция по умолчанию — 16:9; height не отменяет адаптивную пропорцию. Для фиксированных размеров используйте пример 5. Параметры обёртки title/height/loading/referrer-policy/allow-fullscreen применяются к сгенерированным сниппетом iframe и картам; generic template сохраняет собственные атрибуты iframe. Не добавляйте generic-обёртке `data-cc-video`: этот атрибут принадлежит проверенному выводу сниппета.

EN: `CookieConsentVideo` exposes the corresponding `poster`, `aspectRatio`, `width` properties. Use the MODX example above. Its default ratio is 16:9; height does not override responsive sizing. Use example 5 for fixed dimensions. Wrapper title/height/loading/referrer-policy/allow-fullscreen options apply to snippet-generated iframes and maps; generic templates preserve their own iframe attributes. Do not add `data-cc-video` to generic wrappers: it belongs to validated snippet output.
