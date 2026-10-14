# Полировка Manager и инструкция — кандидат 1.0.1 для review

База: `main`/`v1.0.0`, ветка `feature/modx2-commercial-polish-performance`. Релиз 1.0.1 не опубликован; main, v1.0.0, GitHub Release и immutable ZIP 1.0.0 не изменяются.

Changelog содержит семь пользовательских пунктов версии 1.0.0 по возможностям, интеграциям, безопасности и совместимости. Подробные beta-отчёты остаются в docs/. Описание в рабочем Release Notes согласовано; опубликованные notes 1.0.0 не редактируются.

## Один источник инструкции

Редактируйте только `_build/user-guide.json` (RU/EN с одинаковой структурой). `npm run build:guide` формирует `_build/package-readme.md` и `server/src/CookieConsentGuide.php`; manifest проверяет исходный JSON и оба output hashes. `node _build/user-guide.mjs --check` проверяет синхронизацию. transport.mjs запускает генератор; прямой native builder отвергает устаревшие output.

Manager получает локализованный guide в существующем GET. Нет нового запроса для справки, стороннего сайта, библиотеки, вкладки, MODX-плагина или хранилища документов. DOM создаётся с textContent; HTML-код примеров остаётся текстом. Readme показывается штатным предустановочным metadata panel Package Manager.

Кнопка «Инструкции и руководство» заменяет staging details на «Основных». Native dialog имеет заголовок, прокрутку, закрытие кнопкой/Escape/close(), inert background и возврат фокуса. ExtJS MODX 2 подавляет native Escape default; локальный keydown-handler внутри dialog закрывает окно без вмешательства в события страниц. Несохранённый draft сохраняется.

Внизу всей страницы — Developer footer с https://www.web86.site/, target=_blank, rel=noopener noreferrer, в том числе в read-only Log. Нет изображений, шрифтов, виджетов или скриптов с сайта разработчика. Штатный Gravatar самого MODX отделён от запросов компонента.

## «Сервисы»

Expand/Collapse заменены CSS-chevron в кнопке заголовка. Область названия кликабельна, hit-area минимум 44 px, Enter/Space и aria-expanded сохранены. Checkbox видимости независим. Подсказка о видимости показана один раз вместо повторения в каждом разделе.

Карточки имеют общую иерархию: название и небольшой статус слева, Enable справа, Individual settings ниже. Ready/off/invalid имеют спокойные цвета; inline ошибки и автоматическое раскрытие неправильного поля остаются прежними. Отступы, границы и акценты продолжают стилистику MODX. Раскрытость сохраняется после Save/Add/rerender.

## Единственная оптимизация

CookieConsentSettings::read получает пять строк одним штатным getCollection с key IN вместо пяти getObject. Порядок ключей и revision сохранён; отсутствующие значения обрабатываются прежним способом. Оба сниппета независимо читают свежие настройки. Кэша между вызовами/запросами нет, поэтому Save и смена контекста не требуют инфраструктуры инвалидации.

hash_file не изменён: два hash небольших публичных файлов занимают доли миллисекунды и дают content-based cache busting. Дополнительный сайт-side manifest/cache не нужен. События аудита, SDK guards и frontend не сокращались: новых обязательных AJAX нет, JS/CSS и HTML остаются прежними.

Полный RU/EN текст доступен в generated package-readme.md и модальном окне. Для приёмки: выбрать категории/сервисы → журнал → один Assets в head и один Banner в body → собственная settings button → новый браузерный профиль/Network/reject/allow/reload/withdrawal и реальная запись журнала.
