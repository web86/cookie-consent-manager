# Cookie Consent Manager: MODX 2 Manager/i18n — локальная приёмка

Дата: 12 октября 2026, Europe/Istanbul. Ветка `feature/modx2-manager-i18n`, создана от неизменённого baseline `7f9d11e359e4ccc0e647c88ff9706fedf80233e5` (`feature/modx2-provider-registry-maps`). Работа выполнена локально, история не переписана, main/рабочий сайт не изменялись. Ветка не публикуется в этом milestone согласно ограничению «работа только локально».

**GO для review. GO для staging. NO-GO для production** до проверки реальных SDK/аккаунтов, GTM контейнера, всех рабочих шаблонов/CSP, интеграции с реальными формами, доступности и окончательной политики доступа. Эти проверки не заменяются локальными mock/stub и ниже отмечены NOT RUN. Большой Viewer журнала сознательно не реализован: это следующий milestone по заданию.

Установка/обновление: [README](../README.md). Источники настроек, типы, миграция fingerprint, languages/fallback/permissions/санитизация: [архитектура](modx2-manager-architecture.md). Точные результаты каждого сценария: [санитизированное evidence](evidence/modx2-manager-i18n-results.json). Предыдущий [отчёт M3](modx2-m2-maps-acceptance.md) сохранён как история, его данные не выданы за новые тесты.

Локальный коммит реализации: `3488b81` (`feat(modx2): add manager component, safe preview and multilingual consent UI`). Отчёт, screenshots и evidence оформлены отдельным коммитом документации.

## Реальная среда

Оригинальный локальный MODX Revolution **2.8.8-pl**, PHP **8.2.34**, MariaDB 10.6, Apache/Docker, Node 22, Playwright **1.62.1**, Chromium. Root URL `http://127.0.0.1:8888/`, отдельная тестовая БД, приватный MODX core/config/logs вне DOCUMENT_ROOT. Settings/menu/resource/controller/processors — настоящие MODX/xPDO, не mocked `$modx`. Ни production credentials, ни журналов/IP клиентов не использовалось.

До изменения поведения повторены все baseline-наборы: Playwright 281/1161, HTTP 36/118, native Manager 4/9, live guard 11/50, PHP 80 — без ошибок. Логи исходного прогона находятся в `.local/baseline/`. После изменений эти наборы повторены снова; указанные ниже финальные числа относятся к новому коду.

Команды, реально выполненные последовательно:

```sh
# После sync локальных исходников + CLI install и provision fixture
node tests/manager-i18n.mjs
node tests/manager-permissions.mjs
node tests/provider-parameters.mjs
node tests/http.mjs
node tests/browser.mjs
node tests/manager.mjs
node tests/live-guard.mjs
docker compose --env-file .local/private/compose.env -f tests/local/compose.yaml exec -T -u www-data web php /opt/cc-source/tests/php.php
docker compose --env-file .local/private/compose.env -f tests/local/compose.yaml exec -T -u www-data web php /opt/cc-source/tests/manager-i18n-php.php
node tests/manager-i18n-summary.mjs
```

Также выполнены JS/PHP syntax checks и `git diff --check`. Все SDK-запросы либо запрещены, либо полностью fulfilled локальными Playwright responses до доступа к провайдеру. Gravatar аватара MODX Manager abort в браузере; публичный компонент его не подключает. Raw HAR, credentials и JSONL остаются в `.local/`, не коммитятся.

## Реализовано

