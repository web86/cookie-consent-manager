# beta31 — приёмка GTM, VK Ads, Meta Pixel и публичных кнопок

Дата: 2026-10-13. Ветка `feature/modx2-frontend-bundle`, база `bd6d3b1` (beta30), реализация `828fd0f`. **GO только для review.** Main, production и GTM workspace компонентом не изменялись.

Финальная регрессия: **465 сценариев/проверочных suite entries, 3281 assertions, 0 FAIL**. Отдельный обнаруженный FAIL настройки контейнера версии 3 сохранён в evidence; после исправления владельцем версия 4 проходит реальные тесты. Количество включает PHP/build suites как один entry, а не выдаёт каждую assertion за отдельный сценарий.

## Исправление GTM

Причина несоответствия — дополнительный all-category/all-provider guard в `start()`, поверх штатной проверки `marketing` и собственного fingerprint. Он удалён. GTM запускается при разрешённом маркетинге и совпадении fingerprint контейнера; аналитика/внешний контент могут оставаться выключенными. Формат fingerprint, migration/TTL/reconsent и видимость пустых категорий не менялись.

Перед загрузкой контейнера очередь содержит denied defaults Consent Mode v2, затем отдельные состояния категорий, затем `gtm.js`. `analytics_storage` следует аналитике; три рекламных разрешения следуют маркетингу. `cookie_consent` в событии содержит фактические значения. Default задаётся один раз; последующие изменения обновляют состояния без повторного запуска контейнера. Отзыв обновляет состояния и использует существующий reload. Состояние аналитики сохраняется отдельно при отзыве маркетинга.

