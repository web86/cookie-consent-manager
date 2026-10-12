# Архитектура Cookie Consent Manager CMP и переводов

Компонент использует MODX 2.8.8 namespace `cookie_consent`, меню Cookie Consent Manager и controller `index`. С MODX 2.3 отдельный legacy modAction не обязателен: menu action `index` разрешается в `controllers/index.class.php`. Сохранение/чтение/preview выполняются native class processors через `/assets/components/cookieconsent/connector.php` с mgr session, native MODAUTH token и permission `cookie_consent_manage`. Публичный audit.php остаётся отдельным endpoint; конфигурацию он не изменяет.

## Единственные источники конфигурации

| Системная настройка | Формат | Назначение |
|---|---|---|
| `cookie_consent.services` | расширенная schema 1 JSON | базовые display data, стабильное назначение, approved loader и параметры |
| `cookie_consent.options` | schema 1 JSON | TTL 1–3650, policy version, четыре boolean переключателя кнопок |
| `cookie_consent.texts` | schema 1 JSON | base_language и локальные переводы по culture code |
| `cookie_consent.log_dir` | absolute path или пусто | существующий canonical writable каталог вне DOCUMENT_ROOT; пусто — аудит не настроен |
| `cookie_consent.audit_config_file` | absolute private JSON path или пусто | настройка аудита без webserver environment; только readable JSON вне webroot |

Manager редактирует эти же настройки; параллельного реестра нет. CLI upgrade создаёт только отсутствующие настройки. Исторические ID и текущие enabled/config не перезаписываются. При новой ручной установке все семь необязательных сервисов disabled; исторические IDs сохранены как неактивные значения. Transport fresh install оставляет IDs пустыми; его служебные package_state_dir/package_version не относятся к draft CMP. См. [архитектуру транспорта](modx2-transport-architecture.md). Значения Yandex Webvisor/clickmap/trackLinks/accurateTrackBounce/clientId defaults=true, но счётчик не запускается без enable и согласия.

`options.buttons` хранит исходные предпочтения configure/accept_all даже при `accept=true`. Сервер `effectiveButtons()` принудительно выключает конфликтующие кнопки; публичный JS повторяет зависимость. После выключения legacy исходные предпочтения восстанавливаются. Reject независим. При всех false сервер показывает Configure как fail-safe. Постоянный settings opener можно разместить в шаблоне; если его нет, клиент создаёт first-party кнопку повторного открытия.

## Реестр и параметры

Контракт семи обязательных полей schema 1 сохранён. Добавлено необязательное `purpose_id`: стабильный код назначения `[a-z][a-z0-9_.-]{0,63}`, при отсутствии используется key. Название/описание — базовый display fallback, переводы живут отдельно. Изменение реального назначения требует нового purpose_id.

Разрешённые дополнительные boolean config:

- Yandex: webvisor, clickmap, trackLinks, accurateTrackBounce, clientId.
- GA4: send_page_view, allow_google_signals, allow_ad_personalization_signals. Signals/персонализация включаются в config только при соответствующем marketing согласии. Enhanced Measurement здесь не управляется.
- Ads: allow_ad_personalization_signals, restricted_data_processing.
- Maps: show_title — только оформление заглушки. Персональное разрешение провайдера обязательно, его нельзя выключить.
- Mail.Ru и GTM: проверенный id; вымышленные параметры и callback не принимаются.

Google ID formats и loader allowlist сохранены. GTM по-прежнему не стартует при частичном согласии. Метаданные hosts остаются аудитными подсказками, не firewall для содержимого контейнера.

## Fingerprint v2 и миграция

Новая каноническая строка fingerprint строится из `[2, loader, category, purpose_id-or-key, sorted effective privacy config]`. Текст, cultureKey, название, описание и cosmetic show_title не участвуют. Включение Webvisor и изменение Google privacy flags/ID автоматически инвалидируют разрешение этого сервиса. Язык и обычный перевод этого не делают.

Fingerprint предыдущего milestone включал name/purpose и не отражал отсутствующие defaults. При первом переходе на новую клиентскую версию старые per-provider fingerprints не принимаются; необходим новый выбор. Consent_id сохраняется; schema 1/2 JSONL не переписываются. Если сохранённое разрешение включённого сервиса перестало совпадать, баннер снова показывается, сервис заблокирован. Policy version сама при upgrade не меняется, поскольку это выбор администратора. Старый popup_yurist по-прежнему игнорируется.

## Переводы

```json
{
  "schema": 1,
  "base_language": "ru",
  "locales": {
    "ru": { "notice_html": "<p>Текст с <a href=\"/pkd\">ссылкой</a></p>" },
    "tr": { "reject": "Reddet" },
    "pt-br": {}
  }
}
```

