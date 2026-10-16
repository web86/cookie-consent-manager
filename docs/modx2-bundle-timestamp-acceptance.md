# MODX 2 — KISS bundle timestamp

Исходная и итоговая ветка: `codex/modx2-adapter-cache-build`. База: `573274b4fe56b70ae1fd39c455addc19dba5426d`. Отдельный коммит этой задачи содержит данный отчёт. Версия пакета остаётся `1.0.5-beta1`.

## Изменение

Единственное новое состояние — системная настройка `cookie_consent.bundle_version` в существующем namespace `cookie_consent`. Отсутствующая/нулевая версия выбирает prebuilt `cookie-consent.min.js?v=1.0.5-beta1`; положительная версия выбирает `cached-cookie-consent.min.js?v=<timestamp>`.

Frontend читает значение через `getOption()` из уже загруженного config MODX. Для JS больше нет `is_file`, чтения заголовка/manifest, `filemtime`, хеширования, вычисления fingerprint, SQL или генерации времени. Ручное удаление активного JS не меняет состояние посетителем. CSS-подключение оставлено прежним.

## Публикация и ошибки

Существующие flock, manifest, порядок 21 файла и Peast сохранены. Fingerprint в первой строке файла используется только административным сборщиком для skip; checksum/время/версия из этого заголовка удалены. Manager status берёт время успешной сборки из системной настройки.

При реальной сборке JS публикуется атомарным rename, затем вызывается `time()` и сохраняется настройка. Запись одной настройки использует штатную DB-транзакцию. При отказе сохранения/commit откатываются настройка и предыдущие байты JS; на первой неудачной сборке остаётся prebuilt. После commit обновляется config текущего процесса. При skip настройка и файл не меняются.

Чтобы две немедленные успешные force-сборки не получили один URL из-за секундной точности `time()`, административный процесс при совпадении timestamp ждёт одну секунду и повторно вызывает `time()`. Будущие timestamps и отдельные счётчики не создаются. Посетителей это ожидание не затрагивает.

После успеха `cacheManager->refresh(['system_settings'=>[]])` обновляет кеш настроек, а штатный `cacheManager->clean()` очищает раздел resource (с его настроенными key/handler). Прямая очистка раздела работает и при `cache_resource_clear_partial`. Процессор `system/clearcache` и `invokeEvent('OnSiteRefresh')` из сборщика не вызываются. Native event probe подтверждает: обычная очистка — ровно одно событие, force — ни одного дополнительного события. Кешированный HTML со **cached** вызовом `[[CookieConsentAssets]]` после force получает новый URL.

## Объём

Изменены только BundleManager, выбор JS в Assets, связанные тесты и техническая документация. Peast, frontend manifest, 21 JS-исходник, prebuilt JS/CSS, registry, consent/SDK/video и канонические источники руководства не изменены. Transport/release/deployment в этой задаче не создавались; проверки используют именованный disposable MODX 2-стенд.

## Проверки

- PHP 8.1.34, 8.2.34 и 8.5.10: по 70 assertions PASS, включая ошибку save и commit, без Node/npm во время сборки.
- Manager/native MODX 2.8.8 + PHP 8.2.34: 11 сценариев, 79 assertions PASS. Проверены fallback, успешный timestamp, skip, force RU/EN, сохранение прежнего состояния при ошибке, отсутствие рекурсии и обновление кешированного HTML/JS.
- Differential: 49 сценариев, 253 assertions PASS.
- Source/build invariants: 67 assertions PASS; дополнительно 197 файлов byte-identical относительно базы задачи.
- JS semantics (regex/division/ASI/templates/optional chaining/nullish/Unicode): PASS.
- PHP lint, JS syntax и `git diff --check`: PASS.
- Основные регрессии: 20 наборов PASS, 0 failures, включая Manager/i18n/permissions/UX, frontend, audit, maps, pixels, callbacks и clientId.

Детальные результаты: `docs/evidence/modx2-bundle-timestamp-results.json`. Первоначальный event probe не учитывал кеш event map Manager; исправлена инициализация тестового probe через штатное обновление context_settings. Assertions подсчёта событий сохранены. Регрессии повторены после переноса финального кода в `/opt/cc-source`: тест Manager i18n переустанавливает компонент из этого checkout, и снимка кода в `/tmp` для него недостаточно.

Реальное воспроизведение YouTube/RUTUBE/VK этой задачей не проверяется; прежние три SKIP не переведены в PASS. Публикация и обновление версии на одном фиксированном пути — последовательные административные операции, а не распределённая транзакция с файловой системой при аварийном завершении процесса.
