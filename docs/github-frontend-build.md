# Сборка frontend JavaScript на GitHub

Исходная версия — `cookieconsent-1.0.4-beta5`, MODX 2 ветка
`codex/modx2-service-adapters`, исходный commit
`323fca738ab5bd7f512c714b2e701f570fce1a63`.
Workflow: [frontend-build.yml](../.github/workflows/frontend-build.yml),
название в Actions — **CMP — Frontend Build**.

Это сборка frontend, без MODX transport ZIP, PHP, MODX, БД, credentials,
GitHub Release, автоматических коммитов и deployment. Пакет остаётся beta5.
`main` и `modx3` независимы; runtime-код между ними не переносится.

## Что именно выполняется

- Push в `codex/modx2-*`, изменяющий `assets/js/cookie-consent/**`, frontend CSS,
  `_build/frontend*`, npm-конфигурацию/lockfile, differential fixtures,
  `demo.html` или YAML workflow, запускает сборку автоматически.
- Для ручного запуска есть `workflow_dispatch` и стандартный выбор **Branch**.
  Используется tip выбранной ветки **в момент события**, зафиксированный в
  `github.sha`. Checkout выполняется по SHA, затем `HEAD` сверяется с ним.
  Более поздний push не меняет уже запущенную сборку. Повторный Run workflow
  берёт новый tip; Re-run jobs существующего запуска сохраняет прежний commit.
  Отдельного поля произвольного commit SHA нет; SHA выбранного запуска виден
  в Actions, имени artifact и отчёте.
- Запуск с `main`, `modx3` или другой ветки вне `codex/modx2-*` завершается
  ошибкой до checkout. Fallback на default branch отсутствует.
- Runner — GitHub-hosted `ubuntu-24.04`, timeout 15 минут. Token имеет только
  `contents: read`, checkout не сохраняет credentials.
- Node закреплён на `22.23.2`; `npm ci` использует lockfile v3 с integrity.
  В проекте нет `engines`, `.nvmrc` или `.node-version`; lockfile требует
  Node >=18 для esbuild и >=20 для Playwright. DevDependencies остаются
  `esbuild 0.28.2` и `playwright 1.62.1`. Все три Actions закреплены полными
  commit SHA с указанием версии в YAML. Runner/системные browser dependencies
  обновляются GitHub/Ubuntu; воспроизводимость проверяется для выходных файлов.
- Команда остаётся **`npm run build:frontend`**. Исходный builder неизменён:
  явный порядок конкатенации, IIFE, esbuild transform, `es2020`, ASCII,
  minification. Browser imports/chunks не добавляются. Рабочий файл:
  `assets/js/cookie-consent/cookie-consent.min.js`.
- Существующая команда также пересобирает CSS. CSS проверяется, но в artifact
  для ручной замены JS не включается. Manifest содержит сведения об обоих outputs.

Проверки запускает [_build/frontend-ci.mjs](../_build/frontend-ci.mjs):

1. Выбранная ветка/commit, чистый checkout в CI, версии инструментов.
2. Сборка штатной командой; полный список production inputs в manifest,
   SHA256 каждого исходника, builder и lockfile; SHA256 и размеры outputs.
   Устаревшие **закоммиченные** bundle/manifest допустимы: CI генерирует их заново
   из выбранных исходников. Поэтому для правки адаптера через GitHub локальная
   сборка и commit generated-файлов не требуются.
3. JS syntax check исходников и bundle как classic scripts; `node --check`
   для build/test scripts; запрет dynamic import.
4. Вторая сборка из тех же inputs: JS, CSS и manifest должны совпасть побайтно.
   Вместе с SHA inputs это связывает сгенерированный bundle с исходниками.
5. Существующий `tests/frontend-refactor/equivalence.mjs --focused`:
   **19 сценариев** адаптеров/категорий, Strict/Legacy, live/mock,
   pending SDK/revoke и map dialog. Он сравнивает candidate с immutable beta4
   `de41eaa0f976c54c0d2836b605c7474ad874c472`, читая его через `git show`.
   Поэтому checkout включает историю. HTTP/SDK-запросы целиком подменяются
   fixtures; реальные сайты и SDK-сервисы не вызываются.
