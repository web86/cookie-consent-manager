# beta23 — приёмка исправлений beta21

> Историческая приёмка beta23. Финальное упрощение журнала — [beta24](modx2-beta24-acceptance.md).

Дата: 2026-10-13. Основа: `feature/modx2-consent-audit-viewer`, `83d77896b99dd65c92236c01a02606ae14d794ab`. Отдельная ветка: `feature/modx2-beta21-acceptance-fixes`. Implementation commit: `3bbe0148f358d6d8e795c1042d35b1e51e80f7a6`.

**GO только для review.** Финальные проверки: **471 сценарий/проверка, 3550 assertions, 0 FAIL**. PHP suite считается одной проверкой, а не отдельным сценарием на каждый assertion; в число входят syntax/inventory/reproducibility checks. Production и staging deployment, merge и подтверждение причины конкретного production request_id не выполнялись.

Transport: `cookieconsent-0.1.0-beta23.transport.zip`.

SHA256: `e3a97fc4f949e11f964404c4cae485076fff3f97f9bc4c3afccaa7883cfb06f2`.

Архив: `.local/release/cookieconsent-0.1.0-beta23.transport.zip` относительно checkout; SHA-файл рядом. ZIP создан один раз в release, read-only. Две независимые сборки native modPackageBuilder после нормализации совпали побайтно. 69 vehicles: 12 object, 55 file, 2 script; 132 ZIP entries. Все 55 установленных финальных runtime hashes совпали с beta23 inventory. beta5/7/13/15/19/21 SHA не изменились. beta24 — только локальный development upgrade с тем же runtime; beta91 — намеренно повреждённый тестовый пакет, распространять их нельзя.

## Root-cause analysis

Для реальной ошибки `0b8dec9233a98244` предоставлен только текст Manager. **Причина именно на этом сайте не подтверждена / NOT RUN**: нет публичного URL, значений `site_url`/audit origin и server-side telemetry. Внешний `HTTP 200` в этой ошибке — статус MODX connector, а не подтверждение HTTP 200 от audit receiver.

В beta21 подтверждены следующие свойства исходников и поведения:

1. Приоритет конфигурации: trusted `COOKIE_CONSENT_AUDIT_CONFIG` → приватный JSON из `cookie_consent.audit_config_file` → managed metadata `cookie_consent.audit` и ключ native MODX DB Registry. Legacy конфигурация не заменяется автоматически.
2. Managed origin создавался из scheme/host/port `site_url` только при первой настройке. Повторный setup сохранял старое значение. Перенос на HTTPS или неправильная первоначальная настройка MODX за proxy могли оставить HTTP origin.
3. Проверочный self-request использовал этот origin и локальный `assets_url/components/cookieconsent/audit.php`, не следовал redirect. Любой non-200 превращался в `audit_post_failed`; connector при этом возвращал обычный HTTP 200 с `success=false`.
4. На **установленной beta21** hash `audit_test.class.php` сопоставлен с immutable beta21 inventory. Затем реальный PHP self-request получил HTTP→HTTPS 301 от локального proxy. Manager вернул `audit_post_failed`, внешний 200, без внутреннего статуса. Это воспроизведение механизма потери диагностики; оно не доказывает, что конкретный production отказ был 301.
5. Wrapper включает `MODX_API_MODE`, подключает MODX через `index.php`, получает конфигурацию/путь/registry из серверных системных настроек. Прямой реальный POST проверил wrapper, строгий Origin, managed key и запись receiver. Отсутствующий wrapper, отказ Origin, недоступный core/config/key, proxy/WAF HTML и запрет исходящих self-request остаются самостоятельными причинами отказов.
6. Legacy schema 1 reject сам по себе допустим и проверен существующей HTTP regression. beta23 использует schema 2 и все **сейчас enabled** provider keys с `false`, чтобы проверять актуальный registry без разрешения сервисов.

## Исправления

`CookieConsentServiceRegistry::visibleCategories()` задаёт necessary=true и активность трёх необязательных категорий. Renderer выставляет `hidden` на соответствующих label уже в HTML; JS повторяет расчёт по валидированным enabled services. Чекбоксы остаются в DOM для совместимости schemas. Manager preview получает такой же расчёт из проверенного черновика и обновляется после изменения enabled без Save. Видимость не изменяет consent grants, disclosed fingerprints или policy.

