# MODX 2 — Adapter cache build acceptance

Исторический снимок приёмки `573274b`. Версионирование впоследствии упрощено: [timestamp acceptance](modx2-bundle-timestamp-acceptance.md).

Дата: 16.10.2026. Версия пакета сохранена: **1.0.5-beta1**. Это локальная feature-ветка, не новый release.

## Исходное состояние и результат

- Исходный локальный репозиторий: `/Users/sonoma/Desktop/cookie-consent-manager`.
- Исходная ветка: `codex/modx2-video-embeds`.
- Проверенный HEAD: `c5fdf8339d4adbe2b1fea3501bd91706cc6962b9`; рабочее дерево до начала чистое.
- Рабочая ветка: `codex/modx2-adapter-cache-build`, создана от этого HEAD в локальной рабочей копии. Итоговый commit определяется `git rev-parse codex/modx2-adapter-cache-build`; точный hash также указан в переданном пользователю отчёте после коммита.
- Исходники всех 21 frontend JS-файлов, registry/defaults, CookieConsentMap и CookieConsentVideo побайтно совпадают с beta1. Prebuilt JS SHA256 остаётся `49fbf428d0fd61b456f5d322647a224f5076bf103d097db2a20f64c6cda5b897`.
- Push, merge, release и production deployment не выполнялись. Ветка `modx3` не изменялась.

## Как работает сборка

`CookieConsentBundleManager` читает тот же упорядоченный `inputs` из `_build/frontend-manifest.json`, что и сохранённый Node/esbuild release-builder. В transport включены этот manifest, все перечисленные JS-исходники и PHP-зависимость. Отдельного списка адаптеров нет. Порядок, общая initialization guard и один загружаемый production bundle сохранены.

Административный `OnSiteRefresh` и install hook собирают snapshot исходников и SHA256 fingerprint путей/содержимого/рецепта. При совпадении последней успешной сборки запись пропускается. Кнопка Manager с `cookie_consent_manage` принудительно повторяет сборку через обычный POST connector/modAuth. Контекст `web`, неаутентифицированные запросы и роль только просмотра журнала сборку не запускают.

Готовый кеш: `assets/js/cookie-consent/cached-cookie-consent.min.js`. Он лежит рядом с prebuilt, вне `core/cache`, чтобы сохранить относительные пути mock SDK. Стандартный `system/clearcache` MODX 2.8.8 сначала очищает штатные разделы и затем вызывает `OnSiteRefresh`; этот публичный каталог не удаляется. Служебный plugin регистрируется идемпотентно при install/reinstall и удаляется при uninstall. Дополнительных системных настроек нет.

Конкурентная запись защищена неблокирующим `flock` на фиксированном `cookie-consent.build.lock`. Минифицированный JS и успешные метаданные в его первой строке заменяются **одним rename** из временного файла того же каталога. Ошибка чтения, разбора, записи или блокировки не меняет прежний рабочий bundle. В `cookie-consent.last-error.json` хранится только время неудачной попытки; успешные метаданные остаются внутри прежнего JS. Успешная сборка/проверка прежнего исправного snapshot очищает индикатор ошибки. Поколения кеша не создаются.

Manifest допускает только JS-пути внутри `assets/js/cookie-consent/`; traversal, абсолютные пути, `.min.js` как input и symlink/выход за canonical source root отклоняются. Параметров запроса для выбора путей нет.

## Минификация и fallback