- Namespace, меню Cookie Consent Manager, native MODX controller и class processors. Приватный код core, публичные first-party CSS/JS/connector. Permission `cookie_consent_manage`, mgr-session и MODAUTH token на API. Проверен и вошедший непривилегированный пользователь, а не только отсутствие session.
- Четыре вкладки и sticky right preview; ниже main при небольшом viewport. Explicit Save, draft indicator, success/error, revision conflict защита, транзакционное сохранение. Ошибка API не уничтожает введённые значения.
- General: TTL, policy version, private log_dir, все четыре переключателя. Legacy Accept принудительно выключает конфликтующие effective buttons на сервере и в клиенте; raw предыдущие preferences сохраняются. Reject независим. Settings opener всегда доступен, включая automatic fallback при отсутствии template opener.
- Services: три группы, отдельный enable/details для каждой записи, настройка параметров без знания JSON, добавление extra records через approved adapters. Fresh component installation все optional off; upgrade values сохраняются.
- Yandex: ID, webvisor/clickmap/trackLinks/accurateTrackBounce/clientId и privacy masking warning. Исторический Webvisor восстановлен как default parameter, запуск требует нового per-provider разрешения. Explicit старые boolean values не переопределяются.
- GA4: Measurement ID, send_page_view, signals/personalization flags. Enhanced Measurement не изображается как локальная настройка, Webvisor отсутствует. Ads: Conversion ID, personalization, restricted_data_processing. GTM: Container ID, warning, прежний строгий gate. Mail.Ru: только реальный ID. Maps: title visibility, отдельные provider permissions и переводы описания/кнопок.
- Texts: стандартные ru/en lexicons, dynamic MODX language inventory, безопасные custom codes, local overrides отдельно от файлов пакета, plain HTML source editor/textarea, per-field Restore и fallback indicator. Frontend язык берётся из context cultureKey, системный Manager язык — из manager_language; preview language не настройка посетителя.
- HTML DOM allowlist sanitizer; запрещены active tags/styles/events/unsafe URLs. Relative/HTTP/HTTPS anchors сохраняются. User strings передаются JSON с escaped MODX/Fenom delimiters; серверные parsers не вызываются.
- Preview: только server-cleaned unsaved draft, public cookie CSS/markup, настоящий HTML/anchors, buttons, categories/providers/maps. Sandboxed no-script iframe + CSP none; ссылки не выходят из sandbox. Не загружаются SDK/внешние карты, не генерируется consent/audit.
- Fingerprint v2: stable purpose + canonical effective privacy config, без locale/display text/show_title. Перевод сохраняет permission, Webvisor/ID/privacy flags инвалидируют конкретный сервис. После изменения granted config баннер запрашивает новый выбор. Consent_id и JSONL schema 1/2 сохранены, архивы не удаляются.
- Logs: объяснение хранения и безопасный path; search/view/export не включены в этот этап.

## Новые gates и результаты

