# Cookie Consent Manager 1.0.0 — финальная приёмка

Дата: 2026-10-14. **GO для стабильного релиза репозитория.** Deployment клиентских сайтов не выполнялся. MODX Revolution 2.8.8, PHP 8.1, MariaDB, Chromium/Playwright 1.62.1; Apache, nginx/PHP-FPM, Apache за nginx proxy, loopback-only fixtures.

**526 завершённых проверок / 4410 assertions / 0 FAIL.** PHP, syntax, inventory и reproducibility suites считаются по одной проверке, а не по числу assertions. [Полные результаты](evidence/modx2-1.0.0-results.json), [ZIP inventory](evidence/modx2-1.0.0-zip-inventory.json), [Release Notes](release-1.0.0.md), [установка](../README.md).

Артефакт: `cookieconsent-1.0.0.transport.zip`, локально `.local/release/`. SHA256:

```text
0ed4563a2e92cf5e40ba1c269dc0d39bd0acdb6b3fb12a86f734983ce2f4b04b
```

Две независимые сборки настоящим modPackageBuilder совпали побайтно после нормализации ZIP. 70 native vehicles: 14 object, 54 file, 2 script; 134 ZIP entries. Все 54 установленных runtime hashes совпали с inventory. Нет private config/keys/logs/tests/examples в ZIP; нет Setup Options, MODX plugins, ledger, stock-копий и ClientID-адаптера. Beta32 и beta33 immutable архивы сохранены с прежними SHA256.

## PASS

| Проверка | Результат |
|---|---|
| Независимая видимость каждой категории при 0/1/2 сервисах | PASS, PHP SSR и 18 настоящих browser случаев, cold/warm, JS отключён |
| Necessary, пустая видимая категория, category-only/scoped callbacks | PASS, category-only работает без сервисов; scoped требует enabled/fingerprint |
| Скрытие, отзыв, повторное включение, offline hide/show | PASS, затронутые разрешения инвалидированы; другие категории и consent_id сохранены |
| Manager RU/EN, checkbox/label, клавиатура/aria-expanded | PASS, независимое сворачивание; состояние после Save/Add/rerender; ошибки раскрывают поле |
| Preview, boolean validation, server-managed versions, stale revision | PASS, единые флаги, некорректные boolean отвергнуты, конфликт без перезаписи |
| Beta32 → 1.0.0 | PASS, native upgrade для всех 8 наборов прежней видимости; дополнительные clientId false/absent |
| Старые clientId true/false, malformed legacy values | PASS, boolean удалены без alias fingerprint; неверные типы отвергнуты |
| Сохранённые согласия Метрики и остальных сервисов | PASS, старый Yandex fingerprint не запускает SDK/scoped callback до явного повторного выбора; остальные fingerprints сохраняются |
| Удаление формы/Битрикс24 из ядра, пользовательский чанк | PASS, ядро не вызывает getClientID и не пишет поле; controlled queue/example ID/once/optional target/late disconnected target |
| Публичный frontend и provider powerset | PASS, 281 browser случаев, включая все 256 комбинаций; 3289 first-party HAR requests, 0 внешних в mock |
| VK/Meta, несколько IDs, once SDK/PageView, отзыв/pending work | PASS с контролируемыми SDK/очередями, 32 случая; shared Mail/VK SDK, конфликт IDs отвергается |
| Реальный GTM-WJD8XJD6 | PASS, 9 случаев; marketing запускает контейнер/тестовый тег, analytics-only/reject блокируют; analytics_storage отдельно; без дубликатов |
| JS-карты/iframe-карты, load, reload, общий отзыв | PASS; скрытая external_content не допускает обхода через map_allow; нет per-map revoke/автоматического settings opener |
| onAllowed/stillAllowed/unsubscribe | PASS, 13 случаев; restored/late/once/scoped/invalid arguments/callback errors/withdrawal/draft isolation |
| PHP-localized HTML, RU/EN/дополнительный язык, overrides/HTML | PASS, cold/warm и no-JS; JS не переписывает тексты, нет полного strings JSON; MODX/Fenom delimiters буквальны, XSS удалён |
| Свежие пустые словари Manager | PASS, реальные поля RU/EN → POST → Save → reload; [] нормализуется только пустой, malformed array не конвертируется |
| Receiver, schema 1/2, IP/UA, event/consent IDs, месячный журнал | PASS, реальные браузерные ACK с тем же event_id и найденные JSONL-записи; прежние записи сохраняются |
| Origin, replay, rate limiting, HMAC, concurrent writes | PASS, PHP worker security и HTTP suite; 20 конкурентных целых записей, один заголовок |
| Общий Save и partial Save, ошибки каталога/конфигурации/receiver | PASS, другие поля сохранены, прежний рабочий путь не потерян; локальная запись без self-request/fake consent |
| MODX core вне webroot, стандартный каталог, clearcache/отсутствие каталога | PASS, error.log не перезаписан; при полном ручном снятии cache путь сохранён, произвольный путь не создаётся |
| Apache/nginx/PHP-FPM/proxy, внутри/вне webroot | PASS, 6 случаев ACK/JSONL, owner .htaccess сохранён; HTTP-защиту предоставляет владелец |
| Self-request HTTP 403, браузер 400 invalid_payload и реальный 200 | PASS, настройка не зависит от self-request; ACK и запись подтверждены |
| Audit Viewer/CSV и ACL | PASS, 11 browser случаев + PHP; view-only пользователь работает без manage, unsafe CSV/formula/HTML/cursor/symlink checks |
| Native fresh без/с существующей CookieConsent category | PASS, повторная категория не создана; новые 5 элементов в ней |
| Native upgrade/reinstall/uninstall, canonical update, user data | PASS, ID/category/properties/metadata/переводы/HTML/ключи/журналы/непакетные элементы сохранены; код canonical обновлён на месте |
| Native preserved.php recovery | PASS, stable signature, hash-only dry run, явный apply, точное восстановление пяти элементов, последующая штатная переустановка |
| Финальная native reinstall и hashes | PASS, настройки/элементы/ресурсы/шаблоны/menu/ACL/ключи/журналы сохранены; 54 файла совпадают |
| Syntax, bundles, ZIP/reproducibility | PASS, 89 PHP + 83 JS/MJS; locked esbuild 0.28.2; JS 20012 bytes, CSS 3286 bytes |

