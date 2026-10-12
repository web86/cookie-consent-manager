# Beta15: приёмка настройки журналов

Дата: 2026-10-13. Ветка: `feature/modx2-category-consent-audit`. Production deployment и merge не выполнялись. Реализация: `4cc5f61efb40c2435ea1fa5bf884f6959a358ae9` (от `6dcaa8a`).

## Изменения

HTTP-доступ к журналам — ответственность владельца сайта. Удалены блокировки по Apache/nginx/LiteSpeed, proxy/CDN, HTTP 403 и все GET probes. Валидация каталога не выполняет HTTP-запросов и не создаёт файлов. Единственный HTTP-клиент нужен для явного POST-теста в существующий audit endpoint. Удалены автоматическая генерация `.htaccess` и его transport vehicle, включая каталог кода компонента. Старые файлы `.htaccess` сохраняются как untracked; защита публичного MODX core также задаётся владельцем сайта.

Поддерживаются относительный путь внутри DOCUMENT_ROOT и абсолютный путь внутри/вне него. Сохранены canonical/existence/writable checks, запрет traversal и symlink, проверки regular/single-link audit/state файлов. Logger, месячный формат JSONL, IP/User-Agent/consent_id, rate limiting и replay protection не изменены; старые журналы не очищаются.

Общая Save сохраняет остальные поля независимо от несохранённого пути во вкладке «Журнал». Неизменённые недоступные log_dir/legacy config не блокируют сохранение; новый путь через API валидируется. Кнопка включения записывает реальное событие через endpoint и находит event_id в JSONL. При отказе POST прежнее значение log_dir восстанавливается транзакцией с revision guard, даже если прежний каталог недоступен. Ключ и уже записанные события сохраняются. Атомарность DB/FS/HTTP не обещается.

Дополнительно исправлен повторный вызов валидации пустой локали после сохранения формы: normalized stdClass переводов преобразуется обратно в JSON-структуру перед проверкой. Legacy audit_protect сохранён только как валидатор пути (`valid=true`), не как проверка HTTP-защиты.

## Пакет

Immutable `cookieconsent-0.1.0-beta15.transport.zip`, SHA256:

```
0be1400d4915fd15ae8d739f879b66dc192685d044f14394d86aab634dc9aed8
```

Локальный ZIP: `.local/release/cookieconsent-0.1.0-beta15.transport.zip`; рядом SHA256, runtime inventory и ZIP inventory. Native modPackageBuilder: 62 vehicles (16 object, 44 file, 2 script), 110 ZIP entries. Нет Setup Options, собственного ledger, секретов или пользовательских путей. Две независимые native сборки после нормализации метаданных побайтно совпали. Старые beta5/beta7/beta13 ZIP сохранены.

## Результаты

**409 сценариев, 2649 assertions, 0 FAIL.** Три PHP-suite входят в assertions и не прибавляются как browser-сценарии. Итоговые проверки выполнялись на immutable beta15 и тестовом upgrade beta16 с тем же runtime; исходники runtime после сборки не изменялись. Все 256 provider masks представлены ровно один раз. HAR: 4418 запросов, 0 внешних в mock-матрице.

| Проверка | Сценарии | Assertions | Результат |
|---|---:|---:|---|
| Playwright Chromium / real MODX 2.8.8 | 281 | 1418 | PASS |
| HTTP through real MODX wrapper | 37 | 121 | PASS |
| Native MODX Manager UI | 4 | 13 | PASS |
| Live adapters with local network fulfillment only | 11 | 50 | PASS |
| MODX CMP/i18n integration | 17 | 60 | PASS |
| Manager ACL | 1 | 4 | PASS |
| Provider parameters | 4 | 17 | PASS |
| Category-only consent and migration | 8 | 51 | PASS |
| Apache journal Save | 11 | 45 | PASS |
| Actual HTTP server journal matrix | 6 | 84 | PASS |
| Manager UX / native integration | 15 | 116 | PASS |
| Native clean/upgrade/reinstall/uninstall | 8 | 130 | PASS |
| Native manual migration/uninstall | 2 | 233 | PASS |
| Native limitations and actual consent | 2 | 79 | PASS |
| Native immutable beta13 → beta15 | 1 | 35 | PASS |
| Legacy private JSON migration | 1 | 34 | PASS |
| PHP validator/logger | — | 80 | PASS |
| Manager settings/HTML/i18n PHP | — | 53 | PASS |
| Journal path/lexicon/locale PHP | — | 26 | PASS |

