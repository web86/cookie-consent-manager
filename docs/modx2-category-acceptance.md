> Историческая приёмка beta13. HTTP protection/probe политика заменена в beta15; см. [новый отчёт](modx2-log-policy-acceptance.md).

# Приёмка beta13 — сохраняемость и category-only consent

Дата: 12 октября 2026. Baseline: feature/modx2-manager-ux / 80f30ac. Ветка: feature/modx2-category-consent-audit. Первый коммит реализации: de093a4; финальные stock texts/поставка и evidence — следующий коммит.

**GO для review.** Финальные исполненные проверки: **398 сценариев, 2532 assertions, 0 FAIL** (включая 151 PHP assertion). Два отдельных baseline repro доказывают ошибки beta7 и не выдаются за успешное сохранение. Production/main/действующие журналы не изменялись; сбрасывались только disposable fixture DB с архивированием прежних файлов.

[Инструкция установки/миграции](modx2-category-consent.md), [root cause Stage A](modx2-save-root-cause.md), [машинные результаты](evidence/modx2-category-results.json).

## Блокирующий Save — причины и доказательства

1. Beta7 трактовал /logs/cookies/ как filesystem path /logs/cookies, хотя пользователь имел в виду DOCUMENT_ROOT/logs/cookies. На Apache MODX 2.8.8 сохранение отвечало HTTP 200 success=false, при существующем каталоге и настоящем HTTP 403. Теперь mode=site явно разрешает путь относительно настоящего DOCUMENT_ROOT; mode=absolute сохраняет совместимость с приватными абсолютными путями. В setting хранится canonical absolute path.
2. После setup beta7 отклонял custom .htaccess с guard_review, хотя HTTP отвечал 403. Сейчас пользовательские правила не заменяются и не сравниваются побайтово. Path safety плюс реальные probes/existing logs/.rate/state.json должны давать 403. Guard не считается доказательством сам по себе, nginx/CDN/unknown не получают fallback.
3. До setup проверка защиты возвращала audit_not_configured, усложняя правильный порядок. Единая операция проверяет path/protection → setup → guarded directory Save → настоящий POST/JSONL. Обычная Save работает и без настроенного аудита.

Сначала получены эти baseline failures и положительные Stage A результаты, затем изменён public consent UI. На fixture прошли Save без журнала, Save /logs/cookies/ с custom guard без config, относительный путь с пробелом/без ведущего slash, абсолютный private path, missing/traversal/permissions/revision errors. Forced HTTP 403 на самом receiver проверяет post failure: HTTP 200 success=false не маскируется, предыдущий каталог восстанавливается, старые журналы не удаляются. При restore conflict отдельная причина; универсальный rollback не обещан. Проверочные POST записи сохраняются.

Journal controls перенесены в Журнал, Main оставлен TTL/buttons/reconsent. Причины ошибок локализованы; action/status/request_id остаются для диагностики без secret/draft. Техническое stock-copy предупреждение скрыто из UI, остаётся в upgrade docs. После enable сохраняется только directory; другие черновики ждут общую Save.

## Consent UI / migration

Public и preview: **4 checkbox**: necessary locked/disabled + analytics/marketing/external_content. Provider checkbox отсутствуют. Каждая категория показывает один editable administrator description, без автоматически собранных сервисов. Тексты: один MODX language select, HTML source и 8 category fields, всего 9. Legacy service translations/descriptions/прочие strings остаются в DB; standard RU/EN strings и accessibility используются как stock fallback. Исправлена также stock фраза о выборе individual services.

Внутренние providers/fingerprints/consent_id и schema1/2 не удалены. Category choice разрешает все активные её сервисы; disabled не запускаются. Старые partial grants сохраняются точно; смешанная категория помечена indeterminate, untouched Save не расширяет набор. Явный toggle/Accept all считается новым выбором. Новые/включённые/изменённые fingerprint providers требуют review и не наследуют grants. Old records не переписываются при чтении, после upgrade старый consent_id/localStorage/JSONL сохраняются. GTM требует полного набора активных разрешений; marketing alone не отменяет его guard. Individual map load/revoke сохраняются и не разрешают другие SDK/карты.

Полная прежняя матрица 256 grants выполнена через настоящие legacy localStorage records + новый category-only Save. Это позволяет сравнить каждый exact provider set и Network без возвращения скрытых controls. No-consent и category union проверены отдельно. Аудит schema2 реально найден в PHP JSONL с точными category/provider flags и тем же consent_id; schema1 и receiver security покрыты HTTP/PHP suites.

## Финальная матрица

