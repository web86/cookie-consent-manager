# MODX 3 0.1.0-beta6 — READY FOR MANUAL TESTING

Исходная ветка `codex/modx3-ui-refinement`, проверенный HEAD
`12adbd0eb45e7ebc88a8238420a51bf1585d06b8`, рабочее дерево было чистым.
Review-ветка: `codex/modx3-release-test`. Итоговый commit — HEAD этой ветки,
также записан в выдаваемой release receipt и итоговом сообщении.
MODX 2 release reference: `6220f06d1149de41188f5ef9f53071679af809cf`.

## Архив

- Версия **0.1.0-beta6**, package name **cookieconsent3**.
- Signature **cookieconsent3-0.1.0-beta6**.
- `cookieconsent3-0.1.0-beta6.transport.zip`, **568708 bytes**.
- SHA256 **fde22e563f095ffd208908e9c4d86038839559cf201ed327a59ff32fcb88752a**.
- Прямая выдача: `.local/release-test/deliverables/cookieconsent3-0.1.0-beta6.transport.zip`.
- Независимые native builds `release-beta6-a` / `release-beta6-b` под
  `.local/modx3-safe-adapter-updates/.local/adapter-updates/artifacts/`
  нормализованы существующим инструментом и совпали побайтно.

Metadata/runtime version/frontend manifest/README/changelog обновлены.
UI, RU/EN, журнал и все frontend/adapter контракты исходного HEAD сохранены.
Нативные MODX 3 namespace-классы, installer, native vehicles и требования не
заменялись реализацией MODX 2. Ветки не объединялись.

В административном BundleManager добавлены те же минимальные existence guards,
что в MODX 2 release-test: MODX больше не логирует `@`-suppressed чтение/удаление
ещё не созданных необязательных bundle/error-marker файлов. Recipe, lock,
atomic publish, сохранение рабочего bundle, права и visitor path не менялись.
Реальные private originals и SHA256 ownership policy сохранены.

## Реальные install и upgrade

Одноразовые MODX **3.2.4**, PHP **8.2.34**, www-data. Deprecated global aliases
отключены до установки компонентов; native control проверяет их отсутствие.
Старый ZIP **0.1.0-beta4 действительно найден и установлен**:
`.local/modx3/artifacts/sync-1.0.6-beta4/cookieconsent3-0.1.0-beta4.transport.zip`.
Все кейсы созданы в новых самостоятельных DB/site. Uninstall не выполнялся.

| Сценарий | Результат |
|---|---|
| Новая установка beta6 и самостоятельная PHP production-сборка | PASS |
| beta4 → beta6, сохранённые настройки/сервисы/ID/параметры/тексты | PASS |
| beta4 → beta6, сохранённый Legacy | PASS |
| Upgrade с тремя customer edits, включая shared helper | PASS |
| Upgrade с намеренно удалённым google-ga4.js | PASS: файл не восстановлен, прежние bundle/timestamp сохранены, error видим |
| Upgrade с syntax error адаптера | PASS: пользовательские bytes и рабочие bundle/timestamp сохранены, error видим |
| Same-byte native reinstall во всех случаях | PASS |

Сравнены hashes всех настроек cookie_consent кроме административного bundle timestamp,
registry/config/texts/category versions, двух старых JSONL, configured owner JS,
extra services JS и customer metadata canonical elements. Bytes сохранены.
Первый SHA baseline импортирован из **реального старого manifest beta4**, история
содержит ровно **0.1.0-beta4 + 0.1.0-beta6**. Новые private originals проверены
по manifest. Extra JS не включается в fixed input list. Для обычного native
install/upgrade новых PHP ERROR-записей нет.

В первом отдельном CLI-кейсе native modMenu выдал предупреждение об отсутствующем
`$_SESSION`: этот контекст есть в HTTP Manager. Исправлен только test-only CLI
bootstrap (пустой session array перед штатным control), без изменения MODX core,
пакета или аутентификации. Тот же неизменный ZIP прошёл повтор на новых cases
`ui-refinement-rt3-b-*`. Первый случай и его диагностика сохранены отдельно.

## Проверки

- **6 native install/upgrade случаев / 149 assertions PASS**.
- **7 installed browser случаев / 150 assertions PASS**: точный served bundle SHA,
  сохранённые customer registry/Strict/Legacy, owner JS и service-scoped callback,
  2 карты + 3 видео + custom iframe, idempotent mount, reload/revoke, retained bundle
  при повреждённом/удалённом input, Manager force/cache clear без recursion.
- **15 UI случаев / 167 assertions PASS** на реально обновлённой original-фикстуре:
  RU/EN, пять полей, скрытый journal draft/save, reconsent, руководство, статус/дата
  успешной и неуспешной сборки, custom create/edit, source labels, page/CSV/filters/
  pagination/details и 390px. Реальный consent event хранит pathname без query/hash.
- **17/17 local suites PASS**: PHP builder **73 assertions** с пустым PATH,
  adapter sync **46**, Audit Reader **73**, semantics, URL/schema/registry/i18n,
  source parity с MODX 2 release и 24 PHP rendering profiles.
- Source/reproducibility **467 assertions PASS**, transport closure/negative
  injection **475 PASS**, **231 runtime files / 463 installed inventory assertions PASS**.
  Нативные vehicles/hooks и закрытый allowlist проверены; нет runtime cache/state,
  prebuilt production JS, fixtures, логов, Node/npm/Composer и dev dependencies.

**Изменений БД/формата журнала нет.** Колонка «Страница» и CSV используют прежний
page; старые JSONL не переписываются, отсутствующий путь выводится как «—».
Production JS создаётся комплектным PHP/Peast без серверного Node/npm/Composer;
посетительские запросы не проверяют и не пересобирают исходники.

Полные результаты: `.local/release-test/modx3/`;
компактное [machine evidence](evidence/modx3-release-test-results.json).
Скриншоты обновлённого Manager: `.local/release-test/modx3/ui/`.
[Краткая инструкция](release-test-quick-start.md),
[пояснения по обновлению и диагностике](release-test-manual.md).

## Ограничения и scope

Внешние SDK/player ответы контролировались: реальные delivery/playback, hosting/CSP
и собственные данные нужно проверить вручную. Проверен Chromium; полная историческая
ACL-матрица не повторялась, анонимный отказ/неизменные permission contracts проверены.
Сторонний **pdoTools3 3.1.0 warm Fenom cache NO-GO** не исправлялся, не смешивается с
ошибками компонента и не блокирует эту тестовую выдачу. Феном-матрица вне scope.
Старые ZIP, ветки и worktrees сохранены; push, merge, GitHub Release, modstore и
production deployment не выполнялись.
