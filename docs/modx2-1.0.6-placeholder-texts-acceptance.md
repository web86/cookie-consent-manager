# Cookie Consent Manager 1.0.6 — тексты заглушек и native transport

Ветка: `codex/modx2-adapter-cache-build`, база `2b7ae675a844728059dd03e5ac54d7a4c38c1d8b`. Стабильная версия задана штатными метаданными: `version=1.0.6`, `release=""`, `release_index=0`; runtime-константа сгенерирована `_build/version.mjs`. Обновлены changelog и актуальные пользовательские документы. Push, merge, публикация GitHub Release и deployment не выполнялись.

## Тексты и совместимость

По последнему уточнению сохранены три поля текста: общее для внешнего содержимого, индивидуальное Google Maps и индивидуальное Яндекс Карт. Пустое поле карты использует общий текст. Один редактируемый `map_load` задаёт подпись «Настройки cookie» / “Cookie settings” для штатных заглушек карт, видео и автоматических generic embeds. Обработчик кнопки по-прежнему открывает назначенную категорию, не выдавая согласия.

Общий `map_notice` содержит новый RU/EN шаблон с `{provider}`. Для видео, карт и generic template подставляется локализованное отображаемое имя зарегистрированного экземпляра; используются серверное экранирование/DOM textContent. Нераспознанный ключ generic embed остаётся штатной ошибкой без активного iframe. Собственный `data-cc-placeholder` остаётся доверенным HTML автора; для штатного перевода его следует опустить.

Для предыдущего кешированного JS сохранены прежние runtime messages: он получает готовый общий текст с названием категории без незаменённого {provider}; новый JS использует готовый текст конкретного сервиса. Дополнительных проверок JS-файла на frontend нет.

Новых системных настроек нет. Старые `embed_notice`/`embed_settings` принимаются как fallback общего поля и отображаются в редакторе, если общий override не заполнен. После редактирования общего поля они его не переопределяют. Индивидуальные overrides карт остаются видимыми и действующими. Установка/upgrade сохраняет пользовательский JSON переводов; отображение не перезаписывает его. Изменение текстов не меняет category_versions.

Consent lifecycle, SDK, URL-политики, iframe activation/revocation, timestamp и BundleManager сохранены. Изменены только формирование текстов, локализованные сообщения, Manager и соответствующие prebuilt/manifest hashes; порядок всех 21 JS-исходников прежний.

## Постеры и размеры

Проверены `embeds.js`, `CookieConsentEmbedOptions.php`, `CookieConsentVideo` и техническая инструкция. [Шесть исполняемых HTML-примеров RU/EN](modx2-embed-display-examples.md): локальный poster, инертный внешний poster, 16:9, 9:16, фиксированный iframe, адаптивная ширина.

Same-origin poster загружается до выбора. Внешний poster не загружается ни до, ни после согласия: существующий API не реализует его отложенную загрузку. `aspectRatio` определяет контейнер; `width` ограничивает его ширину в пикселях. Высота не отменяет заданную пропорцию; generic template сохраняет собственные iframe attributes. Новых атрибутов и возможностей не добавлено.

Краткое руководство RU/EN обновлено из `_build/user-guide.json`, производные PHP/Markdown/manifest синхронизированы генератором.

## Установочный пакет и состав

- Native MODX `modPackageBuilder`: `cookieconsent-1.0.6.transport.zip`.
- Путь: `.local/artifacts/cookieconsent-1.0.6.transport.zip`.
- Размер: **547751 байт**.
- SHA256: `b0e44a1f585eafdb0f451f10207cddc57283c1ec755d03a3ac244a0debdce280`.
- Две независимые финальные сборки (web и clean, MODX 2.8.8 / PHP 8.2.34) совпали побайтно после существующей `_build/normalize.py`.
- 231 runtime-файл, 490 ZIP entries, 248 native vehicles: 231 file, 15 object, 2 script. По сравнению с уже очищенным beta2: **231 → 231 runtime-файлов, 490 → 490 записей ZIP**.
- Включены PHP BundleManager/BundleInstall, 21 JS-исходник и manifest, три видеоадаптера, prebuilt JS/CSS, Manager/processors, RU/EN lexicons/guide и все шесть канонических элементов MODX.
- Peast: 156 runtime/license-файлов, без developer README.

Allowlist `_build/transport-files.json` сохранён. Каталоги tests/fixtures/debug, CI/dev tools/docs, временные файлы/логи/local artifacts, source maps и каталог `mock/` отсутствуют. Проверка состава включает отрицательные случаи для внедрённой fixture, source map, неизвестного файла и изменения runtime bytes. Списки runtime/ZIP сохраняются рядом с отчётом о проверках.

**Mock-файлы:** из каталога `assets/components/cookieconsentmanager/js/cookie-consent/mock/` не поставляется ни одного файла. Сохранён только `assets/components/cookieconsentmanager/js/cookie-consent/services/mock-marketing.js`, вне этого каталога: это один из 21 обязательных manifest inputs, фабрика которого безусловно создаётся dispatcher. Его live start пустой. Исключение сломало бы сборку/инициализацию; архитектура ради удаления не менялась. Подробный исторический аудит десяти исключённых mock SDK/map ресурсов — в [beta2 acceptance](modx2-beta2-transport-acceptance.md).

## Проверки

- Transport verifier и composition: **473 assertions PASS**; static/source/native inventory checks: **97 PASS**.
- Native clean/install/upgrade/reinstall/uninstall: **10 сценариев / 404 assertions PASS**, в том числе beta5, 1.0.5-beta1 и 1.0.5-beta2 → 1.0.6. Сохраняются пользовательские переводы, оба индивидуальных текста карт, общая подпись кнопки, параметры, IDs/категории/метаданные элементов, ресурсы, ACL и audit data.
- Чистый установленный компонент без mock: **3 сценария / 52 assertions PASS** — SDK, две карты, три видео, Strict/Legacy, consent/revoke, onAllowed, повторный mount, инертный Preview и force build.
- Новая матрица заглушек + точные HTML-примеры: **32 сценария / 779 assertions PASS** отдельно для esbuild и PHP bundle; RU/EN, все три категории, Strict/Legacy, stock/custom тексты, ошибки/отключение сервиса и предыдущий кешированный bundle после неудачной административной пересборки.
- PHP snippets: **49 assertions PASS**; translation/category contracts: **137 PASS**; PHP/JS URL parity: **15 PASS**.
- PHP cache builder: **8.1.34 / 8.2.34 / 8.5.10**, по **70 assertions PASS**, Node/npm недоступны. JS semantics PASS.
- Native cache builder: **11 сценариев / 79 assertions PASS**, включая prebuilt `?v=1.0.6`, успешную публикацию, сохранение предыдущего файла/версии при ошибке, unchanged skip, force timestamp/HTML cache и отсутствие рекурсии OnSiteRefresh.
- Manager RU/EN: **2 сценария / 44 assertions PASS**, включая активную версию 1.0.6, три поля, общую кнопку, preview, сохранение и upgrade без перезаписи пользовательских переводов.
- Differential: **49 сценариев / 253 assertions PASS**.
- Native standard/Fenom × RU/EN × cold/warm, mixed maps/video и настоящие audit ACK/JSONL: **10 сценариев / 244 assertions PASS**.
- Основные regression: **20 наборов PASS, 0 failures**. PHP/JS syntax, генераторы version/guide, manifest hashes и git diff --check PASS.

Внешние SDK/iframe ответы перехвачены локальными тестами. Реальное воспроизведение YouTube/RUTUBE/VK на целевом сайте остаётся отдельной staging-проверкой; стабильный номер версии не заменяет её.
