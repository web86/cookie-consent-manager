# MODX 3: безопасные обновления адаптеров — приёмка

Дата: 17 октября 2026. Ветка **codex/modx3-safe-adapter-updates**, база modx3 **b37ae9d**, исходная **0.1.0-beta4**. Feature commit **7bdb7ab**. Кандидат **cookieconsent3-0.1.0-beta5**. Модель перенесена после успешной MODX 2 1.0.7-beta1 приёмки, immutable reference **1c5fb35236c60f10058dfc0e9d49f8e1473dadb3**. История MODX 2 не merge/cherry-pick в эту ветку.

**Модель обновления готова для review. Полный staging/release gate MODX 3 остаётся NO-GO:** warm compiled Fenom cache официального pdoTools3 3.1.0 не исправлялся. Исторические [beta4 release gates](modx3-1.0.6-parity-acceptance.md) сохранены без изменений. Push в modx3/main, Release и deployment не выполнялись.

## Модель и платформенные границы

[Схема установки/обновления](adapter-updates.md), [машинные результаты](evidence/modx3-adapter-updates-results.json), [команды воспроизведения](../tests/adapter-updates/README.md).

Первый native script vehicle снимает предыдущий frontend-manifest до file copies и берёт существующий bundle lock. Пакетные originals services/ устанавливаются только в core/components/cookieconsent/adapters/services; ни один vehicle не пишет в пользовательский services/. SHA256-синхронизация сохраняет правки, удалённые inputs, дополнительные файлы и занятые новые пути; обновляет только известные нетронутые originals, добавляет новые свободные пути и сообщает о конфликтах без JS merge. Нет достоверной baseline — существующие файлы сохраняются консервативно.

Используется один generated adapter-checksums.json: current, per-version оригинальные hashes и короткий report. Legacy beta4 берётся из preflight snapshot. Далее сохраняются контрольные суммы всех синхронизированных версий, включая ранее поставлявшиеся пути, удалённые из промежуточного пакета. Нет БД/таблиц, копий JS-истории, редактора или страницы конфликтов.

Затем тот же PHP/Peast builder создаёт production JS с прежними atomic write, lock, fingerprint, timestamp и initialization guard. Порядок 21 inputs и все visitor JS bytes сохранены; дополнительные файлы автоматически не исполняются. Prebuilt production JS отсутствует в transport, esbuild остаётся для CI/tests, CSS не менялся. На клиентском сервере не требуется Node/npm/Composer. Посетители не проверяют/пересобирают JS и используют сохранённую MODX настройку версии.

На update ошибка JS/удалённый обязательный input сохраняет прежние cached bytes и timestamp, Manager сообщает об ошибке. На fresh install без рабочего bundle hook возвращает failure. Права/dependencies проверяет preflight, но поздний failure может оставить частичное состояние: полного native rollback нет. После ручного исправления повторная установка завершается успешно. Пользовательские originals не восстанавливаются ради сборки.

Сохранены семейство cookieconsent3, PHP >=8.1, MODX >=3.2.4,<3.3.0, namespace/paths, startup JSON вне Fenom, native classes/transport/transactions/permissions/settings policy. Все ORM обращения и log constants используют MODX Revolution namespaces; vehicles — xPDO Transport namespaces. Native fixtures работали с **load_deprecated_global_class_aliases=false**; guard проверяет destination DB до bootstrap и отказывает при global modX alias.

## Результаты

