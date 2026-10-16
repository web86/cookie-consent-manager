# MODX 2: безопасные обновления адаптеров — приёмка

Дата: 17 октября 2026. Ветка: **codex/modx2-safe-adapter-updates**, база main **131e6ea**, исходная 1.0.6. Feature commit **847921e**. Локальный кандидат **cookieconsent-1.0.7-beta1**; main не изменён и push не выполнялся. Следующий documentation commit сохраняет этот отчёт и machine evidence без изменения проверенного runtime ZIP.

## Реализация

Полная [схема установки](adapter-updates.md) и [машинные результаты](evidence/modx2-adapter-updates-results.json).

Preflight читает прошлый frontend-manifest до file vehicles и захватывает существующий bundle lock. Все 11 пакетных services originals теперь поступают в приватный core/components/cookieconsent/adapters/services; native vehicles не имеют targets в пользовательском services/. Install hook по SHA256 обновляет только нетронутые файлы, сохраняет правки/удаления/занятые новые пути и не касается дополнительных файлов. Новые свободные пути добавляются. Нет автоматического слияния JS или сканирования дополнительных файлов для исполнения.

Один generated adapter-checksums.json хранит current и компактные per-version оригинальные SHA256, включая legacy 1.0.6 snapshot и все последующие синхронизированные версии. Старые checksum paths сохраняются и при удалении файла из промежуточного пакета. До изменений public files фиксируется старая baseline, после синхронизации — новая. Неизвестные hashes не используются для угадывания оригинала. Новая БД, исходники истории, редактор или страница конфликтов не создавались.

Синхронизация вызывает уже существующий PHP/Peast builder под тем же lock до сборки. Atomic writes, fingerprint, порядок 21 input, initialization guard и timestamp busting сохранены. Все visitor JS sources и esbuild output bytes прежние. В transport нет production prebuilt JS; CSS остался по существующей схеме. На клиентском сервере не нужны Node/npm/Composer. До первой успешной сборки Assets не подключает отсутствующий JS; посетительские запросы не читают/проверяют JS и не пересобирают его.

Обновление с некорректным или удалённым обязательным input сохраняет последнюю рабочую сборку/версию и показывает ошибку. Файлы пользователя не восстанавливаются ради компиляции. Первая установка без рабочего bundle возвращает native failure. Права/dependencies проверяет preflight, но поздняя ошибка может оставить частичное состояние: тест это подтвердил, полного rollback не заявляем. После ручного исправления исходника reinstall завершает установку.

## Проверки

| Проверка | Результат |
| --- | --- |
| SHA256 sync: original/edit/helper/delete/new/free/occupied/extra/reinstall/history/unknown/symlink/hardlink/integrity | 46 assertions PASS на PHP 8.1.34 / 8.2.34 / 8.5.10 |
| Existing PHP bundle builder без Node/npm, skip/force/parse/write/DB/commit/lock/fallback selection | По 70 assertions PASS на тех же PHP; JS semantics PASS |
| Standalone/source/build/registry/PHP contracts/browser/differential | 29/29 PASS, PHP 8.5.10 + Chromium |
| Video browser × esbuild/PHP | По 42 сценария / 646 assertions PASS |
| Placeholder texts/examples × esbuild/PHP | По 32 сценария / 779 assertions PASS |
| Differential immutable beta5 и PHP candidate | По 49 сценариев / 253 assertions PASS после корректного ожидания UI transition |
| Native MODX 2.8.8 / PHP 8.2.34, www-data | 12 самостоятельных сценариев PASS; каждый на новой DB/site |
| Последовательные 1.0.6 → beta1 → beta2, новый input и конфликт shared helper | PASS; сохранены 3 baseline versions, пользовательский helper/удаление/занятый путь; нетронутый original обновлён |
| Native same-version reinstall, включая next package | PASS, пользовательские bytes/удаления сохранены |
| Exact installed PHP bundle frontend, Strict/Legacy, 2 карты/3 видео/сервисы, extra file inert, prior bundle on failure | 20 сценариев PASS; HTTP fixture identity и полный SHA256 отданного JS проверены |
| Native Manager error, RU/EN notice, draft retention, force, cache clear, no recursion, anonymous guard | Вместе с frontend: 23 сценария / 379 assertions PASS |
| Native uninstall/reinstall | 10 assertions PASS: services, owner file, generated bundle, timestamp, checksum history, canonical IDs/metadata сохранены |
| Final exact source/native inventory | 98 assertions PASS |
| Transport closure, private originals, no prebuilt/user targets, negative injected fixture/source map/unknown/tampered runtime | 475 assertions PASS |
| Runtime/new-test PHP/JS syntax | 259 файлов PASS; generators и git diff --check PASS |