6. Differential сравнивает API, callbacks/unsubscribe/guards, storage,
   audit payloads, SDK queues и запросы на checkpoints. Отдельный gate сверяет
   имена `web86CookieConsent`/`web86Providers` с записанным public contract.
   Последняя проверка повторно сверяет хеши outputs после тестов.

Любая ошибка обязательного gate, npm install, browser install или upload даёт
**FAIL**. Успешный artifact публикуется только после всех проверок.
Если build/test step завершился ошибкой, его `build-report.txt` печатается в log;
ошибки до этого шага видны в соответствующем Actions step.

Это **не полный regression PASS**. В отчёте явно указаны:

- **SKIP** `tests/frontend-refactor/build.mjs`: включает проверки native ZIP и
  inventories; frontend-хеши и воспроизводимость проверяются отдельным gate.
- **SKIP** `tests/legacy-autoload/{browser,matrix}.mjs` и
  `tests/universal/regression.mjs`: нужны MODX/PHP/БД/локальные fixtures.
- **SKIP** native/PHP/Fenom/Manager/upgrade acceptance и настоящая vendor delivery.

Focused differential требует сохранения существующего поведения. Если исправление
адаптера намеренно меняет наблюдаемые SDK-запросы, старое ожидание может дать FAIL.
Сначала проверьте причину, затем отдельно согласуйте изменение контракта/fixtures
и независимые проверки нужного поведения. Не отключайте gate ради зелёного статуса.

## Первая публикация: подготовленные шаги, ещё не выполнены

Read-only проверка `git ls-remote --symref origin ...` от 2026-10-16 показала:

| Ref | Состояние GitHub |
| --- | --- |
| `origin` | `https://github.com/web86/cookie-consent-manager.git` |
| default `HEAD` | `main` |
| `main` | `0c5e2fe8a0d9cac67fb7a3e83bd3976fc6b87fd6` |
| `modx3` | `1fd687249fa474c2ce3ba21ddc64b0344d3f1b6a` |
| `codex/modx2-service-adapters` | На remote отсутствует; локальная ветка без upstream |

Перед публикацией повторите read-only проверку: remote мог измениться.
Следующие команды — инструкция для владельца после **отдельного разрешения**
на публикацию. В рамках реализации push/merge/release/deployment не выполнялись.

### 1. Опубликовать MODX 2 feature-ветку

Проверьте локальный commit с workflow, helper и документацией, затем публикуйте
всю feature-ветку с её историей — baseline должен оставаться доступным.

```sh
git switch codex/modx2-service-adapters
git status --short --branch
git log -1 --format='%H %s'
git remote -v
git ls-remote --symref origin HEAD refs/heads/main refs/heads/modx3 refs/heads/codex/modx2-service-adapters
# Только после разрешения на push:
git push --set-upstream origin codex/modx2-service-adapters
```

Первый push с YAML должен запустить автоматическую сборку этой ветки.
Проверьте Actions и SHA запуска. Для автоматической сборки наличие YAML в `main`
не требуется. Если Actions выключены, владелец должен разрешить GitHub Actions
и использование закреплённых официальных actions в Settings → Actions.

### 2. Добавить только workflow в default branch

Для появления ручной кнопки GitHub требует `workflow_dispatch` workflow в
[default branch](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).
Не мержите MODX 2 feature-ветку в `main` ради этой кнопки.
Подготовьте отдельную ветку от актуального `origin/main`, перенесите **только YAML**:

```sh
git fetch origin
git worktree add ../cookie-consent-manager-workflow-main -b codex/frontend-workflow-entry origin/main
cd ../cookie-consent-manager-workflow-main
git restore --source=codex/modx2-service-adapters -- .github/workflows/frontend-build.yml
git add .github/workflows/frontend-build.yml
git diff --cached --stat
git diff --cached
git commit -m "ci: expose MODX 2 frontend workflow dispatch"
# Только после отдельного разрешения на публикацию этой ветки:
git push --set-upstream origin codex/frontend-workflow-entry
gh pr create --base main --head codex/frontend-workflow-entry --title 'ci: expose MODX 2 frontend workflow dispatch' --body 'Add only the frontend workflow entry. Builds run on the selected codex/modx2-* branch at its event SHA.'
```