При явном «Проверить и включить» Manager показывает и отправляет текущий public `location.origin`. Сервер требует совпадения с Origin и Host **аутентифицированного запроса**; произвольные Forwarded/X-Forwarded-Proto не используются. Для managed configuration разрешено исправить только origin, сохранив прежний ключ/rate limit. Upgrade сам не меняет origin. Для external config несовпадение возвращает отдельный код; файл и ключ не изменяются.

Self-request сохраняет TLS peer/name verification, timeout и запрет любого redirect. Сырые warning/body/Location не уходят в Manager или diagnostic log. Ограниченный exception несёт внутренний HTTP status и только allowlisted receiver error; UI отдельно показывает connector и receiver. Подтверждение успеха требует application/json, корректной структуры и времени, `ok=true`, того же `event_id`, затем совпадающей записи в месяце из server_time. Проверяются consent_id, schema, categories/providers, policy/page/timestamps, валидный IP и проверочный User-Agent; открытый файл сверяется с path inode/device/link count. Неверный ответ или запись не дают PASS.

| Исход | Безопасная диагностика |
|---|---|
| 301/302 и другие redirects | `audit_http_redirect` и точный receiver status; переход не выполняется |
| 400 | `audit_http_bad_request` |
| 403 | `audit_http_forbidden`; `origin_forbidden` только при валидном JSON-коде receiver |
| 404 | `audit_http_not_found` |
| 409 | `audit_http_duplicate` |
| 429 | `audit_http_rate_limited` |
| 503 | `audit_http_unavailable` |
| другой HTTP status | `audit_http_unexpected` |
| certificate/TLS verification | `audit_tls_failed`, status 0 |
| соединение не установлено | `audit_network_failed`, status 0 |
| HTML, malformed/truncated/неподходящий JSON | `audit_response_malformed` |
| другой event_id | `audit_event_mismatch` |
| правильный ACK без записи | `audit_record_missing` |
| запись с несовпадающими полями | `audit_record_invalid` |

На позднем отказе check/enable возвращается прежний log_dir с revision guard. Реальная проверочная запись, созданный ключ и явно выбранный managed origin сохраняются. Это не атомарный DB/FS rollback. Concurrent restore conflict имеет отдельную диагностику. Месячный файл `YYYY-MM-cookie-consent.log` использует прежний header-aware line format: новые файлы имеют `# Cookie Consent Manager audit log`, затем JSON records; старые файлы без header читаются по-прежнему. Это не обещание strict JSONL без первой текстовой строки. Старые журналы автоматически не удаляются и не переписываются; `.htaccess` компонент не создаёт/не изменяет.

## Финальные результаты