Native cases: fresh, originals, one edit, several edits, shared helper, deleted input, additional file, newly occupied path, syntax failure, upgrade permissions, first-install syntax failure/repair, first-install permissions. Сценарии с удалением/ошибкой проверяют сохранение **точных** предыдущих bytes bundle и прежнего timestamp; реальные страницы с этой сборкой проходят Strict/Legacy, consent/revoke и карты/видео.

Native beta2 archive с изменёнными originals и новым явно перечисленным input — только отдельный тестовый fixture. Реальные feature metadata остаются beta1/21 inputs. Пакеты с одинаковой signature и разными bytes не устанавливались в одну fixture. Старые ZIP, базы и каталоги не сбрасывались.

Первые неуспешные попытки сохранены отдельно: ошибка регистрации пакета в harness; гонка focus на 450-ms hide transition (неизменённый повтор 49/253 PASS); прерывание одной собственной fixture при раннем перезапуске тестового контейнера; кеш путей при переключении test sites. Исправлены harness/оркестрация: ожидание settled UI с сохранением всех focus/security assertions, новые DB/site для повторов, graceful reload и явная проверка HTTP identity/JS SHA256. Ошибки не переименованы в PASS; итоговые таблицы относятся к последним полным проверенным сценариям.

## Финальный локальный ZIP

- `.local/adapter-updates/artifacts/deliver-a/cookieconsent-1.0.7-beta1.transport.zip`
- **549301 bytes**, SHA256 **a2ee6c5b7b61789ea2067addd4cb1cecb55e186cb8003acf98304d665dadd0e5**.
- **231 runtime files / 248 native vehicles / 490 ZIP entries**. Два независимых normalized ZIP совпали побайтно; второй собран из snapshot вообще без cookie-consent.min.js.
- Строго проверены приватные originals, manifest, Peast/runtime, шесть canonical elements и RU/EN guide. Нет prebuilt JS, generated cache/state, tests/fixtures/docs/debug/mock directory, Node/npm/Composer или source maps в payload. Обязательная mock-marketing factory остаётся среди фиксированных inputs, теперь как private service original; её live start пустой.

## Ограничения

Реальные внешние SDK/player ответы в browser acceptance контролировались. Owner delivery, CSP/geo/referrer ограничения, CDN/hosting, другие браузеры и реальное видео остаются прежними staging gates. AST-проверка не гарантирует бизнес-логику произвольного пользовательского JS. PHP helper tests на 8.5 не сертифицируют MODX на 8.5; native запуск был на 8.2.

Нет общей транзакции между FTP-редактированием, filesystem и MODX. Изменения того же файла одновременно с установкой требуют обычной административной координации. Не выполняйте uninstall старого пакета поверх нового. First install требует writable bundle directory; prebuilt read-only fallback больше не поставляется. Удалённый обязательный input требует ручного восстановления/исправления, предыдущий bundle сохраняется.

Все исходные рабочие каталоги, пользовательские изменения и main сохранены. Полный список изменённых файлов: `git show --stat 847921e`. Подробные локальные журналы и скриншоты: `.local/adapter-updates/evidence/`. Release, deployment и push не выполнялись.
