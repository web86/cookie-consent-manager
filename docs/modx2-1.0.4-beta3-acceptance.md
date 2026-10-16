# MODX 2 1.0.4-beta3 — legacy auto-load

Проверки: 15–16 октября 2026. База: `7cad272e57ff6f4f695b2af1e20e919e15bad5b5`, ветка `codex/modx2-universal-services`. Использована существующая локальная инвентаризация `docs/modx2-frontend-inventory.md`; этот исходный отчёт не изменён и не включён в commit исправления. MODX 3 не менялся. Выделение service-loaders/embeds и видеосервисы не входят в исправление. Merge, push, GitHub Release и deployment не выполнялись.

## Причина

`buttons.accept` передавался в `data-cc-show-accept` и управлял только видимостью кнопок. `initialize()` вызывал `applyConsent()` только при найденном сохранённом выборе. SDK gate, карты и `onAllowed()` требовали `consent.categories[assignedCategory] === true`. Поэтому кнопка «Принять» давала такой же момент запуска, как «Принять все»: только после клика. Инвентаризация правильно выявила эти отдельные пути; большой рефакторинг для их согласования не потребовался.

## Два режима и состояние

| Условие | Выполнение |
| --- | --- |
| `buttons.accept === false` (default) | Прежний строгий consent-first: до разрешения нет необязательных SDK/iframes/callbacks. Configure, Accept all, Reject, Save, restore и revoke сохраняют контракт. |
| `buttons.accept === true`, положительно установлен первый визит | После проверки DOM/реестра, чтения storage и подготовки карт запускаются включённые экземпляры видимых **назначенных** категорий. Баннер Accept/Reject остаётся. Configure/Accept all скрыты по прежнему правилу. |
| Сохранённый отказ / частичный выбор | Используется только валидный выбор; legacy его не расширяет. |
| Просрочка / другая policy / stale category versions / ошибочный JSON | Legacy exception выключен. Применяются прежние консервативные правила reconsent. Остальные действующие категории сохраняются. |
| Исторический consent | Прежняя консервативная миграция полных категорий и архив исходного JSON; auto-load не заменяет отсутствующие разрешения. Архив без основной записи также исключает первый визит. |
| Ошибка чтения storage | Первый визит нельзя подтвердить, auto-load выключен. |

В `consent-manager.js` `runtimeAllowed(category)` объединяет разрешение категории, видимость, legacy exception и остановку перед reload. Та же функция передаётся в `provider-registry.apply()`; `allowed()`, async SDK checks, карты и `onAllowed()/stillAllowed()` используют согласованное разрешение. Проверяется категория экземпляра, без связи с исходной категорией адаптера. Новый `service-loaders.js`, новый тип embed и индивидуальные provider grants не добавлялись.

Persisted consent остаётся `categories_v2`; до клика `getConsent() === null`, основной ключ localStorage не создаётся. Ранее существовавший технический consent ID может сохраняться отдельно. `openSettings()` показывает фактический выбор, без предварительных legacy-галочек. Никакого технического startup-события в юридический журнал не добавлено, schema 3 и PHP validator не менялись.

Accept сохраняет явное разрешение видимых категорий и отправляет один `accept`. Reject сохраняет отказ и отправляет `reject`; runtime gate и guards блокируются синхронно, карты удаляются, очереди Meta/VK отзываются по прежнему механизму. Reload ждёт ACK либо максимум 900 мс. При legacy-first Reject выполняется reload даже при отсутствии видимых категорий. Следующая загрузка соблюдает отказ. Save, уменьшающий effective permission, также вызывает revoke/reload. Dedup scripts/SDK и одноразовые callbacks сохранены.

## Артефакт

Native MODX `modPackageBuilder`, signature **cookieconsent-1.0.4-beta3**. Версия увеличена через `_build/package.json`, runtime version сгенерирована штатным builder. RU/EN предупреждение добавлено в существующий Manager help; встроенное руководство и README объясняют оба режима.

