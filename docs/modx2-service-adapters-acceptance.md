# MODX 2 service adapters — 1.0.4-beta5

Baseline: проверенная beta4, commit `de41eaa0f976c54c0d2836b605c7474ad874c472`.
Работа выполнена в новой `codex/modx2-service-adapters`. Исходный пользовательский
untracked inventory сохранён и дополнен текущей структурой. MODX 3 не изменялся.
Push, merge, release и production deployment не выполнялись.

## Структура и совместимость

```text
assets/js/cookie-consent/
  runtime.js
  script-url.js
  provider-registry.js
  service-runtime.js
  service-loaders.js
  services/
    yandex.js
    mailru.js
    vk-ads.js
    mailru-common.js
    google-ga4.js
    google-ads.js
    google-gtm.js
    google-common.js
    meta-pixel.js
    custom-js.js
    mock-marketing.js
  embeds.js
  consent-manager.js
  cookie-consent.min.js          # единственный production JS
  mock/                         # все 10 fixtures, без изменений
archive/standalone-i18n/
  README.md
  i18n.js                       # unchanged bytes beta4
  lexicons.json                 # unchanged bytes beta4
```

Девять адаптеров: Yandex, Mail.Ru, VK Ads, GA4, Google Ads, GTM, Meta Pixel,
Custom JS и исторический mock_marketing (live no-op). Google common хранит общие
Consent Mode/gtag/dataLayer/command ownership; Mail.Ru common — shared SDK/_tmr и
pending VK cleanup. service-runtime содержит один URL Promise cache, instance
set и общий allowed(), использующий переданный runtimeAllowed(category).

В service-loaders осталось создание закрытого фиксированного реестра, получение
validated instances из registry, порядок apply/start, token dedup, общий mock
routing, catching network errors и координация stop/revoke. SDK init/параметры/URL
находятся в сервисных файлах. Произвольных plugin loaders из JSON нет.
Карты остаются в прежнем embeds lifecycle.

PHP registry, JS registry, consent manager, embeds, URL validation и mock files
сверены с beta4 byte-for-byte. В native runtime изменились только bundle,
технические source hints Manager/Guide и generated version. Native objects,
default settings/texts, публичные пути и остальные PHP runtime hashes неизменны.
Нет изменений category_versions, повторного согласия из-за рефакторинга или
provider grants. Strict/Legacy, callbacks, queues, audit schema 3 и ACK/reload
проверяются тем же действующим harness.

Удалены корневые analytics.js и marketing.js: повторный rg не обнаружил
потребителей, builder/manifest/native inventory их не включают. i18n.js и
lexicons.json архивированы парой вне assets; три compatibility cases продолжают
исполняться. PHP локализация не менялась. Old transport ZIP, schemas, migrations,
API и acceptance reports сохранены. Никакого удаления исторических файлов на
клиентских сайтах в native installer не добавлено. Ручные script tags следует
проверять в шаблонах/chunks/CDN при переходе на штатные Assets/Banner.

## Сборка и transport

- Signature: `cookieconsent-1.0.4-beta5`.
- ZIP: `.local/artifacts/cookieconsent-1.0.4-beta5.transport.zip`.
- SHA256: `ce1043673c54662e28307e81e1e9fa4e9501948db7f4d245003d9a89ae53ddbc`.
- Bundle: 23 957 bytes; SHA256 `9301ab31d3f61edb88a551d918db9df61f8cc7e93a42b1d0584ff33451221887`.
- Baseline beta4 bundle: 22 745 bytes; SHA256 `e4b90c9982ad27d3c1dac9bf2c8fcf30b0a07aa970fb09be23c4b5e96c97ffb2`.
- Beta4 ZIP сохранён: `c81482abe94502b7e95d898f3bffa2a40b279595e1ec60669ed02bbd70869a4a`.
- Manifest: 21 inputs, 2 outputs; pinned esbuild 0.28.2, explicit source order,
  единая IIFE, ES2020. Runtime imports/chunks/дополнительных assets-запросов нет.
- Две независимые native modPackageBuilder сборки в новых container directories
  после штатной normalization дали одинаковые ZIP bytes. 57 runtime files,
  73 vehicles (14 object / 57 file / 2 script), 140 ZIP entries.
- Native public paths и content-hash cache busting сохранены.

## Проверки

Baseline до изменения frontend: differential 14 / 56; Legacy browser 24 / 176;
category matrix 30 / 330, PASS. После каждого отдельного адаптера выполнен focused
differential 14 / 56; также отдельно после shared runtime, Google common,
Mail.Ru common и окончательного dispatcher. Всего 13 промежуточных focused PASS,
каждый с собственным bundle hash и evidence.