Язык вкладки при открытии — системная настройка MODX `manager_language`, читаемая напрямую из modSystemSetting, независимо от ранее объединённых cache/session/web culture values. Manager пользователь может выбирать язык редактирования; это не язык публичного сайта. Публичная локаль получается только из `cultureKey` текущего контекста MODX. Дополнительных data-cc-language/site-language настроек нет.

Доступные языки перечисляются из каталогов `MODX_CORE_PATH/lexicon`, фильтруются безопасным culture-code validator. Есть стандартные package lexicons ru/en и безопасное добавление custom code (например pt-BR→pt-br). Добавление других языков не требует нового JS. Empty locale хранится как объект, а не массив, чтобы последующий draft translation не потерялся при JSON.stringify.

Fallback: local override запрошенного языка → package lexicon этого языка → local override основного языка → package lexicon основного языка → package en. Для дополнительных сервисов используется также их базовое display name/purpose. Редактирование name/description во вкладке Сервисы обновляет display override текущего системного языка Manager и базовое поле контракта; остальные языки не меняются. Ключи `service.KEY.name`, `service.KEY.description`, `service.KEY.map_notice` позволяют локализовать их отдельно. Отсутствующие строки отмечаются fallback; действие Restore удаляет только одну локальную override строку. Package lexicon файлы никогда не служат хранилищем пользовательских переводов.

Основной HTML — единое поле notice_html. При наличии уже загруженного совместимого CodeMirror.fromTextArea используется source editor; иначе textarea. CodeMirror, TinyMCE, CKEditor/CDN не устанавливаются и не загружаются этим компонентом.

## HTML, parser и preview

DOMDocument sanitizer с LIBXML_NONET сохраняет только a/p/br/strong/em/span. Для a разрешены безопасный href и target=_blank с принудительным noopener noreferrer. Запрещены script/style/iframe/img/svg/math/form и прочий active content; неизвестные безвредные обёртки раскрываются; опасные элементы удаляются с содержимым. Атрибуты on*, style, src, классы/ID из user HTML не выводятся. URL не допускает credentials, protocol-relative формы, control/backslash или executable schemes. Обычные relative и HTTP/HTTPS links разрешены.

Тексты не передаются modx->parseChunk/runSnippet/Fenom. В snippet output они кодируются как JSON; квадратные/фигурные delimiters внутри строк экранируются unicode, поэтому дальнейший MODX parser не видит [[...]] или {...}. Browser JSON.parse восстанавливает literal строки, которые отображаются как обычный текст, а не серверный код.

Preview только через authenticated read-only `preview` processor. Он валидирует структуру и очищает HTML для ещё не сохранённого draft; неполный provider ID не запускает сервис и может отображаться в макете. Invalid preview оставляет последнее безопасное изображение, уведомляя пользователя. Изменения debounce/sequence защищены от позднего ответа предыдущего draft.

Iframe имеет sandbox без allowances и CSP default-src none, form-action none, base-uri none; разрешён только first-party inline CSS. Preview использует публичный CSS Cookie Consent Manager и его структуру кнопок/настроек, с локальным макетом сайта и статическим расположением вместо fixed placement. Никаких публичных consent JS, SDK, active map iframe или аудита внутри. Links сохраняют href, но target=_blank + sandbox запрещает navigation/popups. Это интерактивно выглядящие настоящие ссылки без перехода на внешние страницы из preview.

## Сохранение и права

Save валидирует весь draft до записи, использует транзакцию и FOR UPDATE для строк cookie_consent.*, сравнивает SHA256 revision и сохраняет пять источников атомарно (старый draft без audit_config_file сохраняет существующий путь). Конкурирующий draft получает conflict, его введённые данные остаются в форме. Все общие значения и типы валидируются на сервере; клиент дополнительно проверяет ranges/ID formats/purpose codes и показывает статус конфигурации.

Custom permission регистрируется в policy templates, но не раздаётся всем пользователям. Super User имеет доступ; для других администраторов включить cookie_consent_manage в назначенной mgr Access Policy. Доступ к стандартным System Settings всё равно позволяет авторизованному администратору сохранить некорректный JSON вручную: публичный reader fail closed. Страница CMP не должна заменять общую настройку прав MODX.

Журнал показывает настроенный путь и архитектурную точку будущего Viewer, не читает/не экспортирует журналы. Monthly JSONL, REMOTE_ADDR/UA, schema 1/2, replay/rate limit и отсутствие auto-prune сохранены.
