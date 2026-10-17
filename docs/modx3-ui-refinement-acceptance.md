# MODX 3 — UI refinement

17 октября 2026. Ветка `codex/modx3-ui-refinement`, база
`cbc3d96af240f8c971e02a8c0732a5363324a49a` (`codex/modx3-safe-adapter-updates`).
Версия сохранена: **0.1.0-beta5** (`cookieconsent3`). Отдельный commit содержит
реализацию и отчёт; его hash приведён в итоговом сообщении и `git log -1` ветки.
Проверенный MODX 2 reference: **efaca7389ae7a77ba2aadcb9e0077a3e05e355fa**.

## Реализация и совместимость

Перенесены те же пять основных полей, единые переключатели, Legacy warning,
кнопки reconsent/руководства, закрытые по умолчанию «Дополнительные настройки» с
журналом и сборкой. Native details/summary, Enter/Space, aria-expanded и каретка
сохраняют DOM и несохранённые значения. Все пояснения журнала сохранены в одном
инфоблоке. Статус сборки использует реальные adapterBuild.state/built_at; дата
выделена полужирным, сохраняется при ошибке и после reload, диагностический ответ
виден. Pending/отсутствующая метаинформация не объявляют успех. На узком экране
действия переносятся, таблица доступна через горизонтальную прокрутку.

Custom JS первым и по умолчанию выбран только в форме создания; при правке
существующих сервисов loader не меняется. В карточках остались пути файлов без
методов/идентификаторов. Для custom JS показан config.path с синхронизацией при
вводе. RU/EN подписи и пути к настройкам в существующем руководстве обновлены;
собственные MODX 3 материалы руководства сохранены и заново сгенерированы.
Новые CSS только внутри CMP; новых зависимостей нет.

**Нативная архитектура MODX 3 сохранена.** Installer, транспортный builder,
processors, namespace-классы, frontend, Builder и adapter installation не менялись.
Пакет установлен в MODX **3.2.4** / PHP **8.2.34** без deprecated global aliases;
каждый вызов платформенного native control проверяет их отсутствие. Ветки не
объединялись. Shared runtime/lexicons/Reader совпадают с зафиксированным MODX 2;
89 assertions source parity и 24 PHP rendering profiles PASS.

## Страница и безопасное обновление

**«Страница» подтверждена отдельно:** реальный браузерный consent POST получил
HTTP 200 ACK, JSONL содержит `/index.php`, а таблица находит и показывает эту запись
по Event ID. В журнал не попали query `private_token=do-not-log` и hash
`sensitive-fragment`; сервер отвергает путь с query string. Существующий
`location.pathname` и серверный validator не изменены, клиентское поле остаётся
недоверенным заявлением. Дополнительного логирования посетителей нет.

**Изменений БД и миграции нет.** Используется прежний page в JSONL и CSV.
Допускается отсутствие поля у исторических записей: в UI «—», в CSV пустая ячейка,
без дублирования существующей колонки Page. Файлы не переписываются. Проверены
детали, пагинация 50+5, фильтры/поиск, CSV-фильтр, пустые результаты, безопасный
textContent и отказ анонимным list/detail/export/rebuild.

Использовать штатный MODX 3 Package Manager и обычную резервную копию перед
обновлением. Версия в задаче сохранена; тестовый ZIP установлен в новую DB/site.
Не заменять уже установленный архив другими bytes под той же signature. Для
публикации нужен следующий release index по принятому процессу; данный ZIP —
локальный кандидат. Пересборка остаётся административной/при очистке кеша;
посетительские запросы не компилируют JS. При ошибке SHA256 и timestamp рабочего
bundle сохранены; пользовательский адаптер не подменяется ради успеха сборки.

## Проверки

- Native MODX **3.2.4**, PHP **8.2.34**, www-data, Chromium: **15 сценариев / 167 assertions PASS**.
- Платформенный standalone/regression набор: **31/31 PASS**, включая source/PHP
  parity с MODX 2, PHP bundle/sync, consent/Legacy, callbacks, карты/видео,
  placeholders и differential; PHP Audit Reader — **73 assertions PASS**.
- Native source/install inventory: **231 runtime files / 463 assertions PASS**.
- Transport closure и отрицательные инъекции: **475 assertions PASS**.
- PHP/JS syntax: **15 файлов PASS**; version/guide generators и `git diff --check` PASS.

Все пять основных настроек, скрытые journal поля, reconsent confirm/cancel/save-first,
руководство/Escape/focus, custom create, неизменность существующих loader,
фактический rebuild/ошибка/дата, neutral/pending, RU/EN и 390px прошли одинаковые
проверки. Нейтральные данные моделируются на GET-границе для отображения;
успех/ошибка и ожидающий запрос rebuild — реальные native операции.

Финальный локальный ZIP:
`.local/modx3-safe-adapter-updates/.local/adapter-updates/artifacts/ui-refinement-final-a/cookieconsent3-0.1.0-beta5.transport.zip`.
SHA256 **255e08b40a3fdb3935a4467243e865086ddc5b2ac6700369c4a70ba65803cc98**.
Он установлен в новую фикстуру **ui-refinement-final-b** без ручной замены runtime.
Результаты: [machine evidence](evidence/modx3-ui-refinement-results.json).
Скриншоты RU/EN Settings/Advanced/Services/Journal/mobile/build-error:
`.local/ui-refinement/modx3/final-b/`. Дополнительные снимки вкладок, формы создания
и блока сборки с учётом внутренней прокрутки: `.local/ui-refinement/modx3/visual/`.

Ранняя UI-фикстура final-a сохранила неудачную подготовку: был пропущен
fixture-only finish.php (отключение aliases), затем прежний harness ошибочно
восстановил пустые ещё не установленные настройки. Это вызвало штатный отказ
native verification при повторной попытке. Runtime не исправлялся: создана новая
DB/site с правильным finish-шагом, тот же неизменный ZIP установлен успешно.
Harness теперь требует подтверждённой установки до snapshot и отказывается
создавать отсутствующие настройки компонента. Результаты выше относятся только
к последнему полному прогону final-b; ранние результаты сохранены отдельно.

## Изменённые файлы

- `assets/components/cookieconsent/{manager.js,manager.css,audit-viewer.js}`.
- `server/src/{CookieConsentAuditReader.php,CookieConsentGuide.php}`.
- `server/lexicon/{ru,en}/default.inc.php`.
- `_build/{user-guide.json,user-guide-manifest.json,package-readme.md}`.
- `tests/adapter-cache/native.mjs`, `tests/adapter-updates/web.mjs`,
  `tests/manager-i18n.mjs`, `tests/viewer/{php.php,browser.mjs}`.
- `tests/modx3-sync/{contracts.mjs,php-differential.mjs}` — новый pinned MODX 2 reference.
- `tests/ui-refinement/{native.mjs,control.php,inventory.py,README.md}`.
- Этот отчёт и `docs/evidence/modx3-ui-refinement-results.json`.

## Ограничения

Прогон выполнен в Chromium на новой установке; клиентский in-place upgrade,
другие браузеры, hosting/CSP и реальные внешние SDK/player delivery/playback
не проверялись. Историческая матрица ролей Manager не запускалась целиком;
проверены неизменные permission contracts и анонимный отказ. Существующий
warm compiled Fenom NO-GO из базовой ветки не меняется; pdoTools не патчился,
Fenom-матрица в этой UI-задаче не запускалась. Исходные ветки, старые сайты и
архивы сохранены. Push, release и deployment не выполнялись.