Машинный отчёт: [results JSON](evidence/modx2-log-policy-results.json), [ZIP inventory](evidence/modx2-log-policy-zip-inventory.json). Screenshots: [Apache](screenshots/log-policy/Apache-site.png), [nginx/PHP-FPM](screenshots/log-policy/nginx-PHP-FPM-site.png), [Apache за proxy](screenshots/log-policy/Apache-behind-nginx-proxy-absolute.png).

Серверная матрица — реальные Docker nginx/FPM и nginx reverse proxy → Apache, не подмена SERVER_SOFTWARE. По два режима каталога на каждый сервер. Внутренний POST Manager также проходит через proxy/FPM; Via/forwarded headers не вызывают отказ. Исторический sentinel в webroot намеренно отвечает HTTP 200 и сохраняется; отсутствие HTTP-защиты не блокирует аудит. PHP-смена SERVER_SOFTWARE для LiteSpeed/unknown — только unit, отдельно от live-матрицы.

Нативные проверки сохраняют hashes настроек, переводов, HTML, props элементов, audit key/config, меню/ACL/ресурсов/шаблонов и старых JSONL. Проверены immutable beta13→beta15, ручная/legacy миграция, private JSON priority, actual visitor consent при reinstall, native partial-install refusal и repair. `Require all denied` для публичного core задаёт сам тестовый сайт до установки, не transport.

Промежуточные проблемы: обнаружен normalized-empty-locale отказ и исправлен с regression; старое ожидание HTTP 503 для любого webroot каталога заменено новой policy-проверкой. Первый native прогон прерван пересозданием контейнера; разработческая замена неопубликованного ZIP той же сигнатуры потребовала сброса OPCache. Эти попытки не засчитаны как PASS. Итоговые clean/upgrade/reinstall/server/полная browser-матрица повторены на окончательном архиве. Доставляемый beta15 больше не пересобирается; опубликованные старые ZIP не менялись.

**Рекомендация: готов к контролируемой проверке на staging** после backup и настройки HTTP-доступа владельцем сайта. Это не разрешение на production deployment и не гарантия универсального rollback.

## Ограничения / NOT RUN

- Настоящие LiteSpeed, CDN, TLS-terminating proxy и произвольные production-конфигурации не запускались. PHP unit проверяет отсутствие зависимости от SERVER_SOFTWARE/forwarded headers; это не live-проверка этих серверов.
- Физическая смена месяца, disk-full, аварийное завершение PHP между limiter reserve и append, конкурентная подмена каталога другим локальным пользователем или Manager edit во время POST, Windows/IIS и DB fault injection во время restore — NOT RUN в этой приёмке. Canonical/symlink/hardlink, write refusal, malformed requests, duplicates и rate limiting покрываются указанными завершёнными тестами. Доступ к родительским каталогам должен контролировать владелец сайта.
- Произвольные файловые сбои install/uninstall не имеют гарантии атомарного rollback. Native partial-install test проверяет отказ проверки копирования и восстановление штатной reinstall, а не универсальную атомарность.
- Внешние live-ответы Analytics/Ads/GTM/Maps и безопасность произвольного GTM контейнера — NOT RUN; Network guards и 256 комбинаций используют локальные mocks, попытки внешних запросов проверяются отдельно.
- Production deployment и merge — NOT RUN по заданию.

## Установка

1. Сделать backup DB (включая registry tables/key), core/assets, пользовательских элементов/props, legacy audit config и всех JSONL.
2. Проверить SHA256; загрузить beta15 ZIP через MODX Package Manager и установить без Setup Options. Canonical чанки/сниппеты сохраняются; stock-копии сравнить и применить явно только при необходимости. Runtime file vehicles заменяют принадлежащие пакету файлы.
3. В «Журнал» выбрать расположение и существующий PHP-writable каталог: `logs/cookies/` относительно DOCUMENT_ROOT либо абсолютный путь. Ограничить HTTP-доступ средствами своей инфраструктуры; компонент правил не пишет.
4. Нажать «Проверить и включить журнал» и убедиться, что POST записан в JSONL. Проверочная запись остаётся. Остальные поля применять общей Save.
5. Для staging повторить проверку на фактической конфигурации сайта. Uninstall сохраняет настройки, элементы, private key/config, журналы и untracked файлы; отключить подключения шаблона перед удалением runtime. При частичном отказе использовать native logs/reinstall либо backup/restore.

Журналы могут содержать IP-адреса и технические сведения о посетителях. Ограничение HTTP-доступа к каталогу обеспечивает администратор сайта
