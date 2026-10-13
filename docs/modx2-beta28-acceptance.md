# beta28 — локализация чанка и native категория

Дата: 2026-10-13. Ветка `feature/modx2-frontend-bundle`; база beta26 `b42f836`, implementation `1ffc9f2`.

**GO только для review. 333 проверки, 1991 assertions, 0 FAIL.** Выполнены локально на настоящем MODX Revolution **2.8.8-pl**, PHP **8.2.34**, MariaDB **10.6**, Apache; Playwright Chromium **1.62.1**. Merge и deployment не выполнялись. Счётчик включает PHP/build/runtime suites как отдельные проверки.

Immutable transport: `cookieconsent-0.1.0-beta28.transport.zip`.

SHA256: `1a69b5a88719d606d180b30e53421365940d08526ddf9430f6a8473612cb2db1`.

## Изменение и архитектура

Комментарий в начале исходного чанка объясняет `data-cc-text` / `data-cc-html`, вкладку «Тексты» и stock fallback. Renderer, переводчик, публичный JS, CSS, receiver и контракт интеграции не изменены. Комментарий находится вне корня баннера и отсутствует в готовой странице. PHP заранее заполняет headings/buttons/category text/ARIA/notice HTML; JS их не перезаписывает.

Native builder добавляет одну `modCategory` object vehicle для `CookieConsent`, перед шестью canonical элементами. `UPDATE_OBJECT=false`, авто-ID, сохранение при uninstall. Её родитель и ID при повторном использовании не меняются. Только новый элемент получает ID этой категории из xPDO. Ветка обновления существующих элементов сохранена: перенос пользовательской metadata в vehicle, затем замена source в том же объекте. Category migration, stock copies, новые plugins/events/ledger/Setup Options отсутствуют. Сохранена прежняя политика static→DB-backed canonical source, описанная в инструкции.

Native package: **70 vehicles = 15 object / 53 file / 2 script**, **134 ZIP entries**. Два независимо созданных и нормализованных ZIP побайтно одинаковы. Все 53 установленных runtime-файла совпали с inventory после HTTP-регрессии. Immutable beta26 не изменён.

Публичные файлы полностью идентичны beta26:

- JS SHA256 `764d59ecd0492a8cae443f1c837050df7791c8a2c9da11cbf26c96813f1c7c5e` — 17243 bytes.
- CSS SHA256 `23bff258002e08e4520fdcf0c6105f46f8db5649d29d54e4f89f42f5924b5193` — 3545 bytes.

## PASS/FAIL

| Проверка | Статус | Подтверждение |
|---|---|---|
| PHP rendering исходного чанка | PASS | 47 assertions: комментарий скрыт, SSR заполнен, fallback, notice sanitizer, literal delimiters |
| RU/EN stock, `cultureKey` | PASS | Реальный HTTP HTML, все заголовки/кнопки заполнены до JS |
| RU/EN пользовательские overrides и stock fallback | PASS | Сохранённые `cookie_consent.texts`, частичные overrides, unspecified keys из stock |
| HTML-ссылки/XSS/MODX-Fenom delimiters | PASS | `/privacy` сохранён, unsafe img/script удалены, delimiters отображены буквально |
| JS disabled / cold-warm cache | PASS | Четыре языковых сценария по два прохода, 112 assertions; сравнение static DOM до/после JS |
| Assets head + Banner footer | PASS | Один CSS, один JS, один banner, public JSON только locale |
| Чистая установка без категории | PASS | Native PM создал одну строку категории; все шесть элементов в ней |
| Чистая установка с категорией | PASS | Повторно использованы ID/parent/metadata; unrelated категории и элементы не изменены |
| beta26 → beta28 | PASS | Код всех шести намеренно изменённых canonical заменён на package source; ID/properties/category/metadata сохранены |
| Повторная установка | PASS | Строка категории и каждый элемент в единственном экземпляре; пользовательские категории не меняются |
| Native uninstall/reinstall | PASS | Категории/элементы/settings/DB metadata сохранены, штатный reinstall успешен |
| Native data preservation | PASS | Шесть native сценариев / 232 assertions, hash comparisons settings/resources/templates/menu/policies/audit registry/data; fixture files архивируются перед reset |
| 256 комбинаций разрешений и provider/storage/maps regression | PASS | 281 browser scenarios / 1419 assertions, проверка каждого powerset по Network |
| Реальный PHP receiver и журналы | PASS | 37 HTTP scenarios / 121 assertions: schema 1/2, event ACK/JSONL/IP-UA, Origin, replay/concurrency/rate, unsafe paths/files |
| Runtime/ZIP/build/syntax | PASS | Native verification, 53 runtime hashes, независимая сборка, 5 изменённых PHP-файлов + JS syntax checks |

Во время native upgrade намеренно изменён source каждого из шести элементов, задана индивидуальная property и description, категории чередуются между `0` и пользовательской категорией. Проверены сохранение этих metadata и восстановление stock source. Тест с уже существующей `CookieConsent` использует пользовательского родителя и unrelated чанк/сниппет. Число строк категории проверяется непосредственно в DB; все элементы также имеют `count=1`.

Фактическое число HAR-запросов опубликовано в безопасном results JSON; все запросы mock-сценариев остались на локальном origin. Внешние vendor SDK не выполнялись. Native data hashes подтверждают соответствующие fixture snapshots; это не тест произвольных production данных или backup restore при аварии.

## NOT RUN / ограничения текущего выпуска

- Production/staging установка и deployment; реальный hosting/CDN/vendor SDK/API keys/GTM contents.
- Firefox/WebKit, другие PHP/MODX, Windows/IIS/LiteSpeed.
- Manager/Audit Viewer/CSV/ACL, nginx/reverse proxy, ручное удаление cache и million-row suites в beta28 не повторены. Runtime и frontend этих частей идентичны beta26; их прежние PASS остаются историческими результатами [beta26](modx2-beta26-acceptance.md).
- Static canonical restore и late transport failure injection не повторены. ENOSPC, power loss, DB outage и arbitrary FS races не проверены; атомарный rollback не обещается.
- Уже дублированные/case-colliding category names при нестандартных DB collations не проверены.
- Автоматическое исправление ошибочных duplicate/mixed snippets исключено контрактом интеграции.

[Безопасные результаты JSON](evidence/modx2-beta28-results.json), [ZIP inventory](evidence/modx2-beta28-zip-inventory.json), [инструкция установки/обновления](modx2-beta28-update.md). Рекомендация: review изменений, затем отдельная приёмка на staging с backup; production GO этим отчётом не выдаётся.