| Проверка | Результат |
| --- | --- |
| Shared source parity с принятой MODX 2 | 89 assertions PASS; нормализуются только platform class names |
| PHP renderer/text/snippet differential | 24 cases PASS |
| SHA256 sync unit matrix | 46 assertions PASS на PHP 8.1.34 / 8.2.34 / 8.5.10 |
| Existing PHP builder без Node/npm | По 70 assertions PASS, JS semantics PASS |
| Latest standalone/source/browser/differential results | 31/31 PASS, включая повтор strict parity после исправления namespace spelling |
| Видео × esbuild/PHP | По 42 сценария / 646 assertions PASS |
| Тексты/6 HTML examples × esbuild/PHP | По 32 сценария / 779 assertions PASS |
| Differential immutable baseline и PHP candidate | По 49 сценариев / 253 assertions PASS; все focus/security assertions сохранены |
| Native MODX 3.2.4-pl / PHP 8.1.34 / www-data / aliases off | 12 сценариев / 142 assertions PASS |
| Последовательные beta4 → beta5 → beta6 fixture | PASS: 3 baseline versions, untouched originals updated, shared-helper conflict/user changes/deletion/new occupied path retained, new free explicit input added |
| Exact installed PHP JS frontend, Strict/Legacy, 2 maps/3 video/services, extra file inert, old working bundle on failure | 20 сценариев PASS; HTTP fixture identity, JS SHA256 и timestamp проверены |
| Manager RU/EN/kept notice/error/force/cache clear/no recursion/anonymous guard | 3 сценария PASS; вместе с frontend **23 / 379 assertions / 0 FAIL** |
| Native uninstall/reinstall | 10 assertions PASS: user files, generated cache/version, checksum history, canonical IDs/metadata retained |
| Source/native inventory | 98 assertions PASS |
| Native transport closure + negative injected fixture/map/unknown/tampered runtime | 475 assertions PASS |
| Runtime/new-test syntax | 262 files PASS; version/guide generators и git diff --check PASS |

Native cases: fresh, original inputs, one edit, several edits, shared helper, deleted input, extra file, occupied new path, syntax error, update write permissions, first-install syntax failure/manual repair, first-install permissions. Reinstall проверялся для текущей и следующей test версии. При syntax/deletion проверены точные старые bytes и прежний timestamp, затем реальные страницы проходят consent/revoke/Strict/Legacy.

Beta6 с изменёнными originals и новым explicit input — только отдельный test fixture. Deliverable и feature metadata остаются beta5/21 inputs. Старые базы, рабочие каталоги и ZIP не сбрасывались; разные bytes одной signature не устанавливались в одну fixture.

Первые неуспешные попытки сохранены отдельно. Strict source comparison обнаружил отличие записи namespace при переносе — исправлено до финального ZIP, затем 89/89 PASS. У свежего MODX 3 отсутствовал manager_language row: исправлен guarded fixture control, первые 20 frontend PASS сохранены, все 3 Manager checks повторно PASS. Assertions не удалялись, первоначальные FAIL не переименованы в PASS; machine summary ссылается на первые попытки и последние результаты.

## Финальный native ZIP

- `.local/adapter-updates/artifacts/deliver-a/cookieconsent3-0.1.0-beta5.transport.zip`
- **566340 bytes**, SHA256 **8aa30ed3b2f6cb4eb90a94745c52ebda8d59a7080492a4165a9af0ab25da5c49**.
- **231 runtime files / 248 native vehicles / 490 ZIP entries**; **11 private services originals / 21 ordered JS inputs**.
- Два независимых normalized ZIP совпали побайтно. Второй собран из snapshot без cookie-consent.min.js, подтверждая отсутствие обязательного production esbuild build.
- Строгий SHA256 private originals/runtime и allowlist сохранены. В payload нет prebuilt JS, generated cache/checksum state, tests/docs/fixtures/debug/mock directory, source maps или клиентских Node/npm/Composer dependencies. Обязательная mock-marketing factory — фиксированный private original с пустым live start.

## Ограничения

**Warm Fenom cache остаётся NO-GO**, официальный pdoTools3 3.1.0 не патчился; этот этап не является новой Fenom cold/warm сертификацией. Native web acceptance выполнена на Standard parser. Исторический real-SDK transient /a first FAIL и видео **3 SKIP** сохраняются. Сторонние SDK/player ответы контролировались; реальная delivery/playback, owner CSP/geo/referrer/hosting/CDN и другие браузеры требуют staging.

Native CMS run был на PHP 8.1; helper runs 8.2/8.5 не сертифицируют весь MODX на этих версиях. AST не гарантирует бизнес-логику произвольных пользовательских edits. Одновременное FTP-редактирование того же файла и установка не являются общей транзакцией. Не выполняйте uninstall старого пакета поверх нового. First install требует writable bundle directory; удалённый обязательный input требует ручного исправления, предыдущая рабочая сборка сохраняется.

Полный список файлов: `git show --stat 7bdb7ab`. Журналы/скриншоты: `.local/adapter-updates/evidence/`. Target modx3/main и исходные пользовательские worktrees не изменялись. Следующий documentation commit сохраняет отчёт без изменения финального runtime ZIP.