Публичная матрица выполнялась на тех же финальных JS/CSS и PHP category/consent/receiver исходниках. После узких исправлений пустых словарей Manager и stable-signature recovery повторены затронутые Manager suites, чистый native lifecycle, recovery, реальные fields/POST/reload, runtime hashes и syntax на точном финальном ZIP. Изменения после последней сборки относятся только к отчёту и test helper, добавившему CSS в snapshot.

## FAIL и найденные проблемы

Финальные прогоны: **0 FAIL**. В подготовке найден реальный риск потери новых переводов из-за MODX empty stdClass → []; исправлен без изменения consent/receiver. При замене development ZIP под той же signature resolver OPcache использовал прежние hashes и отказал в установке. Локальные worker перезапущены; точный финальный immutable ZIP затем прошёл fresh/upgrade/reinstall/uninstall. Опубликованные ZIP под существующими версиями не заменялись. Нельзя выпускать изменённый ZIP под уже опубликованной signature.

Исправлены ошибки harness: повторное JSON.parse helper, неверный alias fixture, явное повторное переключение mixed-category checkbox после изменения fingerprint, stable signature path, [] в direct API draft словаря и отсутствие CSS в runtime snapshot. Это отражено отдельно от итоговых PASS.

## NOT RUN и ограничения

- Реальная доставка в Meta/VK/GA/Ads/Метрику/Битрикс24; настоящие Yandex SDK/key/tiles/geocode и клиентский TV/backend/hosting. SDK doubles не доказывают доставку в кабинеты. Реальный GTM проверен только с предоставленным безопасным контейнером; произвольные Custom HTML и теги требуют согласованных consent checks владельца.
- Production/customer staging deployment, реальные CDN/hosting cache, Firefox/WebKit, Windows/IIS/LiteSpeed и другие версии MODX/PHP.
- Полная новая инъекция поздних native install/uninstall failures после частичной записи: ENOSPC, power loss, DB outage, произвольные FS races. Универсальный атомарный rollback отсутствует; возможна частичная установка/удаление, необходим backup/restore.
- Сценарии старого собственного package ledger/state.json/menu rollback неприменимы к текущей минимальной native архитектуре. Полный новый lifecycle failure matrix не заявляется как PASS.
- Реальные цепочки TLS/сертификатов и redirect-инфраструктура хостинга повторно не проверены. Save не делает HTTP self-request. Локальная bounded diagnostics/Origin/replay/rate проверка и реальные browser ACK+JSONL выполнены.

Видимость конфигурации обновляется при следующей загрузке HTML. Старые открытые страницы не получают server-side настройки мгновенно. После upgrade/изменения очищайте штатный MODX/HTML/CDN cache; свои callbacks обязаны повторно вызывать stillAllowed перед SDK/сетевыми действиями после await. Отзыв не отменяет уже отправленные внешние запросы.

## Коммиты и публикация

- `37f6d8c`: beta33, независимая видимость, category versions, миграция и удаление core ClientID.
- `7a00ef3`: 1.0.0 metadata, стабильная интеграция/документация, исправление свежих словарей и native backup helper.
- Следующий commit содержит этот отчёт, bounded evidence и финальный test helper. `main` переносится fast-forward из проверенной feature-ветки с сохранением истории; default branch уже `main`. Аннотированный `v1.0.0` создаётся на финальном коммите после всех PASS.

[Сравнение с beta32](https://github.com/web86/cookie-consent-manager/compare/a62a27f...v1.0.0). На локальном checkout полный source diff также сохраняется в `.local/release/cookieconsent-1.0.0-source.diff`.