| Проверка | Статус |
|---|---|
| 281 browser scenarios, 256 provider masks, 1418 assertions | PASS |
| 36 HTTP receiver/JSONL/security/replay/concurrent/rate tests | PASS |
| 4 native Manager registry tests | PASS |
| 11 locally intercepted live adapter tests | PASS |
| 17 Manager/i18n/HTML/XSS tests | PASS |
| Restricted Manager + provider privacy parameters | PASS |
| 15 прежних UX/security/cache/reconsent tests, адаптированных к relocation | PASS |
| 7 Save/journal/POST-failure GUI/API tests | PASS |
| 8 category-only/migration/schema/preview tests | PASS |
| 10 native clean/reinstall/upgrade/uninstall/manual/publiccore tests | PASS |
| Native beta7→beta13, actual consent + JSONL/settings/elements retention | PASS |
| Legacy private JSON без ENV, priority/POST/native data retention | PASS |
| Native partial verification failure/repair + actual consent retention | PASS |
| PHP receiver 80 + settings/i18n 53 + paths/lexicons 18 | PASS |

Public HAR: **4418 entries, 0 external origins**. Manager Gravatar заблокирован fixture; live vendor URLs перехватываются, реальные vendor callbacks не аттестованы. Stress fixture rate=10000 для матрицы; boundary/429 проверяется отдельно. Target: MODX Revolution 2.8.8-pl, PHP 8.2.34 Apache, MariaDB 10.6, Playwright 1.62.1 Chromium.

Матрица поведения полностью выполнена на beta11 candidate. После единственного финального изменения stock intro/fallback texts выполнены финальные beta13 GUI/Save/native/upgrade/partial regressions; provider JS не менялся. Временная ошибка старого UX harness была вызвана empty .htaccess, оставленным его cleanup, а не безопасным fallback продукта; cleanup исправлен и suite повторён до 0 FAIL.

## Поставка

ZIP: `.local/release/cookieconsent-0.1.0-beta13.transport.zip`, рядом SHA256/source inventory/ZIP inventory. Native builder; **62 vehicles**: 16 object, 44 exact file, 2 script; Setup Options/own lifecycle ledger отсутствуют. Пользовательские canonical элементы/settings/props/переводы/logs сохраняются; шаблоны не правятся автоматически.

```text
2efde1b37e1e18a675a464aa25865f19a5121bf0f3dc8752108b8d880896043d  cookieconsent-0.1.0-beta13.transport.zip
```

Beta7 immutable: SHA `ae07df2955e4e0210b3333fd908db2257af576ac5f34290589609ebd2c67c79a`. Native archive verification/defaults/excludes/checksums проверены; secrets/customer config в ZIP не включены. Beta9/10 и beta11/12 использовались локально в разработке; beta14 — test-only upgrade, corrupted beta91 — failure fixture. Поставляется beta13.

Uninstall сохраняет DB settings/элементы/menu/ACL/native private key/config и private/public logs/rate-state; удаляет только package-managed runtime files. Partial install обнаруживается по verification/hash diff, native reinstall восстанавливает runtime; старые значения/data/key остаются. Snapshot proof — hashes, не raw secrets/IP. Backup DB/runtime/elements/config/JSONL обязателен; native rollback не является универсальной гарантией.

## NOT RUN — явно

* Доступ и retest на production: механизмы из задания воспроизведены локально, неизвестные другие причины конкретного хостинга не заявлены устранёнными.
* Реальные HTTPS certificates/nginx/CDN/reverse proxy/alternate-vhost configurations и скрытые aliases. Apache HTTP + rejection branches tested; public storage на неподдержанных схемах запрещён, private рекомендуется.
* Firefox/WebKit/custom Manager skins/language plugins/другие PHP/MODX versions.
* Real vendor callbacks/production IDs/paid Maps keys (live suite intercepted).
* ENOSPC/EIO/process kill/power loss/DB outage/multi-node/concurrent enable и failure самого revision-guarded restore. POST failure restore проверен; общий atomic DB/FS rollback не заявлен.
* Race server protection между probe и append, неизвестные CDN/cache routes.
* Corrupted/missing native key/options и backup restore под injected outage.

## Скриншоты

[Public categories](screenshots/categories/public-categories.png), [Manager category preview](screenshots/categories/manager-category-preview.png), [Journal enabled](screenshots/categories/journal-enabled.png), [Concrete path error/draft](screenshots/categories/journal-specific-error.png).

Staging: backup → SHA → native Package Manager beta13 → явно сравнить stock/custom элементы при необходимости → Journal mode/path/Check and enable → реальный POST/JSONL/Network → review old partial consent и maps. Никаких production deployment или merge без отдельного подтверждения.