| Проверка | Результат | Доказательство |
|---|---|---|
| 8 activity masks: все optional пусты / каждая / пары / все | PASS | Реальный MODX HTML без JS, публичный JS, серверный preview |
| Necessary always; выключенные категории исключены из публичной видимости | PASS | hidden в SSR и computed layout; для осмотра без JS тестовый stylesheet раскрывает только панели баннера |
| Manager все 8 masks без Save | PASS | Реальный iframe preview, enabled черновика; DB registry не меняется |
| Disabled providers/maps; позднее включение, включая initially empty registry | PASS | Ни mock script, ни iframe до соответствующего grant; untouched Save не расширяет grants |
| Provider permission powerset | PASS | 256/256; вся browser suite 281/1418; HAR 4418 запросов, 0 внешних |
| Maps/GTM/fingerprint/TTL/schema 1/2 | PASS | Существующие provider, category, HTTP и 11 intercepted live guard сценариев |
| Настоящий PHP endpoint security/IP-UA/replay/concurrent append/rate | PASS | HTTP 37/121 |
| Safe HTTP/JSON/record/network/TLS failures | PASS | Новая audit suite 21/154; canary secret/private IP/HTML не попали в connector/UI; redirect target не вызван |
| HTTPS reverse proxy и исправление stale HTTP origin | PASS | TLS proxy → nginx → PHP-FPM, PHP доверяет test CA; actual ACK+JSONL, тот же managed key/rate/settings |
| External private config при mismatch | PASS | Явный reason, hash файла, ключ и каталог сохранены; дополнительно native legacy migration 1/34 |
| Apache / nginx-PHP-FPM / Apache behind nginx proxy | PASS | Для каждого webroot + private, итого 6/84; настоящий POST/JSONL, old sentinel и custom guard hashes |
| Сохранение обычных настроек независимо от audit draft | PASS | Audit Save 11/45; Manager UX 15/116 |
| Native чистая install/upgrade/reinstall/uninstall | PASS | 8/125, настоящий MODX Package Manager, Setup Options отсутствуют |
| Manual/legacy native migration и uninstall/reinstall | PASS | 2/325; snapshots settings/data/keys/logs/elements |
| Beta21 → beta23 canonical upgrade | PASS | 5/120; стабильные IDs/type/properties/metadata всех четырёх, SQL texts/HTML, service params, consent и logs; нет новых tree copies |
| Native backup/in-place restore; static canonical | PASS | preserved snapshot hashes и reinstall; static→DB, исходный static file не изменён (1/6) |
| Native partial verification failure | PASS, ожидаемый отказ | 2/99; отказ install доказан, атомарный rollback не заявлен |
| Audit Viewer/filter/detail/history/CSV/ACL | PASS | 11/71; source hashes сохранены |
| Native File Manager API и реальный editor UI | PASS | 1/7 и 1/3, просмотр без Save |
| Million-row Reader/CSV | PASS | 1,000,000 записей / 399,000,035 bytes; peak 2 MiB при memory_limit 32 MiB; 50.33 s; source hash сохранён |
| Native HTTP million-row list | PASS | 50 summaries, 15.678 s, 12763 response bytes |
| Package reproducibility/inventory/runtime/PHP | PASS | Побайтное сравнение двух builds, 69 vehicles, 55 hashes, syntax 48 PHP files и остальные PHP suites |

В процессе исправлен подтверждённый false positive: классификатор TLS сначала реагировал на слово `tls` в hostname при обычном отказе соединения. Теперь проверяются характерные warning-фразы, сетевой и TLS тесты различаются. Начальные отказы тестового стенда (OPcache development-кандидата той же сигнатуры, отсутствие upstream при запуске proxy, зависание Playwright addStyleTag при отключённом JS) устранены в test workflow и перепроверены. Они не скрыты как PASS; финальные строки выше относятся к завершённым повторным прогонам. Финальный release архив не заменялся.

## NOT RUN и границы

- Причина production `request_id=0b8dec9233a98244`, реальные `site_url`/audit origin/HTTP redirects/hosting telemetry. Для уточнения нужны только публичный URL и безопасные origin/status сведения, без key/config/POST body.
- Staging/production deployment, merge, настоящие Google/Yandex SDK, GTM container contents и рабочие API keys. «Live guard PASS» означает локальный перехват внешних запросов, а не выполнение удалённого SDK.
- Firefox/WebKit, другие версии PHP/MODX, LiteSpeed/IIS, конкретные CDN/WAF/shared-hosting policies.
- Реальная смена UTC-месяца во время self-request; expired/hostname-mismatched certificate, DNS outage/read timeout отдельными end-to-end injections (untrusted CA и connection refusal проверены).
- Concurrent managed-origin updates, arbitrary FS race, multi-node раздельные journals. Подтверждение требует, чтобы HTTP receiver и Manager видели один журнал; разные unshared storage не поддержаны как successful check.
- ENOSPC, power loss, DB outage, произвольный поздний native uninstall DB/FS failure и полнота native restore mode 2. Стандартный MODX transport не гарантирует атомарность этих ситуаций. Нужны DB/files/log/config backups и reviewed restore.

[Полные безопасные результаты](evidence/modx2-beta23-results.json), [ZIP inventory](evidence/modx2-beta23-zip-inventory.json), [обновление](modx2-beta23-upgrade.md). Screenshots: [receiver diagnostic](screenshots/beta23/safe-receiver-diagnostic.png), [HTTPS POST](screenshots/beta23/https-proxy-audit.png), [EN](screenshots/beta23/public-en.png), [RU](screenshots/beta23/public-ru.png).