- ZIP: `.local/artifacts/cookieconsent-1.0.4-beta3.transport.zip`.
- SHA256: `0e55b968695fc1ad9c04becca1037218c385e836dad5a63d489a61f523cae95d`.
- 140 ZIP entries, 73 native vehicles (14 object, 57 file, 2 script), 57 runtime files.
- JS: 21 944 bytes, SHA256 `c641196439d5b187461df049018245ec2ad73f9b2723073955b434a2a5ccf796`.
- Два независимых native build после ZIP normalization побайтно совпали. Прежние beta1/beta2 ZIP не переписывались.
- [Изменённые файлы](modx2-1.0.4-beta3-files.txt). Итоговый commit SHA указан в ответе вместе с артефактом; отчёт не содержит собственного SHA, меняющегося при коммите.

## Проверки

**Итог: 0 неустранённых FAIL.** Полные локальные evidence: `.local/legacy-autoload-evidence/`, `.local/universal-evidence/regression/`, `.local/fenom/evidence/`. [Сводка без журналов и credentials](evidence/modx2-1.0.4-beta3.json) содержит финальные результаты и сведения о повторных проверках.

| Проверка | Результат | Объём |
| --- | --- | --- |
| Legacy browser: startup, отсутствие фиктивного согласия/accept, visibility, disable, restore, revoke/reload, Google site defaults и pending SDK | PASS | 24 сценария, 176 assertions |
| Каждый адаптер в каждой назначенной категории, включая maps/custom_js | PASS | 30 сценариев, 330 assertions |
| Настоящие SDK: direct/legacy, cookies, init, запросы, независимые Google denied/granted, последующий отказ | PASS | 10 сравнений, 177 assertions |
| Native fresh/install/upgrade beta32/reinstall/uninstall, сохранение IDs/метаданных/данных | PASS | 7 сценариев, 220 assertions |
| Native beta1 → beta3 и beta2 → beta3: точные bytes consent, отказ, partial, expiry, settings/logs, content hash | PASS | 2 перехода, 64 assertions |
| Native PHP 8.1.34 / MODX 2.8.8: все runtime payload hashes, SDK init и Reject/ACK/reload | PASS | 68 assertions, 57 файлов |
| Legacy/strict, RU/EN, modParser/pdoParser/Fenom, split/legacy snippets, cold/warm cache и bundle hash | PASS | 24 сценария, 480 assertions |
| Существующая Fenom browser suite, включая восстановление старого consent и ошибки JSON | PASS | 31 сценарий, 768 assertions |
| Текущий universal regression runner | PASS после точечного повтора | 20 suites: 19 сразу, Manager UX после восстановления fixture |
| Повтор Manager UX | PASS | 15 сценариев, 113 assertions |
| Native Manager system settings | PASS | 4 сценария, 13 assertions |
| Beta2 acceptance suite на новом контракте Accept | PASS | 11 сценариев, 130 assertions |
| Stable → current native public-registry migration | PASS | 6 сценариев, 59 assertions |
| Документированные integration examples | PASS | 5 сценариев, 22 assertions |
| PHP category/audit/visibility/URL contracts | PASS | По 3 268 assertions под PHP 8.1.34 и 8.2.34 |
| PHP/Fenom regression и syntax | PASS | 12 PHP suites; lint 106 PHP и syntax 115 JS/MJS файлов |
| Frontend manifest, generated version/guide, native ZIP verifier и reproducibility | PASS | 7 inputs, 2 outputs; 2 одинаковых native ZIP |
| Реальные кабинеты и опубликованные теги GTM-контейнера | SKIP | Пользователь подтвердил отсутствие принадлежащих ему тестовых ID |
| Production hosting, Safari/Firefox/mobile и юридическое одобрение | SKIP | Отдельные release gates ниже |