Прямые GA4/Ads адаптеры сохраняют свои provider checks и privacy options. RU/EN подсказка GTM требует настройки consent checks тегов. Consent Mode не обещает блокировку произвольного Custom HTML/сторонних тегов. Для полного запрета аналитических запросов внутри контейнера необходим дополнительный `analytics_storage` check, а не только встроенное поведение Google tags. [Официальные настройки GTM](https://support.google.com/tagmanager/answer/10718549?hl=en), [порядок consent commands](https://developers.google.com/tag-platform/security/guides/consent).

## Реальный контейнер владельца

Проверен опубликованный **GTM-WJD8XJD6, версия 4** на настоящем локальном MODX 2.8.8-pl. Загружается реальный `gtm.js`, а не stub. Остальные внешние запросы перехвачены, реальные назначения Analytics/Ads не проверялись. Маркетинговый Custom HTML увеличивает `window.__ccGtmTest`; аналитический — `window.__ccGtmAnalyticsTest`, с `consent: [list, analytics_storage]` в опубликованном resource. Наблюдаются и очередь до SDK, и обработанные состояния реального GTM runtime.

| Сценарий | Статус | Результат |
|---|---|---|
| До выбора | PASS | Внешних запросов нет |
| Только маркетинг + Save | PASS | Один SDK; маркетинговый тег 1, аналитический 0; analytics_storage denied |
| Только аналитика | PASS | GTM не загружается, оба тестовых тега 0 |
| Все категории + Accept all | PASS | Оба тега по 1, отдельные Consent Mode states granted |
| Все категории + Save | PASS | Такое же выполнение, как Accept all |
| Отказ | PASS | GTM и тестовые теги заблокированы |
| Повторный apply и reload | PASS | Повторный apply не запускает тег; на новой странице один запуск, без дублей |
| Отзыв маркетинга + Save | PASS | Reload; GTM/тестовые теги заблокированы |
| Разрешение аналитики при уже загруженном GTM | PASS | Consent Mode обновлён без нового gtm.js/маркетингового тега |
| Отзыв маркетинга при разрешённой аналитике | PASS | До reload analytics_storage granted, три ad states denied; после reload GTM заблокирован |
| Изменённый ID / новый экземпляр | PASS | Новые fingerprints не наследуют прежнее разрешение |
| GTM E2E suite | PASS | 9 сценариев / 126 assertions |

Версия 2 содержала только маркетинговый тест. В версии 3 владелец добавил аналитический тест без дополнительного check: он выполнялся при одном маркетинге. **FAIL:** 5 из 9 сценариев остановились на этой проверке предусловия. Этот результат не превращён в PASS и не удалён из отчёта. Владелец добавил `analytics_storage` check и опубликовал версию 4; полный повторный прогон проходит. Код компонента между этими публикациями не менялся.

## Остальные изменения beta31

`vk_ads` и `meta_pixel` — marketing, numeric ID, выключены по умолчанию, штатные RU/EN Manager cards и дополнительные экземпляры. Новые выключенные карточки предлагаются GET без переписывания сохранённого реестра; они сохраняются обычным Save. Связанный Mail.Ru SDK загружается один раз. Активные Mail.Ru/VK с одинаковым числовым ID, включая ведущие нули, отклоняются PHP, JS и Manager с понятной ошибкой.

Meta использует fbq queue/callMethod, `autoConfig=false` перед init, один init/PageView через trackSingle на каждый уникальный разрешённый ID. Нет Advanced Matching, CAPI, form/ecommerce/custom events. Отзыв посылает consent revoke; pending Meta/VK события отменяются до завершения SDK. Эти проверки используют контролируемые SDK mocks и сетевой перехват; настоящая доставка Meta/VK не выдаётся за проверенную. [Официальная реализация Meta API](https://github.com/facebook/GoogleTagManager-WebTemplate-For-FacebookPixel/blob/457a9e0c6d0a2288375e33a49f61756257158e63/template.tpl). Страница developers.facebook.com/get-started при чтении возвращала 429; её успешное изучение не заявляется.

Автоматического settings opener больше нет в split/legacy. Сохраняются ручной `[data-cookie-settings-open]`, динамически добавленная кнопка и `web86CookieConsent.openSettings()`. У карт отсутствуют revoke controls/handlers; отзыв через общие настройки удаляет iframe и возвращает заглушки после reload. `map_allow` и прежние audit schemas сохранены. Старые translation keys оставлены для совместимости настроек, даже если соответствующая кнопка больше не выводится.

## Регрессия

| Проверка | Статус | Подтверждение |
|---|---|---|
| 256 комбинаций исходных восьми провайдеров | PASS | Полная browser suite: 281 сценарий / 1419 assertions; 3434 first-party HAR requests, 0 external в mock matrix |
| Пиксели / все A-M states / 16 subsets / pending revoke / fingerprints | PASS | 32 сценария / 175 assertions, контролируемые SDK; реальные browser ACK + месячная запись с IP/UA |
| Manager VK/Meta RU/EN / ID / Save/reload / дополнительные ID / конфликт / GTM warning | PASS | 4 сценария / 48 assertions; GET и POST настоящего MODX Manager |
| Сериализация GA4/Ads/GTM/Mail.Ru/Метрики, booleans и corrupt configs | PASS | 16 сценариев / 295 assertions |
| CMP i18n / preview / тексты / permissions / responsive | PASS | 17 сценариев / 60 assertions |
| SSR RU/EN/TR, overrides/HTML/delimiters, head/footer и cache busting | PASS | Frontend 9 / 77; RU/EN cold/warm и no-JS 4 / 112 |
| Live URL guards и SDK параметры | PASS | 11 / 51 и 4 / 18, SDK fulfilled locally |
| Audit Viewer / CSV / поиск / история / ACL / XSS | PASS | 11 / 77; отдельный PHP Viewer 62 assertions |
| PHP receiver / schema 1/2 / Origin / ACK / replay / concurrency / rate / path/file guards | PASS | 37 / 121, настоящий PHP endpoint и JSONL |
| Ограниченное Manager право | PASS | 1 / 4; view-only Viewer также проверен |
| Общий Save журнала / частичный Save / unavailable receiver / очистка пути | PASS | 9 / 60; локальная проверка не зависит от self-request |
| MODX core вне webroot / обычная очистка cache / отсутствующий каталог / ручное удаление cache | PASS | 4 / 22, error.log и архивы сохранены |
| PHP registry / SSR / settings compatibility | PASS | 36 + 47 + 53 assertions |
| Native clean без категории / существующая категория / beta30 upgrade / reinstall / uninstall | PASS | 7 / 216, реальные Package Manager processors; IDs/categories/properties/settings/config/keys/logs сохранены |
| Final native reinstall основной fixture | PASS | 87 assertions; старый Registry, настройки, private config, ключи, журналы и пользовательские метаданные сохранены |
| Syntax / runtime / reproducibility | PASS | 59 syntax checks; 55 установленных hashes; две независимые byte-identical сборки |

Все shared-fixture tests запускаются последовательно. До финального прогона возникли два development-сбоя: повторно собранная с той же сигнатурой resolver была закэширована OPcache; frontend hash test сравнил уже пересобранный source с предыдущим установленным кандидатом. После restart локальной fixture, установки окончательного ZIP и повторного прогона native/frontend/matrix проверки проходят. Released ZIP не заменялся. Эти особенности не являются обещанием атомарного rollback при файловом сбое.

## Пакет и обновление

Immutable ZIP: `.local/release/cookieconsent-0.1.0-beta31.transport.zip`, read-only.

SHA256: `aff907145f3cec7a51cc072661fccdc80619477b82f37ae4b60bbb618fd87ec4`.

Native transport: **71 vehicles = 14 object / 55 file / 2 script; 136 ZIP entries**. Пять canonical элементов обновляются на месте; stock-копии и MODX plugins/events не добавлены. Чистый реестр содержит 9 выключенных сервисов. Старый Registry сохраняется и не вызывается. Beta30 immutable archive не изменён.

Публичный JS: 18599 bytes, SHA256 `1a2ac00ab2d8570c8d3faa16c7b1e0c18ec6b8464c9e8fa2da29cd25ab861579`. CSS: 3286 bytes, SHA256 `9d5ba1e5c0e6e1394806309a04f31a7d7a1b94acbed88ffca5ade89cef61ff88`. Locked esbuild 0.28.2; minification только при build; content hashes используются для cache busting.

Перед staging сохраните DB, пользовательский код элементов/static sources, runtime и журналы. Установите ZIP штатным Package Manager, очистите кэш MODX, выполните hard reload Manager. Проверьте сохранённые пути/keys/переводы/ID и собственные GTM tag checks. Добавьте собственную кнопку настроек; она больше не создаётся автоматически. Split вызывает Assets один раз в head и Banner один раз перед закрытием body; legacy остаётся отдельной альтернативой. [RU/EN инструкция и ручной VK-тест](modx2-beta31-integration.md).

## NOT RUN

- Доставка событий в реальные Google Analytics/Ads назначения из GTM: проверены безопасные Custom HTML тестовые теги владельца и их consent checks.
- Реальная доставка Meta и фоновая работа настоящих Meta/VK SDK, получение события в VK кабинете. Для VK нужен действительный пиксель владельца; ручная процедура документирована.
- Production/staging deployment, реальные hosting/CDN/browser caches, Firefox/WebKit, другие PHP/MODX, Windows/IIS/LiteSpeed.
- Повторная полная nginx/reverse-proxy матрица и lifecycle failure injection для beta31; receiver/log implementation не изменена, локальные текущие проверки выполнены на Apache.
- ENOSPC, power loss, DB outage и произвольные FS races; универсальный атомарный rollback не обещается.

[Безопасный results JSON, включая FAIL версии 3](evidence/modx2-beta31-results.json), [ZIP inventory](evidence/modx2-beta31-zip-inventory.json). Рекомендация — review, затем staging с собственными ID/backup/tag consent checks. Production GO не выдаётся.