Diff этого PR должен содержать только `.github/workflows/frontend-build.yml`.
Helper, package files, PHP/JS и тесты остаются в MODX 2 feature-ветке. Merge PR
в `main` — отдельное действие владельца после разрешения. На `main` workflow
нельзя успешно запустить: ветка должна быть выбрана MODX 2. При выборе feature
GitHub использует workflow и helper из выбранной ветки. `modx3` не меняется.

При последующих изменениях dispatch/YAML поддерживайте эту entry-копию актуальной
отдельным YAML-only изменением; runtime переносить не требуется.

## Как исправить один адаптер через GitHub

1. Откройте репозиторий, выберите **`codex/modx2-service-adapters`**.
   Убедитесь, что видите beta5 и каталог `assets/js/cookie-consent/services/`.
2. Откройте нужный адаптер, например `services/yandex.js`, нажмите Edit.
   Прочитайте [SERVICE-ADAPTERS.md](../tests/frontend-refactor/SERVICE-ADAPTERS.md).
   Сохраните действующий loader/категории/API и проверяйте входные параметры.
3. Сделайте небольшой commit в этой ветке. Если правила репозитория требуют PR,
   создайте `codex/modx2-...` ветку от неё и PR обратно в MODX 2 feature-ветку.
   Не выбирайте `main` или `modx3` как base.
4. Не редактируйте `cookie-consent.min.js` вручную. Push исходника автоматически
   запускает workflow, который пересоздаст bundle/manifest без обратного commit.
5. Откройте Actions → **CMP — Frontend Build**, найдите запуск именно вашего SHA.

При создании новой MODX 2 ветки используйте префикс `codex/modx2-`, чтобы совпали
branch filter и guard. Workflow/helper должны присутствовать в её истории.

## Run workflow, выбор ветки и скачивание

После публикации YAML в default branch:

1. Actions → **CMP — Frontend Build** → **Run workflow**.
2. В **Branch** выберите **`codex/modx2-service-adapters`** или вашу
   `codex/modx2-*` ветку с изменением. Не оставляйте предложенный `main`.
3. Нажмите Run workflow, откройте созданный запуск. Проверьте branch и commit.
4. Дождитесь зелёного `frontend`. Внизу страницы запуска в **Artifacts** скачайте
   `cmp-frontend-<полный SHA>-<run_id>-<run_attempt>`. Время хранения — **30 дней**
   (политика организации/репозитория должна позволять этот срок).

CLI-эквивалент после публикации entry в default branch:

```sh
gh workflow run frontend-build.yml --repo web86/cookie-consent-manager --ref codex/modx2-service-adapters
gh run list --repo web86/cookie-consent-manager --workflow frontend-build.yml --branch codex/modx2-service-adapters
```

Содержимое скачанного artifact ZIP:

```text
cookie-consent.min.js
frontend-manifest.json
cookie-consent.min.js.sha256
build-report.txt
```

В `build-report.txt` проверьте SHA, branch, время UTC, размеры/хеши JS/CSS,
Node/npm/platform, результаты PASS/SKIP. Общий статус должен быть
`PASS (frontend-only; not full regression)`. Actions artifact digest относится
к архиву artifact; `cookie-consent.min.js.sha256` — к самому JS, это разные хеши.

## Проверка SHA256

Распакуйте ZIP, перейдите в каталог его файлов:

```sh
# Linux
sha256sum -c cookie-consent.min.js.sha256
# macOS
shasum -a 256 -c cookie-consent.min.js.sha256
```

Windows PowerShell:

```powershell
Get-FileHash .\cookie-consent.min.js -Algorithm SHA256
Get-Content .\cookie-consent.min.js.sha256
```