Первый общий прогон выявил остаточный origin PHP81 fixture `18981` в общей clean-БД, тогда как Manager UX использует `8889`. Настройка стенда восстановлена с сохранением private key/журналов; affected suite повторена успешно, PHP81 helper теперь восстанавливает исходные настройки. Исторические Fenom assertions обновлены с top-level boolean на `categories_v2`; интервал OPcache учтён при быстрых переключениях cache-матрицы. Production-код аудита не менялся. Первичные логи не переписывались; сводка различает начальный результат и успешный повтор.

Контролируемые SDK fixtures дополнены исполнением **настоящих** публичных Google/Yandex SDK: JavaScript скачан через curl с проверкой TLS и воспроизведён в Chromium без изменений. Вся телеметрия отвечалась локально, без доставки данных в кабинеты. GA4 в обоих вариантах создаёт `_ga`/`_ga_LEGACY0001` и `page_view`; Ads — `_gcl_au`/`_gcl_aw` и обычные processing requests; Метрика — `_ym_d`/`_ym_isad`/`_ym_uid`, watch-запросы и рабочий `getClientID`. При независимом denied реальные Google runtime state и cookies совпадают с прямой установкой; при granted тоже нет добавленных CMP ограничений. После явного отказа проверены реальные Google denied states и отсутствие SDK в новом документе после reload.

Синтетический GTM ID подтверждает bootstrap runtime и отсутствие дополнительных CMP consent flags, но не исполнение опубликованных клиентских тегов. Случайный запрос Google `/td` сохраняется в evidence отдельно и исключён из сравнения стабильных processing endpoints. Уже начатые асинхронные child-запросы SDK предыдущего документа не выдаются за новый bootstrap CMP после reload. Наличие одного script-тега не используется как доказательство работающей аналитики.

## Ручная проверка

1. На staging сделать backup. Установить именно beta3 native ZIP в Package Manager, сверить SHA. Очистить MODX/Fenom/HTML/CDN cache; при необходимости сбросить PHP OPcache штатным способом. Проверить content-hash URL и фактические байты bundle.
2. В Manager выключить старую кнопку, включить нужные категории/сервисы. В новом профиле DevTools → Network (Preserve log, Disable cache): до выбора нет необязательных SDK/iframe. Настроить одну категорию, Save: стартуют только её включённые экземпляры. Accept all/Reject/reopen/отзыв сохраняют прежнее поведение.
3. Включить старую кнопку, Save. В новом профиле **без ранее сохранённого выбора** SDK видимых категорий стартуют до клика; проверить HTTP response и вызов init отдельно. Например, Метрика в analytics и маркетинговые адаптеры в marketing. Выключенный сервис и сервис скрытой категории не запрашиваются.
4. До клика проверить `web86CookieConsent.getConsent()` (`null`), отсутствие основного `web86_cookie_consent` в localStorage, отсутствие accept в Network/журнале. Технический `_id` не является согласием. В legacy CMP не должен добавлять ни denied, ни granted consent-команды, менять независимые site/container defaults или добавлять cookie_consent в gtm.js. Обычные параметры config сохраняются.
5. Нажать Accept: основной consent появляется с видимыми категориями, schema 3 `accept` получает HTTP 200/ACK с тем же event_id и ровно одну JSONL запись. SDK не стартуют повторно. Reload восстанавливает выбор.
6. В другом новом профиле с legacy auto-load нажать Reject: guard сразу false, затем reload. Сохранённые категории false; новых SDK/карт после reload нет. Повторить со старым отказом и частичным выбором; legacy не расширяет их. Уже отправленные запросы не могут быть отменены.
7. Сохранить выбор, изменить включённый сервис/путь/назначение через Manager: версия соответствующей категории увеличивается. Reload требует нового выбора, не загружает новые обработки без него. Проверить истёкший TTL, старую policy и исторический consent. Не очищать старые записи ради имитации returning visitor.
8. Перенести карту и custom_js в другую категорию: в обоих режимах они следуют назначению. Проверить `onAllowed()` со scoped service и `stillAllowed()` после await/отказа. Выключить legacy, открыть новый профиль: строгий режим возвращается.
9. Повторить RU/EN, cold/warm PHP/Fenom cache, upgrade с имеющимися настройками/журналами и клиентскими шаблонами. Для настоящих SDK использовать принадлежащие владельцу тестовые IDs и утверждённый план приёмки.

