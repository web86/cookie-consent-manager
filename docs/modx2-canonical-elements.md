# Beta21: canonical source update и локализация CookiesPopup

Политика beta21 намеренно заменяет прежнее правило beta19 «не менять canonical code». Перед установкой сделайте backup: код CookiesPopup, CookieConsent, CookieConsentRegistry и CookieConsentMap заменяется новой поставкой. Предупреждение показано в первой штатной вкладке changelog Package Manager до Install, продублировано в readme и preflight log. Нет Setup Options или дополнительных вопросов.

## Native update

Для четырёх canonical элементов: UPDATE_OBJECT=true, UNIQUE_KEY=[name], PRESERVE_KEYS=false, UNINSTALL_OBJECT=false. Native xPDO находит существующую строку по имени, обновляет её без замены ID; validator переносит существующие metadata/properties в vehicle перед обновлением source. Тип modChunk/modSnippet и ссылки в шаблонах остаются прежними. Дубли имён отклоняются preflight. Системные настройки, IDs/параметры сервисов, HTML/переводы, TTL/policy/buttons, audit key/config, consent records и журналы не заменяются.

Новые *_package_VERSION элементы не создаются. Уже существующие копии прежних beta не удаляются: на них могут ссылаться пользовательские шаблоны. Templates/resources пакет не редактирует. Canonical static elements становятся DB-backed (`static=false`); исходные static_file/source metadata сохраняются, внешний файл не изменяется. Для таких элементов заранее сохраните также static files.

## Backup и восстановление

Перед установкой: backup DB (включая элементы, settings, property sets, native registry), core/assets, static source files и журналов. Нативный xPDO Transport сохраняет pre-install объекты в `core/packages/cookieconsent-0.1.0-beta21/preserved.php`. Пакет проверяет writable/safe backup location и запись native preserved map перед завершением; собственного ledger/lock/originals нет.

**Native preserved.php не является долговременным backup**: повторная установка той же версии перезаписывает его. До reinstall скопируйте/защитите native backup или используйте отдельный DB backup. При отказе до завершения native сохранения возможна частичная установка; DB/filesystem atomic rollback не обещается. Храните core/packages вне публичного доступа, как остальной MODX core.

Для DB-backed snapshots есть CLI helper, который не создаёт новых элементов и проверяет существующие имена/ID:

```sh
php core/components/cookieconsent/bin/restore-elements.php /absolute/MODX/root cookieconsent-0.1.0-beta21
php core/components/cookieconsent/bin/restore-elements.php /absolute/MODX/root cookieconsent-0.1.0-beta21 --apply
```

Первый вызов — только hashes/dry run. Второй восстанавливает metadata/code этих же элементов транзакцией DB, затем очищает cache. Helper доступен и из исходного репозитория, если runtime удалён uninstall. Отсутствующие элементы он не создаёт; при несовпадении ID отказывает. Static snapshots требуют ручного review исходного static file и восстановления DB/files из backup: helper намеренно не пишет такие файлы.

Штатный uninstall с сохранением preexisting data оставляет четыре элемента и settings/logs. Если выбрать native RESTORE_PREEXISTING, MODX может вернуть pre-install code; это стандартная отдельная опция, не автоматический rollback пакета.

## Структурный чанк и SSR

CookiesPopup.html содержит только стабильную HTML-структуру, CSS/data bindings и необходимые locked controls. В нём нет пользовательских строк, ссылок политики, fixed TTL/policy/buttons или поставляемого mock mode. Текущие параметры получает CookieConsentSettings, переводы — CookieConsentTexts::resolve, язык — cultureKey реального MODX context.

CookieConsentBannerRenderer до запуска JS заполняет textContent/ARIA, безопасный notice_html, режим и effective button flags. Live default; mock — только явный `&mode=mock`. Plain strings не являются HTML. Notice HTML повторно проходит существующий allowlist sanitizer. MODX/Fenom delimiters кодируются в HTML entities; DOM отображает буквальные [[...]]/{$...}, а серверные парсеры их не исполняют. Public JSON использует прежний safeJson.

Public runtime и Manager preview используют одну CookieConsentTexts::resolve merge policy: stock EN/base/requested locale, сохранённые overrides и fallback. В «Тексты» остаются девять полей: notice_html и name/description четырёх категорий; редакторы сервисов/кнопок не возвращаются. Сохранение этих текстов обновляет сайт через настройки, без ручного изменения элемента/лексикона.

## Проверка и установка

Точная [приёмка beta21](modx2-canonical-elements-acceptance.md) включает fresh beta19→beta21 с изменённым кодом, properties, RU/EN override HTML, GA4 ID/config, browser consent и native audit key; ID/type/code/count/tree invariants, native backup+restore, реальные cc-en/cc-ru contexts с отключённым JS, cold/warm MODX cache и save→public. Повторены Viewer/CSV/audit/security и 256 provider combinations.

Установка: backup → SHA256 → native Package Manager → прочитать code replacement warning → Install → проверить контексты, тексты и consent chain на staging. Не требуется применение stock tree copies. Защита HTTP-доступа к логам остаётся ответственностью владельца сайта. Никаких merge/deployment в этой работе.