| Gate | Статус | Что фактически проверено |
|---|---|---|
| Fresh install menu/options/texts/default off + upgrade preserve | PASS | удалены только settings disposable компонента, CLI install на настоящем MODX, полный snapshot восстановлен; namespace/action/menu проверены |
| RU/EN CMP + initial system edit locale | PASS | собственная страница открыта в обоих языках, tabs/text labels/default language asserted, screenshots |
| MODX inventory и custom languages | PASS | >20 реальных language dirs, tr/ja; добавлены tr и pt-br, PHP custom-site/x-private valid; опасные codes rejected |
| Unsaved language switch + save/fallback | PASS | tr reject перевод пережил switch; frontend tr и incomplete fallback, frontend en stock |
| Единый HTML source / links / sanitizer / tags | PASS | source сохраняется целиком, safe anchor есть; script/img/onclick/javascript удалены; [[!CookieConsentRegistry]] и {php}... отображаются буквально |
| Services groups/individual options/no global select | PASS | три группы, восемь fixture records, inline Yandex details; создание дополнительного GA adapter record через группу |
| Service display edit → unsaved preview → public name | PASS | имя введено в Services, совпало в preview до Save и на frontend после Save |
| Webvisor и Google init parameters | PASS | реальные вызовы queued live adapters в браузере с local stub: exact Yandex boolean object/no ClientID при false; GA4 send_page_view, signals gate; Ads privacy flags; single gtag; GTM partial off |
| Privacy change и перевод | PASS | после webvisor изменения нет yandex request/permission; title translation и cultureKey change сохраняют consent_id/providers |
| Legacy mode/restore/server enforcement | PASS | disabled checkboxes, скрытые conflicting preview/frontend buttons, raw preferences при Save, восстановление при выключении |
| Preview contents/styles/network isolation | PASS | unsaved HTML/кнопки, enabled providers/maps совпали; sandbox empty; нет mock/audit/provider network; public CSS используется inline |
| Save failure retains draft | PASS | simulated 503, TTL input остался; последующее Save успешно |
| Unauthorized/CSRF/permission denied | PASS | no session/no MODAUTH rejected; настоящий non-sudo mgr token без permission отвергнут, форма отсутствует |
| Responsive + source editor | PASS | 850px aside ниже main; обычный textarea, screenshots и визуальная оценка; WYSIWYG не подключён |
| Все прежние категории/provider/map/audit/JSONL/security | PASS | финальная старая матрица повторена: 8 category combinations и все 256 provider combinations |
| Реальные SDK/Google Signals/Ads/Yandex server behaviour | NOT RUN | наружные запросы полностью intercepted; queue/config gates проверены, vendor execution нет |
| Реальный GTM container/tag audit | NOT RUN | требуется staging test account/container review перед live enabled |
| Optional CodeMirror source editor variant | NOT RUN | совместимый editor в fixture не установлен; textarea path проверен |
| Установленный Fenom middleware | NOT RUN | его нет в fixture; parser-free architecture, delimiter escaping и literal DOM tested |
| Рабочие templates/forms/CSP/hosting/proxies | NOT RUN | только disposable MODX, production не использовался |
| Manual screen reader/WebKit/Firefox/mobile hardware | NOT RUN | Chromium/keyboard/viewport и screenshots не заменяют эти проверки |
| Multi-node DB/FS, real power loss/disk-full | NOT RUN | унаследованные failure/locking tests локальные, не инфраструктурная аттестация |

## Screenshots

[Основные RU](screenshots/manager-i18n/manager-ru-main.png), [Сервисы RU](screenshots/manager-i18n/manager-ru-services.png), [Тексты RU](screenshots/manager-i18n/manager-ru-texts.png), [Журнал RU](screenshots/manager-i18n/manager-ru-logs.png).

[General EN](screenshots/manager-i18n/manager-en-main.png), [Services EN](screenshots/manager-i18n/manager-en-services.png), [Texts EN](screenshots/manager-i18n/manager-en-texts.png), [Log EN](screenshots/manager-i18n/manager-en-logs.png).

[HTML source и preview](screenshots/manager-i18n/html-source-and-preview.png), [Yandex individual settings](screenshots/manager-i18n/services-yandex-settings.png), [Map preview](screenshots/manager-i18n/preview-map.png), [Map canvas](screenshots/manager-i18n/preview-map-canvas.png), [Banner preview](screenshots/manager-i18n/preview-banner.png), [Responsive](screenshots/manager-i18n/manager-responsive.png).

Screenshots показывают fake acceptance пользователя/local paths; не содержат secret/token/password или клиентских данных. Native chrome MODX может сохранять user/session language, компонент по заданию читает системную настройку прямо, не берёт язык из stale web/context cache.

## Проблемы, исправления и ограничения