## Consent Mode и приватность

Legacy auto-load намеренно разрешает запуск стороннего кода до выбора; для Метрики, пикселей, карт и произвольного custom_js это может означать запросы и обработку до согласия. Компонент не является sandbox и не ограничивает прямые подключения вне CMP. Соответствие выбранного режима требованиям конкретного сайта проверяет владелец до production.

Google script permission и юридический выбор разделены. Согласно уточнению заказчика, на первом legacy-визите CMP **не отправляет ни одной** Google consent default/update команды (ни denied, ни granted), не урезает `allow_google_signals`/`allow_ad_personalization_signals` и не добавляет `cookie_consent` в `gtm.js`. Обычные заданные администратором параметры используются как при прямой установке. Независимые site/container Consent Mode команды сохраняются. После явного выбора CMP применяет выбор посетителя; при Reject отправляется denied и удаляется только собственная ожидающая bootstrap/config работа, чужая очередь не очищается. При следующем визите с сохранённым выбором действуют прежние ограничения; строгий режим не менялся.

Это намеренно допускает cookies, персонализацию и обработку до согласия, если они разрешены обычными настройками SDK и независимо заданным Consent Mode сайта. CMP не обещает полноценную обработку вопреки внешним ограничениям: существующий denied от сайта/контейнера остаётся действующим. [Официальная инициализация Google tag](https://developers.google.com/tag-platform/gtagjs/configure) использует js/config с обычными параметрами; [Consent Mode](https://developers.google.com/tag-platform/security/guides/consent) — отдельное управление согласиями. Legacy здесь **не consent-first и не юридически безопасный режим по умолчанию**. Для GTM контейнер и его теги отдельно определяют фактическое поведение. Пользователь подтвердил отсутствие принадлежащих ему тестовых ID; доставка событий и работа реальных тегов контейнера остаются SKIP.

Отзыв не отменяет ранее отправленные запросы и уже выполненный произвольный JS; созданные сторонними SDK cookies не удаляются универсально. Async-код владельца должен проверять `stillAllowed()` перед сетью и после каждого await. Если браузер запрещает запись выбранного состояния, сохранение между визитами нельзя гарантировать; предупреждение о storage сохраняется. В legacy auto-load браузер без доступного для чтения storage работает консервативно.

## Production release gates

- Ручная staging-приёмка точного ZIP на шаблонах и hosting клиента, fresh/upgrade/rollback backup, PHP 8.1/8.2, cold/warm OPcache, MODX/Fenom, HTML/CDN cache и content hashes.
- Подтверждение владельцем допустимости включённого legacy auto-load и RU/EN текстов до обработки реальных посетителей.
- Настоящие SDK с разрешёнными тестовыми аккаунтами: успешная загрузка, init, события в кабинетах, отсутствие дублирующих прямых scripts/noscript; отдельная проверка GTM consent checks и GA4/Ads при denied/granted. Отсутствие cookies не означает отсутствие передачи данных.
- Safari/Firefox/mobile, CSP и блокировщики, клиентские формы/карты/custom wrappers, ошибки storage/сети, отзыв во время async SDK и bounded reload.
- Реальный audit endpoint: Origin/ACK/event_id, одна запись, права/HTTP-защита каталогов, сохранение истории, доступ Viewer/CSV, retention/backup владельца.
- Отдельное одобрение production release/deployment. Эта задача не включает публикацию или выкладку.