Полный хеш должен совпасть также с
`outputs["assets/js/cookie-consent/cookie-consent.min.js"].sha256` в manifest.
Manifest хранит hashes **репозиторных** sources; на установленном сайте этих
исходников обычно нет. Проверяйте их по выбранному commit, если расследуете сборку.

## Ручная замена на тестовом сайте

Применяйте сначала на staging с совместимой beta5 PHP registry/configuration,
сниппетом Assets и разметкой. JS из другой ветки или версии установленного CMP
не гарантированно совместим. Если изменение требует нового PHP registry,
разметки или CSS, одного этого artifact недостаточно.

1. Сделайте backup существующего JS вне публичного каталога; запишите его SHA256,
   установленную версию CMP и текущий URL bundle. Сохраните возможность отката.
2. Проверьте SHA скачанного файла. Вручную загрузите его временным файлом в тот же
   каталог тестового сайта и переименуйте поверх рабочего файла после полной
   загрузки (атомарный rename, если доступен). Сохраните права чтения web server.
   Целевой путь относительно `MODX_ASSETS_PATH`:
   **`js/cookie-consent/cookie-consent.min.js`**, обычно
   **`/assets/js/cookie-consent/cookie-consent.min.js`**.
   Это не `/assets/components/cookieconsent/`. При custom assets path проверьте
   реальные настройки. Повторно сравните SHA файла на сервере с artifact.
3. Не загружайте build scripts, manifest/отчёт в публичный JS каталог, PHP или
   отдельные source modules. Компонент подключает один bundle.
4. Очистите штатный MODX resource/HTML cache, Fenom cache если используется,
   внешний full-page/reverse proxy cache и CDN HTML. Вызов `[[!CookieConsentAssets]]`
   рекомендован uncached один раз в head; учитывайте также внешнее кеширование.
5. Проверьте новый HTML, URL и загруженные bytes, затем Strict/Legacy сценарии
   вашего сайта: первый визит, отказ, сохранённый выбор, изменение категорий,
   отзыв согласия, отсутствие дублей SDK и неожиданных ошибок в Console/Network.
   Реальные интеграции staging требуют собственной проверки.

### Как проверить content-hash URL и кеши

Проверен исходный [CookieConsentAssets](../server/modx2-assets-snippet.php):

```php
$assets = (string) $modx->getOption('assets_url');
// Для JS path = js/cookie-consent/cookie-consent.min.js
$assets.$path.'?v='.substr(hash_file('sha256', MODX_ASSETS_PATH.$path), 0, 20)
```

Hash вычисляется по **содержимому фактического файла** при выполнении сниппета,
не по версии пакета, mtime или frontend manifest. При изменении bytes и свежем
рендеринге страницы `v` меняется автоматически. При тех же bytes `v` тот же.

Для текущего beta5 JS SHA256:

```text
9301ab31d3f61edb88a551d918db9df61f8cc7e93a42b1d0584ff33451221887
```

Соответствующий URL заканчивается на `?v=9301ab31d3f61edb88a551`.
При будущих исправлениях возьмите первые 20 символов **нового** хеша из artifact.

Откройте свежий HTML и Network → `cookie-consent.min.js` в DevTools:

- `v` совпадает с первыми 20 hex-символами SHA установленного файла.
- В head один deferred JS bundle, нет загрузки отдельных adapters/chunks.
- При проверке включите Disable cache/hard reload или используйте новый профиль;
  затем убедитесь, что обычная загрузка тоже использует новый URL.
- Скачайте **точный URL из HTML** и проверьте bytes, например локально:

```sh
# Подставьте свой staging URL и новый v из manifest. Не используйте URL production.
curl --fail --silent --show-error --compressed 'https://staging.example.test/assets/js/cookie-consent/cookie-consent.min.js?v=NEW_FIRST_20_HEX' -o served-cookie-consent.min.js
shasum -a 256 served-cookie-consent.min.js
```