1. Native modMenu text — primary key; mass assignment по умолчанию его игнорирует. Исправлено explicit set; создание меню реально проверено.
2. Для MODX 2.8 class processors нужны .class.php. Flat processor первоначально вернул classname как текст; исправлено до финальных результатов. Bootstrap token подаётся native controller, исключая race с MODx layout initialization.
3. Context/session cache мог дать RU при manager_language=en. System language теперь читается через modSystemSetting; frontend culture независим, тесты RU/EN проходят.
4. Empty locale PHP array первоначально рисковал терять строковые свойства при JSON.stringify в браузере. Empty translation object сериализуется как object, и fallback/сохранение проверены.
5. Preview references первоначально изменяли temporary coalesced array; исправлены enabled flags, добавлены assertions содержимого. Ошибочные промежуточные прогоны не выданы за PASS.
6. Limited-user fixture требовала modUserProfile.internalKey и JSON Access Policy как array, не double-encoded string. Исправлена; проверка теперь подтверждает валидный mgr token и именно permission refusal.
7. Новая fingerprint revision означает один повторный per-provider выбор при миграции M3. Старый ID/журналы сохраняются. Перевод после миграции не инвалидирует permissions. Изменение фактического назначения требует purpose_id revision; display description само purpose code не меняет.
8. Preview точен по текстам, кнопкам, категориям, enabled providers, privacy placeholder и public CSS; макет сайта упрощён, fixed positioning заменён статическим внутри canvas. Client-side preview checkbox clicks не являются consent действиями; links navigation запрещено sandbox по требованию изоляции.
9. Default ru/en package lexicons; остальные frontend языки администратор переводит сам с fallback. Custom culture syntax безопасный, не автоматическая машинная генерация переводов. Manager per-user language overrides не заменяют каноническую системную настройку для начальной вкладки.
10. Ajax-embeds позднее инициализации, legacy third-party cookies cleanup, Consent Audit Viewer, полноценный audit browser и service-specific event SDK APIs остаются прежними/будущими ограничениями. Нет автоматического мониторинга изменений settings в открытой visitor вкладке.
11. Native System Settings с правом settings остаётся альтернативным штатным способом редактировать те же canonical values. Invalid manual JSON fail closed; CMP permission ограничивает CMP, не отменяет существующие права владельца на системные настройки.
12. Старые журналы не очищаются автоматически. IP/UA/path/consent_id остаются privacy-sensitive claims; false Origin вне браузера можно подделать, это не криптографическое доказательство клика. Revocation reload имеет прежнее ожидание аудита ≤900ms, карты удаляются сразу.

## Итоговые финальные числа

| Набор | Сценарии | Assertions | Ошибки |
|---|---:|---:|---:|
| Новый CMP/i18n | 17 | 60 | 0 |
| Mgr token без component permission | 1 | 4 | 0 |
| Реальные queued параметры с local SDK stubs | 4 | 17 | 0 |
| Предыдущая public matrix | 281 | 1161 | 0 |
| HTTP security/audit | 36 | 118 | 0 |
| Native System Settings Manager | 4 | 9 | 0 |
| Live URL guards с interception | 11 | 50 | 0 |
| PHP audit/path/concurrency | набор checks | 80 | 0 |
| PHP settings/sanitizer/i18n | набор checks | 53 | 0 |
| **Итого** | **354 сценария + PHP checks** | **1552** | **0** |

Все **4158 HAR entries** финальной public matrix относятся к local origin. Это HAR observations (включая cache/reloads), не количество TCP-соединений. Подробные counts и каждого scenario result находятся в evidence; raw HAR/HTTP_AUTH/cookies не копируются в Git. Known Gravatar из native Manager abort отдельно указан в результатов Manager. Финальный public PHP-аудит продолжает писать schema 1/2 по cookie_consent.log_dir; historical sentinel сохраняется при смене setting.

### Первичные источники использованных API

- [MODX CMP 2.3+](https://docs.modx.com/2.x/en/extending-modx/custom-manager-pages/tutorial): namespace/action/controller и native page workflow.
- [Yandex tag initialization](https://yandex.ru/support/metrica/en/code/counter-initialize): поддерживаемые параметры, включая webvisor/clickmap/trackLinks/accurateTrackBounce.
- [GA4 configuration](https://developers.google.com/analytics/devguides/collection/ga4/reference/config): send_page_view/signals/personalization.
- [Google privacy settings](https://developers.google.com/tag-platform/security/guides/privacy): allow_ad_personalization_signals и restricted_data_processing.

Vendor API reference не означает проверку фактического live vendor execution. Для staging нужны тестовые аккаунты и проверка Network реальных SDK/контейнера; это release gates перед production.
