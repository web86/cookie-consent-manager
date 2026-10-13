# beta30 — исправление сериализации конфигураций в Manager

Основа — beta29 (`ced9884`), ветка `feature/modx2-frontend-bundle`. [Приёмка и NOT RUN](modx2-beta30-acceptance.md). GO только для review, без merge/deployment.

## Root cause

Дефект воспроизведён на настоящем MODX Revolution 2.8.8-pl до установки исправления:

1. В `cookie_consent.services` пустой config хранится как JSON `{}`; legacy `[]` тоже поддерживается.
2. `CookieConsentServiceRegistry::validateJson()` и `CookieConsentSettings::read()` корректно возвращают пустой `stdClass`.
3. Штатный processor вызывает `modProcessor::success()` → `modError::process()` → `modError::toArray()`. Последний рекурсивно преобразует объекты, включая пустой `stdClass`, в PHP-массивы.
4. Реальный Manager GET поэтому содержит `config: []`. `clone()` в Manager сохранял этот тип.
5. Присваивание `config.id` добавляло именованное свойство JS-массива. Локальная проверка его видела, но `JSON.stringify()` отправлял `[]` без ID. PHP справедливо возвращал validation. Такой же риск относится к именованным boolean options.

У beta29 реальная цепочка «ввести G-BETA30TEST → включить GA4 → Save» дала `enabled:true, config:[]` и validation. Это ожидаемое воспроизведение дефекта, а не успешное сохранение.

## Точечное исправление

В существующем `manager.js` локальный `editableRegistry()` используется при создании draft и принятии ответа Save. Только пустой массив без собственных именованных свойств преобразуется в `{}`. Проверка выполняется до JSON-клонирования, чтобы не терять свойства массива. Непустые массивы, null и scalar configs отклоняются с понятной ошибкой, не исправляются молча и не сохраняются.

Непустые корректные объекты копируются с ID и всеми boolean options. Уровень PHP и формат настройки не менялись: `{}` и legacy `[]` для пустой конфигурации продолжают приниматься существующим validator. MODX core/processor serializer не переопределяется. Нет нового модуля нормализации, плагина или lifecycle-механизма.

У ID-поля добавлены RU/EN ошибка, ожидаемый формат, `aria-invalid` и `aria-describedby`. Save при отсутствующем/неверном ID открывает настройки нужного сервиса, переводит фокус в поле и не отправляет заведомо неверный POST. Пустой ID допустим у отключённого сервиса. Unchanged default checkbox values по прежнему могут не присутствовать в JSON; изменённые true/false сохраняются как boolean.

Из 53 runtime-файлов изменены только Manager JS/CSS и два Manager lexicon файла. Public frontend, registry/Settings PHP, consent/fingerprint, maps/GTM/SDK, журнал, Viewer, публичный receiver и пять canonical source идентичны beta29.

## Обновление

ZIP: `.local/release/cookieconsent-0.1.0-beta30.transport.zip`.

SHA256: `065c4ebdcc3c8a6cd2b3fb7e8ac74d6af3fbc8ba06301c058d8ee75722e22c48`.

1. Сделайте backup DB, пользовательского runtime/static source и журналов. Установите после review через native MODX Package Manager на staging-копии. Сохраняется стандартная политика обновления пяти элементов на месте; IDs/metadata/category/settings/журналы и старый Registry не заменяются/не удаляются.
2. Выполните обычную очистку кэша MODX и жёсткую перезагрузку Manager (Ctrl/Cmd+Shift+R). Если Manager assets кэширует CDN, обновите его кэш, чтобы загрузился исправленный `manager.js`.
3. Введите свой Measurement ID, включите GA4 и нажмите Save. Проверьте, что POST содержит `config:{"id":"G-..."}`, а затем перезагрузите Manager и проверьте сохранённый ID. Аналогично проверьте Ads/GTM/Mail.Ru/Яндекс.Метрику и нужные flags.
4. Проверьте существующую интеграцию и реальные события на staging. Установка не включает сервисы автоматически и не предоставляет им согласие посетителя.

Подключение остаётся [как в beta29](modx2-beta29-update.md): Assets один раз в head + Banner один раз перед body end; либо legacy CookieConsent. Способы не смешивать.

## Воспроизведение локальных тестов

`reproduce.mjs` запускается **на beta29**, до upgrade. Он использует реальные GET/поле/Save, проверяет ожидаемую ошибку и восстанавливает настройки disposable clean fixture.

```sh
node tests/beta30/reproduce.mjs
node _build/transport.mjs /var/www/html /opt/cc-private/new-beta30-build 30
python3 _build/normalize.py .local/private/new-beta30-build/cookieconsent-0.1.0-beta30.transport.zip
# Скопировать ZIP и inventory из нового build-dir в .local/artifacts.
CC_INSTALL_SERVICES=clean node tests/transport/install-current.mjs
node tests/beta30/providers.mjs
CC_INSTALL_SERVICES=web node tests/transport/install-current.mjs
node tests/beta29/manager.mjs
node tests/manager-i18n.mjs
node tests/provider-parameters.mjs
node tests/browser.mjs
node tests/http.mjs
```

E2E выполняет реальные Save/reload пяти providers для обеих исходных форм, повторный Save без reload, обе boolean values, field errors RU/EN и отказ неправильных массивов. Тестовая лог-директория отключается и восстанавливается только в disposable clean fixture, чтобы тест конфигурации не инициализировал аудит. Остальные tests main выполняются последовательно.
