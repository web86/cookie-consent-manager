# MODX 2 1.0.7-beta2 — READY FOR MANUAL TESTING

Исходная ветка `codex/modx2-ui-refinement`, проверенный HEAD
`efaca7389ae7a77ba2aadcb9e0077a3e05e355fa`, рабочее дерево было чистым.
Review-ветка: `codex/modx2-release-test`. Итоговый commit — HEAD этой ветки,
также записан в выдаваемой release receipt и итоговом сообщении.

## Архив

- Версия **1.0.7-beta2**, package name **cookieconsent**.
- Signature **cookieconsent-1.0.7-beta2**.
- `cookieconsent-1.0.7-beta2.transport.zip`, **551578 bytes**.
- SHA256 **64dbcd558899e7a1eb89eb033844cbc93999f05de7427a245fcad34cd09f9d09**.
- Прямая выдача: `.local/release-test/deliverables/cookieconsent-1.0.7-beta2.transport.zip`.
- Независимые native builds: `release-beta2-c` и `release-beta2-d` под
  `.local/modx2-safe-adapter-updates/.local/adapter-updates/artifacts/`;
  normalized ZIP совпали побайтно. Старые ZIP/fixtures не заменялись.

Metadata, runtime version, frontend baseline manifest, README и changelog
обновлены. UI/RU/EN/журнал/adapter contracts из исходного HEAD сохранены.

При проверке выявлены старые предупреждения: MODX логировал подавленные `@`
обращения к отсутствующим необязательным bundle/error-marker файлам. Добавлены
только existence guards в административных metadata/status/cleanup. Recipe,
lock, атомарная публикация, сохранение предыдущего bundle, права и frontend
не менялись. Регрессионный тест перехватывает даже подавленные PHP warnings.

## Реальные install и upgrade

Новые одноразовые MODX **2.8.8**, PHP **8.2.34**, native Package Management,
www-data; исходный ZIP **1.0.6 действительно найден и установлен**:
`.local/artifacts/cookieconsent-1.0.6.transport.zip`.
Uninstall не вызывался. Все случаи получили самостоятельную DB/site.

| Сценарий | Результат |
|---|---|
| Новая установка beta2; production JS создаётся установленным PHP | PASS |
| 1.0.6 → beta2, заполненные настройки, сервисы/ID/параметры, RU/EN тексты | PASS |
| 1.0.6 → beta2, сохранённый Legacy | PASS |
| Upgrade с тремя пользовательскими изменениями, включая shared helper | PASS |
| Upgrade с намеренно удалённым google-ga4.js | PASS: удаление и прежний bundle/timestamp сохранены; статус error |
| Upgrade с syntax error адаптера | PASS: пользовательский код и прежний bundle/timestamp сохранены; статус error |
| Same-byte reinstall во всех случаях | PASS |

Сравнены hashes **всех** настроек cookie_consent (кроме административного
bundle timestamp), registry/texts/category versions, два старых JSONL-файла,
настроенный owner JS, дополнительный файл services/ и customer metadata
canonical elements. Bytes сохранены. Начальный baseline импортирован из
реального manifest 1.0.6: история содержит ровно **1.0.6 + 1.0.7-beta2**,
новые private originals соответствуют новому manifest. Дополнительный JS
не попадает в fixed build recipe. При обычном install/upgrade новых PHP
ERROR-записей нет; setup warning до установки и намеренные negative cases
учитываются отдельно.

## Проверки

- **6 native install/upgrade сценариев, 149 assertions PASS**.
- **7 installed browser сценариев, 150 assertions PASS**: точный SHA256 отданного
  bundle, сохранённые Strict/Legacy и customer registry, реальный owner JS,
  service-scoped onAllowed, 2 карты + 3 видео + custom iframe, повторный mount,
  consent/reload/revoke, retained bundles при ошибке, force/cache clear/no recursion.
- **15 UI сценариев, 167 assertions PASS** на обновлённой original-фикстуре:
  RU/EN, пять полей, закрытая карточка и сохранение скрытых значений, reconsent,
  руководство, actual build/error/last-success date, custom create/edit, page,
  фильтры/детали/CSV и 390px. Реальное событие сохраняет только pathname.
- **15/15 local suites PASS**. PHP builder **73 assertions**, PATH пуст во время
  компиляции; Node/npm/Composer серверу клиента не нужны. Adapter sync **46**,
  Audit Reader **73**, locale/URL/schema/registry/semantics contracts PASS.
- Release source/reproducibility **467 assertions PASS**, transport closure и
  negative-injection проверки **475 PASS**, **231 runtime files / 463 installed
  inventory assertions PASS**. Vehicles/hooks нативные MODX 2; нет generated
  cache/state, prebuilt production JS, fixtures, логов или dev dependencies.

**Изменений БД/формата журнала нет.** Колонка «Страница» и единственная CSV-колонка
используют прежний page. Историческая запись без пути видна как «—».

Полные disposable snapshots/результаты: `.local/release-test/modx2/`;
компактное [machine evidence](evidence/modx2-release-test-results.json).
Скриншоты обновлённого Manager: `.local/release-test/modx2/ui/`.
Инструкция: [ручное обновление и диагностика](release-test-manual.md).

Первый внутренний кандидат a/b и первая fixture с диагностическими предупреждениями
сохранены отдельно. Итоговый ZIP c/d установлен только в новые fixtures; архивы
разных bytes не подменялись в уже установленных signature. Для ручной проверки
выдан только указанный SHA256.

## Ограничения

Chromium; внешние SDK/player ответы контролировались. Реальная доставка,
playback, hosting/CSP и ваши данные проверяются вручную. Полная историческая
ACL-матрица не повторялась; анонимный отказ и неизменность permission contracts
проверены. Релиз не опубликован, push/deploy/merge не выполнялись.