Полное сравнение beta4 → beta5: **PASS, 49 сценариев / 206 assertions**.
SDK URL/init parameters, Google commands/site defaults, порядок синхронного
старта, количество script insertions, network-error warnings, exact persisted
consent, audit payload, map HTML/iframe attributes и публичный JS API совпадают.
Проверены все назначаемые категории, live/mock, Strict/Legacy, saved reject,
partial/expired/policy/stale/corrupt/archive/storage failure, hidden/disabled,
повторный apply/duplicate bundle, maps/dialog/focus и CSP. Pending revoke проверен
для Meta, shared Mail.Ru/VK, gtag, GTM, Yandex и HTTPS custom JS. Локальный custom JS
также включён во все category scenarios. Synthetic cookies здесь не выдаются за
фактическую доставку событий в кабинеты поставщиков.

**Итог: все 27 шагов полной приёмки PASS; 0 неустранённых FAIL.**
Отдельный финальный Manager/payload gate также PASS.

| Проверка | Результат | Объём |
| --- | --- | --- |
| Beta4 → beta5 differential | PASS | 49 сценариев / 206 assertions |
| Промежуточные focused этапы | PASS | 13 отдельных прогонов, каждый 14 / 56 |
| Strict/Legacy browser | PASS | 24 / 176 |
| Все адаптеры в каждой категории | PASS | 30 / 330 |
| Universal regression | PASS | Все 20 suites, без повторов |
| Accept/HTTPS Custom JS/Manager compatibility | PASS | 11 / 130 |
| Реальные публичные SDK, queues/cookies/reject | PASS | 10 / 177; telemetry локально |
| Native public registry upgrade | PASS | 6 / 59 |
| Документированные integrations + archived i18n | PASS | 5 / 22, включая все три standalone cases |
| Native Manager settings | PASS | 4 / 13 |
| Fenom RU/EN, split/legacy, cold/warm | PASS | 31 / 768 |
| Fenom Strict/Legacy × RU/EN × cache/parser | PASS | 24 / 480 |
| Native beta1/beta2/beta3/beta4 → точный beta5 ZIP | PASS | 4 перехода / 128; beta4 отдельно 32 |
| Native lifecycle точного ZIP, MODX 2.8.8 | PASS | Fresh/upgrade/reinstall/uninstall, 7 / 220 |
| PHP 8.1.34 native reinstall/runtime/ACK/reload | PASS | 1 / 68; все 57 hashes |
| PHP 8.2.34 final Manager/payload/Preview isolation | PASS | 1 / 65; все 57 hashes |
| PHP category/audit/visibility/URL contracts | PASS | По 3 268 assertions под PHP 8.1.34 и 8.2.34 |
| PHP regressions и syntax | PASS | 12 PHP suites, lint 106 PHP / 130 JS/MJS |
| Hashes/version/guide/inventory/reproducibility | PASS | 122 assertions, 21 inputs / 2 outputs, два одинаковых ZIP |
| Native ZIP verifier | PASS | 140 entries; 73 vehicles, 57 runtime files |
| Аккаунты поставщиков / опубликованные GTM tags | SKIP | Требуются принадлежащие владельцу test IDs/account access |
| Production/другие browsers/CDN/юридическая приёмка | SKIP | Ручные release gates |


Первичный расширенный differential получил **FAIL fixture**, до выполнения
продуктового сравнения: тест добавил builtin mock_marketing с purpose без name,
что отвергли оба immutable/candidate registry. Fixture приведена к минимальному
публичному контракту. Исходный FAIL сохранён отдельно; повтор — 49 / 206 PASS.
Ошибка не маскировалась через SKIP, production validation не ослаблялась.

Финальная проверка provenance дополнительно сверяет все baseline source/fixture
hashes через git show beta4 (49 assertions). В двух metadata-полях fixtures —
legacy-autoload/README.md и upgrade.mjs — обновлены унаследованные hashes beta3.
Bundle/native baseline были зафиксированы правильно до изменений; browser
результаты и сравнение не зависели от этих metadata-полей. Расширенный build gate
прошёл 122 assertions. Исходные native-build логи с прежними 73 также сохранены.

## Сопровождение и release gates

Для обновления Яндекс.Метрики изменяйте прежде всего services/yandex.js, затем
`npm run build:frontend`, focused differential, provider-parameters и Strict/Legacy
browser/matrix. Shared helpers меняйте только при общих требованиях SDK.
[Полная инструкция](modx2-service-adapters.md) содержит карту ownership, закрытый
контракт адаптера, неактивный пример будущего адаптера, команды тестов/сборки и native
transport verification. [Изменённые файлы](modx2-service-adapters-files.txt).

SKIP/manual: реальные кабинеты и опубликованные GTM tags (нет принадлежащих
владельцу тестовых account/container ID), production/customer hosting, CDN/OPcache,
Firefox/WebKit/Safari/mobile, блокировщики и юридическая приёмка Legacy. Перед
выкладкой нужны staging-проверка точного ZIP, backup/restore и отдельное разрешение.
Уже отправленные запросы и произвольный выполненный JS отзыв задним числом не
отменяет; это прежнее ограничение CMP.

Машиночитаемые результаты: [evidence](evidence/modx2-service-adapters.json).
Полные логи, intermediate hashes и два ZIP — ignored `.local/service-adapters/`.
Итоговый commit SHA приводится в финальном ответе; собственный SHA не встраивается
в коммитируемый документ. Историческая приёмка beta4 не переписывалась.