CDN должен учитывать query string `v` в cache key. Если он игнорирует query,
нужны purge/invalidation JS-объекта и исправление CDN policy. Проверьте также
service worker/custom caches, если они есть. Старый `v` в HTML при новом файле
означает stale HTML/cache, другой assets path или установленный сниппет с иной
реализацией. Новый `v` при старых bytes означает stale asset/CDN/origin routing.
Очистка только браузерного кеша не исправляет stale HTML на CDN.

Для rollback восстановите backup JS и снова очистите HTML/CDN caches;
`CookieConsentAssets` вернёт hash восстановленного содержимого.

Ручная замена JS:

- **Не обновляет версию пакета** в MODX Package Manager.
- **Может быть перезаписана** последующим обновлением/переустановкой компонента.
- **Не заменяет staging-приёмку** и проверку реальных интеграций.
- **Не гарантирует совместимость** с другим PHP registry или другой версией CMP.

Автоматической замены файлов на клиентском сервере workflow не выполняет.

## Как понимать ошибки Actions

| Шаг/ошибка | Что проверить |
| --- | --- |
| Require a MODX 2 feature branch | В Branch выбран `main`/`modx3`/неподдерживаемый ref. Выберите MODX 2 feature. |
| Нет Run workflow | YAML с `workflow_dispatch` ещё не в default branch; также нужны write access и разрешённые Actions. |
| Нет автоматического запуска | Ветка/изменённый путь не совпал с filters; проверьте YAML в самой ветке и Settings → Actions. |
| Checkout / missing baseline commit | Опубликована ли выбранная ветка с историей beta4; fetch-depth должен оставаться 0. |
| npm ci | Lockfile не соответствует package.json, недоступен registry, integrity/version mismatch. Не заменяйте на npm install в CI. |
| Install Chromium | Browser download/system dependencies/network. Это FAIL инфраструктуры, не PASS тестов. |
| Syntax / manifest / hashes | Синтаксис адаптера, пропущенный builder input, изменённый toolchain или повреждённый output. |
| Reproducibility | Два build outputs различаются; проверьте недетерминированные inputs и версии. |
| Differential / public API | Изменилось поведение/публичные методы/запросы; найдите первое расхождение в log. Gate не следует обходить. |
| Timeout | Не завершилась установка или browser fixture; проверьте последний шаг и повторите после устранения причины. |
| Upload / нет artifact | Убедитесь, что все обязательные шаги прошли; failure не публикует JS. Проверьте retention policy/квоты. |

## Локальное воспроизведение

```sh
node --version # v22.23.2
npm ci --no-audit --no-fund
npx --no-install playwright install chromium
node _build/frontend-ci.mjs
```

На чистом Ubuntu без browser libraries используйте
`npx --no-install playwright install --with-deps chromium`, как в workflow.
Локальный report/artifact создаётся в `.local/github-frontend-build/` (gitignored).
Если рабочее дерево изменено, отчёт честно помечает local preview как DIRTY.
Не представляйте такой preview как сборку уже опубликованного commit.

### Проверка этой реализации, 2026-10-16

- `actionlint 1.7.12` — PASS; скачанный официальный бинарник проверен по release
  checksum. SHA checkout/setup-node/upload-artifact сверены с официальными тегами.
- `npm ci` — PASS, Node `22.23.2` / npm `10.9.8`, macOS x64. Для локального
  certificate store понадобился `NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem`;
  проверка TLS оставалась включённой. В workflow эта настройка не переносится.
- Frontend gate — PASS: syntax, 21 input SHA256, 2 output hashes/sizes,
  побайтная воспроизводимость JS/CSS/manifest, **19 scenarios / 76 assertions**,
  API contract и итоговые хеши. JS — 23 957 bytes, SHA приведён выше.
- Негативные проверки в временных копиях: сломанный JS, потерянный manifest input
  и недетерминированный output дают exit 1 и не создают artifact.
- Первый browser launch внутри локальной sandbox дал FAIL; повторный запуск
  вне sandbox прошёл. MODX/native/PHP/Fenom suites не запускались — SKIP.
- Настоящий запуск на GitHub-hosted Ubuntu и upload в Actions ещё не выполнены:
  для них сначала нужны разрешение на push и публикация ветки.