Используется закреплённый **Peast 1.17.6**, BSD-3-Clause: ES2020 parser → AST → Compact renderer → повторная проверка синтаксиса. Исходный runtime библиотеки не изменён; включены LICENSE, происхождение и checksum архива. Никакой regex-минификации, Node/npm/Composer или внешнего HTTP-сервиса на хостинге. Требуемый mbstring уже входил в контракт компонента. Источники: [официальный tag](https://github.com/mck89/peast/tree/v1.17.6), [rendering/Compact](https://github.com/mck89/peast/blob/v1.17.6/doc/rendering.md).

Peast удаляет комментарии/пробелы и необязательные скобки, не сокращает имена и не транспилирует. Текущий JS body: **39331 bytes** против **29435 bytes** esbuild; gzip: **11366 / 10316 bytes**. С метаданными готовый PHP asset занимает 39548 bytes. Это безопасная реальная минификация, но не побайтное равенство esbuild; поведенческое равенство проверяется differential/browser suites.

`CookieConsentAssets` читает только короткую первую строку готового JS. `?v=` — SHA256 минифицированного JS body; при изменении результата URL обновляется. Повторная force-сборка того же JS сохраняет ту же content version. Исходники, fingerprint, locks и минификатор на frontend не используются; autoload Peast там не подключается. Если кеша нет, выбирается неизменённый prebuilt `cookie-consent.min.js` из transport с release hash в URL. Frontend не прогревает кеш и не ставит отложенные задания.

При невозможности прогрева установка сохраняет рабочий prebuilt и пишет ограниченный diagnostic. Сгенерированный кеш не входит в transport и сохраняется при uninstall, как непоставляемый файл; полное ручное удаление runtime включает этот файл. CDN/HTML caches, игнорирующие query version, очищаются администратором сайта.

## Руководство RU/EN

Канонический `_build/user-guide.json` обновлён; штатным generator пересозданы `CookieConsentGuide.php`, package README и guide manifest. Сохранены четыре базовых раздела: Strict/Legacy, подключение шаблона, custom JS, onAllowed/stillAllowed. Добавлен короткий раздел редактирования встроенного адаптера, очистки кеша и кнопки пересборки. Раздел видео содержит три точных способа: CookieConsentVideo для YouTube/RUTUBE/VK, собственный inert template и onAllowed с проверками stillAllowed. Объяснены категория/Legacy-политика и официальный VK Share/embed src с сохранением выданного hash. Внутренняя архитектура сборки в пользовательскую инструкцию не включена; существующее modal-оформление сохранено.

## Автоматические проверки

Финальные сводки: `docs/evidence/modx2-adapter-cache-build-results.json`. Детальные временные журналы/скриншоты сохранены в `.local/adapter-cache`, `.local/universal-evidence` и `.local/github-frontend-build` рабочей копии.

| Проверка | Результат |
| --- | --- |
| Cache builder: PATH без Node/npm, skip/force, ошибки, manifest/symlink, parallel lock, frontend/fallback | PASS, по 50 assertions на PHP 8.1.34 / 8.2.34 / 8.5.10 |
| Regex / ASI / division / templates / optional chaining / nullish / Unicode | PASS, точное сравнение JS-результата |
| Источники, manifest, generated guide и package invariants | PASS, 67 assertions; с native inventory — 97 |
| Registry / PHP video URLs / PHP snippets / JS contracts | PASS, 51 / 31 / 34 / 15 assertions |
| PHP-built video/template browser | PASS, 42 сценария / 646 assertions |
| Differential с immutable beta5 | PASS, 49 / 253 |
| Differential PHP vs текущий beta1 esbuild | PASS, 49 / 253 |
| Universal regression | PASS, все 20 suites, 0 FAIL |
| Реальный Manager cache-clear, force, failures, public guard, RU/EN и draft | PASS, 10 / 57 |
| Native fresh / upgrade beta32 и beta5 / reinstall / uninstall | PASS, 8 / 294; плюс 6 assertions plugin/event/warmup |
| Видео на настоящем standard/Fenom, RU/EN, cold/warm, ACK/JSONL | PASS, 10 / 244 |
| Итоговые native payload SHA256, source links, Preview isolation | PASS, 250 assertions для 242 runtime files |
| Standalone PHP contract/security/audit suites | PASS, 15 suites / 976 assertions на PHP 8.2; Fenom native PHP — ещё 20 |
| Frontend CI (source coverage, hashes, reproducibility, API) | PASS; focused differential 19 / 95 |
| PHP / JS syntax | PASS, 274 / 146 файлов |
| Реальное воспроизведение | 0 новых PASS / 3 унаследованных SKIP |

После runtime-прогонов названия в руководстве сверены с существующими полями General / «Исходный код адаптера»; генерация и `--check` повторены. Логика runtime и JS при этой редактуре не менялись.

Существующие assertions не ослаблялись. Тестовый `frontend-asset.mjs` сравнивает полный JS body с явно выбранным PHP-кандидатом, проверяет его content hash и точный fingerprint; отличается только время сборки в первой строке. По умолчанию он по-прежнему требует исходный esbuild prebuilt. В version assertions учтён новый content-hashed asset. CI использует существующий video-aware differential harness с явной проверкой mountEmbeds и прежними API assertions; добавлена проверка полноты `embeds/` в manifest.

## Обнаруженные и исправленные проблемы

- Native reinstall выявил ошибку записи составного PK `modPluginEvent`: исправлен вызов `fromArray(..., '', true, true)`. Финальные тесты проверяют ровно один plugin/event и настоящий cache-clear.
- При разработке пакета с той же signature и нормализованными timestamps на disposable Apache встречался старый opcode cache transport manifest. Стенд перезапускался перед повторной установкой; первая частичная установка не считалась PASS. Версия продукта для обхода тестового кеша не менялась.
- Старый log-directory PHP suite на macOS требует canonical `TMPDIR=/private/tmp`, поскольку `/var` — symlink. На Linux suite выполнен без ослабления проверок. Fenom-only guard запускается только на помеченном Fenom clone.

## Ограничения и release gates

- Реальное воспроизведение YouTube / RUTUBE / VK остаётся **3 SKIP**, унаследованными из video acceptance, а не новым PASS. Для VK не предоставлен проверенный официальный embed URL. HTTP 200 и synthetic iframe не доказывают воспроизведение.
- Реальные vendor delivery, owner/geo/referrer/CSP restrictions, autoplay, Firefox/WebKit, production hosting/CDN остаются staging gates предыдущей видео-приёмки.
- PHP Compact не заменяет esbuild по степени сжатия и транспиляции. Поддерживаемый исходный синтаксис — ES2020; неподдерживаемые/некорректные изменения отклоняются с сохранением рабочего JS.
- Нужны права записи в публичный каталог компонента для административных сборок; read-only hosting продолжает использовать готовый файл.
- Новый transport собран исключительно как локальный тестовый fixture для install/upgrade/packaging, без изменения номера версии и без публикации.

## Изменённые файлы

Полный список, включая все vendored PHP-файлы: `docs/evidence/modx2-adapter-cache-build-files.json`.

- Сборка/packaging/CI: `_build/frontend.mjs`, `_build/frontend-manifest.json`, `_build/build.php`, `_build/verify-install.php`, `_build/frontend-ci.mjs`, `.github/workflows/frontend-build.yml`, `package.json`.
- Сервер: `CookieConsentBundleManager.php`, `CookieConsentBundleInstall.php`, `plugins/cache-build.php`, `processors/bundle_rebuild.class.php`, `processors/get.class.php`, Assets snippet, CLI installer, vendored `server/vendor/peast/`.
- Manager: `manager.js`, RU/EN lexicons.
- Руководство: `user-guide.json`, generated PHP/package README/guide manifest.
- Документация: README, changelog, этот отчёт и machine evidence.
- Тесты: `tests/adapter-cache/`, точные asset helpers/version checks существующих suites, ACL и video guide assertions.
