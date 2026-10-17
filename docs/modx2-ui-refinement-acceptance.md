# MODX 2 — UI refinement

17 октября 2026. Ветка `codex/modx2-ui-refinement`, база
`1c5fb35236c60f10058dfc0e9d49f8e1473dadb3` (`codex/modx2-safe-adapter-updates`).
Версия сохранена: **1.0.7-beta1**. Отдельный commit содержит реализацию и этот отчёт;
его hash приведён в итоговом сообщении и доступен через `git log -1` этой ветки.

## Реализация

Пять настроек в исходном порядке, единые переключатели, локальное предупреждение
Legacy, две противоположные кнопки действий с SVG-иконками. Существующие обработчики
сохранения, reconsent/подтверждения и модальное руководство сохранены. «Дополнительные
настройки» по умолчанию закрыты; native details/summary поддерживает Enter/Space,
aria-expanded, видимую каретку и сохранение скрытых полей без пересоздания DOM.
Журнал со всеми прежними полями и сгруппированными пояснениями расположен перед
сборкой. Фактические статус/дата приходят из adapterBuild; дата выделена полужирным.
Ошибка сохраняет видимую дату предыдущего успеха и диагностику ответа. Нейтральный
и ожидающий состояния не объявляют успех. Builder, frontend и контракты адаптеров
не изменены. Все новые стили изолированы внутри CMP; зависимостей нет.

Custom JS — первый и исходно выбранный вариант только в форме создания. Правка
существующего сервиса сохраняет loader. В карточках показан только путь исходника;
для custom JS это фактический config.path с обновлением подписи при вводе.
RU/EN подписи, предупреждение и навигация существующего руководства обновлены.
На узком экране действия переносятся, таблица имеет доступную прокрутку.

## Страница и безопасное обновление

**Колонка «Страница» работает:** браузерный event → реальный HTTP 200 ACK → JSONL →
Manager показывает `/index.php`. Query `private_token=do-not-log` и hash
`sensitive-fragment` отсутствуют в сохранённой записи. Сервер отвергает путь с `?`.
Используется существующий `page: location.pathname`; новые события/идентификаторы
или слежение не добавлены. Клиентский путь остаётся недоверенным заявлением.

**Изменений БД нет.** Журнал — прежний JSONL; ранее существовавшая CSV-колонка Page
сохранена в том же месте без дублирования. Reader допускает отсутствие page только
у исторической записи, возвращает пустую строку; UI показывает «—». Записи и файлы
не переписываются. Проверены поиск, 50+5 записей, детали, пустая выдача, CSV-фильтр,
экранирование текста и анонимный отказ read/detail/export/build.

Устанавливать совместимый MODX 2 transport через штатный Package Manager; перед
обновлением сохранить обычную резервную копию. Не заменять уже установленный ZIP
другими bytes под той же signature. Здесь версия оставлена по заданию: локальный
кандидат установлен в новую DB/site, без подмены старых архивов. Для публикации
среди существующих установок нужен отдельный release index по принятому процессу.
Сборка остаётся административной/при очистке кеша; посетители её не запускают.

## Проверки

- Native MODX **2.8.8**, PHP **8.2.34**, www-data, Chromium: **15 сценариев / 167 assertions PASS**.
- Существующий standalone набор: **29/29 PASS**, включая PHP builder, adapter sync,
  registry, consent/Legacy, maps/video/placeholders, callbacks и differential.
- Audit Reader PHP: **73 assertions PASS**, в том числе история без page, CSV и неизменность байтов.
- Native source/install inventory: **231 runtime files / 463 assertions PASS**.
- Transport closure/негативные инъекции: **475 assertions PASS**.
- PHP/JS syntax: **13 файлов PASS**; version/guide generators и `git diff --check` PASS.

Повторная сборка проверена успешно и с намеренной syntax error; при ошибке SHA256
рабочего bundle и timestamp не меняются, дата/ошибка сохраняются после reload.
Проверены все пять настроек, сохранение закрытого журнала, draft retention,
подтверждение/cancel/save-first у reconsent, руководство/Escape/focus, custom
create, loader preservation, RU/EN и 390px. Финальный тест выполнялся на точном
пакете, без ручного копирования runtime поверх установки.

Финальный локальный кандидат (не release):
`.local/modx2-safe-adapter-updates/.local/adapter-updates/artifacts/ui-refinement-final-c/cookieconsent-1.0.7-beta1.transport.zip`.
SHA256 **51702f8d29bfb9b5779ce4f1ced49ade762a5efd404dae095523276f66082427**.
Результаты: [machine evidence](evidence/modx2-ui-refinement-results.json).
Скриншоты RU/EN Settings/Advanced/Services/Journal, mobile и build-error:
`.local/ui-refinement/modx2/final/`.

На ранней рабочей фикстуре браузер обнаружил обращение к ещё не присоединённому
log input; исправлено использованием возвращённого field(). Начальные ошибки и
уточнения ожиданий самого harness сохранены под `.local/ui-refinement/modx2/attempt-*`.
Приведённые результаты относятся к последнему полному прогону.

## Изменённые файлы

- `assets/components/cookieconsent/{manager.js,manager.css,audit-viewer.js}`.
- `server/src/{CookieConsentAuditReader.php,CookieConsentGuide.php}`.
- `server/lexicon/{ru,en}/default.inc.php`.
- `_build/{user-guide.json,user-guide-manifest.json,package-readme.md}`.
- `tests/adapter-cache/native.mjs`, `tests/adapter-updates/web.mjs`,
  `tests/manager-i18n.mjs`, `tests/viewer/{php.php,browser.mjs}`.
- `tests/ui-refinement/{native.mjs,control.php,inventory.py,README.md}`.
- Этот отчёт и `docs/evidence/modx2-ui-refinement-results.json`.

## Ограничения

Реальные внешние SDK/player ответы контролировались; реальная доставка, playback,
CSP/hosting и другие браузеры остаются staging-проверками. Выполнена новая native
установка; обновление существующего клиентского сайта не выполнялось. Нейтральная
метаинформация моделировалась на границе GET только для проверки отображения;
успех, ожидание и ошибка rebuild проверены настоящими операциями. Существующие
тестовые сайты/архивы и исходные ветки сохранены; push/deploy не выполнялись.
