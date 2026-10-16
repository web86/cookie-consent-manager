# MODX 3: паритет с Cookie Consent Manager 1.0.6

Дата: **16 октября 2026**. Ветка: **`codex/modx3-sync-1.0.6`**.

**Перенос функциональности выполнен, native ZIP подготовлен. Полный staging/release gate — NO-GO:** сохраняется подтверждённая ошибка прогретого compiled Fenom cache в официальном pdoTools3 3.1.0; реальное воспроизведение видео не подтверждено. Production deployment, push, merge и GitHub Release не выполнялись.

## Исходники, версия и Git

| Платформа | Начальный / итоговый runtime commit |
| --- | --- |
| MODX 2, эталон 1.0.6 | `db0a7229715bcde08eef71894e08dd6526704954` → тот же SHA |
| MODX 3, фактический baseline | `1fd687249fa474c2ce3ba21ddc64b0344d3f1b6a`, 0.1.0-beta3 |
| MODX 3, итоговый перенос | **`89cca7540d3bc53384bf763064090fa77df1d29a`**, 0.1.0-beta4 |

Ветка создана от актуальной `modx3`, не от MODX 2. Поскольку target уже содержал beta3, выбран **`cookieconsent3-0.1.0-beta4`**. `main`, `modx3`, MODX 2 и два прежних worktree не переключались и не коммитились. История без merge/cherry-pick MODX 2. Из прежней незамёрженной MODX 3 parity-ветки переиспользованы готовые платформенные адаптации тестов; её runtime и история не переносились.

Следующий commit сохраняет только отчёт, доказательства и уточнения developer docs/test orchestration; runtime ZIP от этого не меняется. Точный финальный feature HEAD фиксируется после commit в `.local/modx3/evidence/final-receipt.json` и в итоговом сообщении. Проверка: `git rev-parse codex/modx3-sync-1.0.6`. Рабочие деревья должны быть чистыми; receipt содержит фактическую проверку.

## Differential-аудит и перенос

[Аудит до реализации](modx3-1.0.6-differential-audit.md), [машинные результаты](evidence/modx3-1.0.6-results.json), [команды воспроизведения](../tests/modx3-sync/README.md).

| Область | Уже существовало в MODX 3 | Перенесено из 1.0.6 |
| --- | --- | --- |
| Платформа | Namespaced MODX/xPDO, aliases OFF, native Manager routing/cultureKey | Сохранено; общий PHP адаптирован только на границах native API |
| Consent / registry | TTL, policy/category versions, SDK/callback API, старые provider grants | categories_v2, свободные категории, instances, custom JS, версии эффективного состава; консервативная миграция полных/частичных старых согласий |
| Карты | Native CookieConsentMap, инертные iframe | Оба провайдера, ключи дополнительных instances, URL allowlists, размеры/постеры/атрибуты, локализованные заглушки |
| Видео / template | Отсутствовали | CookieConsentVideo, YouTube/RUTUBE/VK, проверка официальных URL, generic template, повторный mountEmbeds, revoke и modal/category focus |
| JavaScript | Старый frontend с SDK и картами | Те же **21 исходник в том же порядке**, service adapters, существующий embeds.js, один production bundle; новый store/observer/iframe manager не добавлялся |
| Bundle | Prebuilt esbuild | Bundled Peast 1.17.6, Manager cache clear / force rebuild, lock, атомарная публикация, rollback, previous/prebuilt fallback, сохранённый timestamp |
| Тексты | RU/EN lexicons, overrides и renderer | Общий текст + Google Maps + Яндекс Карты; пустой override использует общий; одна редактируемая кнопка «Настройки cookie» / «Cookie settings», {provider}, legacy aliases |
| Manager / guide | ACL, Save/Preview, встроенная инструкция | Единый редактор сервисов/категорий, тексты, версия/status/rebuild, короткий canonical RU/EN JSON → PHP/readme; Map/Video/template/poster examples |
| Аудит | ACK/JSONL, schema1/2, origin/replay/rate guards, ACL/CSV, trusted visibility | Schema3 без индивидуальных grants, чтение истории, Moscow display при исходном UTC в JSONL/details/CSV |
| Transport | Настоящий native modPackageBuilder, namespace/vehicles/resolvers/preserved map | Сохранён builder; шестой canonical element Video, cache hook и закрытый runtime allowlist |

PHP/JS/CSS, registry/text/URL/display контракты сверены с **неизменяемым `db0a722`**. Отдельный PHP differential исполняет обе платформенные реализации в отдельных процессах и сравнивает renderer/snippet/public registry/text JSON для RU/EN × Strict/Legacy × трёх категорий × stock/custom overrides: **24/24 PASS**.

## Намеренные различия платформ

- Независимая family/version **cookieconsent3 0.1.0-beta4**, PHP **>=8.1**, MODX **>=3.2.4,<3.3.0**. Сохранены namespace `cookie_consent` и существующие runtime/data paths.
- Используются `MODX\Revolution` / `xPDO\Transport`, native controllers/processors, стандартные vehicles/validators и native preserved map. MODX 2 builder/installer не подменяют MODX 3 builder.
- Язык Manager берётся из native `cultureKey` текущей авторизованной сессии. В тестах используется штатная смена языка, а не замена её системным MODX 2 setting.
- Сохранена собственная MODX 3 регистрация startup JSON после resource parsing, чтобы структурные скобки JSON не исполнялись Fenom.
- Native uninstall удаляет принадлежащий hook плагин/событие `CookieConsentCacheBuild`, чтобы не оставлять callback на удалённый runtime; reinstall восстанавливает ровно один hook. Пользовательские настройки/элементы/аудит сохраняются.
- Руководство дополнено коротким Map-примером и правильным указанием: **для Map дополнительный instance выбирается через `provider=ключ`**, для Video — через `service`. Для generic template перечислены три `data-cc-*` display attributes. Старые вызовы не изменены.
- Generic template остаётся доверенным HTML разработчика, как в 1.0.6. Автоматический строгий URL-контракт применяется к snippet-generated video/map; новая политика переписывания произвольного HTML не вводилась.
- `width` сниппета сохраняет проверенный контракт ширины в пикселях. Адаптивный iframe с `width="100%"` задаётся HTML/CSS/template; новое процентное значение параметра сниппета не добавлялось.
- Новые stock adapters доступны выключенными; сохранённый registry не переписывается для принудительного добавления строк. Тексты/JSON overrides на upgrade сохраняются. Исходная миграция 1.0.6 удаляет только уже упразднённый legacy `clientId`, если он присутствует; новой миграции данных нет.

## Фактические проверки

Среда: официальный **MODX 3.2.4-pl**, PHP **8.1.34 / 8.2.34**, xPDO **3.1.7**, MariaDB **11.8.9**, Apache, Chromium/Playwright. Deprecated global aliases выключены. Только новые отмеченные disposable fixtures проекта `cookie-consent-modx3-sync106`, отдельные БД/volume/порты **20888–20895**. PHP8.2 использует OPcache revalidation=0, как PHP8.1; при проверке второго порта audit origin временно меняется и восстанавливается.

### Baseline до переноса

| Набор | Сценарии / assertions | Результат |
| --- | ---: | --- |
| Исходный browser suite | 281 / 1423 | 0 FAIL |
| Существующий regression, 15 suites | 187 / 1243 | 0 FAIL |
| PHP 8.1/8.2, 22 suites | 22 / 7528 | 0 FAIL |
| Native Standard/Fenom/visibility/security | 26 / 446 | **22 PASS, 4 FAIL warm Fenom** |

Итого browser+regression baseline: **468 сценариев / 2666 assertions / 0 FAIL**. Ориентир 497/4095 относится к прежней beta2 acceptance и не выдан за новый прогон. Результаты здесь относятся к фактической beta3 и явно перечисленным suites. Начальная ошибка имени Compose-проекта в Viewer harness исправлена; Viewer и зависящий Guide suite повторены последовательно с неизменёнными assertions. Первые логи сохранены отдельно.

### После переноса

| Набор | Сценарии / assertions | Результат |
| --- | ---: | --- |
| Browser/Manager/SDK, 26 suites | **368 / 2942** | **0 FAIL в финальных прогонах** |
| PHP 8.1/8.2, 32 suites | 32 / **8066** | 0 FAIL |
| BundleManager под www-data, PHP8.1/8.2, PATH пуст | 2 / **140** | 0 FAIL |
| Локальный Peast / PHP8.5.10, PATH пуст | 1 / 70 | PASS; это не native CMS8.5 acceptance |
| Пинованные source parity checks | 1 / **88** | 0 FAIL |
| MODX 2 1.0.6 ↔ MODX 3 PHP differential | **24 / 24** | 0 FAIL |
| Video/template matrix, каждый esbuild и PHP bundle | по **42 / 646** | 0 FAIL |
| Text/poster/dimensions + 6 documented examples, каждый bundle | по **32 / 779** | 0 FAIL |
| Historical pre-video esbuild → PHP differential | **49 / 253** | 0 FAIL |
| Текущий esbuild ↔ PHP, одинаковые 21 исходник | 49 / 253 | 0 FAIL |
| Native Standard/Fenom/visibility/security после переноса | **26 / 462** | **22 PASS, 4 FAIL warm Fenom** |
| Установленные embeds, PHP8.1 | **16 / 270** | **12 PASS, 4 FAIL warm Fenom** |
| Установленные embeds, PHP8.2 | **16 / 270** | **12 PASS, 4 FAIL warm Fenom** |
| Точный финальный ZIP: genuine beta3/beta2 upgrade, reinstall, fresh | **3 / 1967** | 0 FAIL |
| Точный финальный ZIP: uninstall/reinstall/data/hook | **1 / 26** | 0 FAIL |
| Финальное установленное руководство RU/EN, desktop/mobile | **4 / 24** | 0 FAIL |
| Composition/negative ZIP checks | **473 assertions** | 0 FAIL |

Syntax: 166 checks без ошибок; все добавленные/изменённые затем обвязки дополнительно проверены через `node --check` / PHP lint / Python AST / bash -n. Guide/version manifests и `git diff --check` проходят.

Количество сценариев старого и нового browser suite не складывается: 256 масок индивидуальных provider grants в старой модели заменены проверенным source 1.0.6 category-only контрактом (8 масок сохранённых категорий), отдельно проверены 30 adapters/categories в Strict и 30 в Legacy. Это изменение модели из эталона; assertions прочего работающего функционала не ослаблялись. Исторические baseline результаты сохранены.

Web acceptance включает HTTP ACK/error/replay, категории/TTL/policy, callbacks/live guards, оба вида карт, Google signals/GTM/pixels, дополнительные instances, custom JS, localization, Manager keyboard/UX, read-only roles/CSV/ACL, тексты/preview/upgrade и Legacy. Native cache suite: **11 сценариев / 79 assertions / 0 FAIL** — неизменённый skip/inode, edit+cache clear, ошибка JS/записи, previous bundle, public denial, RU/EN draft preservation, force, resource HTML invalidation и точные bytes по новому timestamp URL. На один штатный cache clear приходится один `OnSiteRefresh`; force его не вызывает.

Проверка frontend asset selector удаляет исходники/manifest/cache file и запрещает файловые, freshness/hash/time/SQL операции в методе выбора JS. URL берётся только из сохранённого `cookie_consent.bundle_version`; prebuilt fallback использует фиксированную версию. CSS-версионирование прежнего сниппета сохранено, к JS-исходникам frontend не обращается.

PHP URL/snippet tests: карты **32**, видео **31**, native snippets **49 assertions** на каждой из PHP8.1/8.2; все PASS. Strict не запрашивает provider iframe до категории, Legacy сохраняет свою политику, category settings не выдаёт согласие, повторный mount не дублирует iframe/requests, отзыв удаляет frames. Same-origin poster допускается; внешний poster не запрашивается ни до, ни после разрешения. Проверены 16:9, 9:16, фиксированные iframe и адаптивные варианты.

### Первый real-SDK FAIL не скрыт

Первый дополнительный direct/CMP Google GA4 тест зафиксировал отсутствие `/a` у CMP при наличии этого bootstrap request в direct. Assertions не фильтровались и `/a` не исключался. Первый FAIL сохранён в машинном отчёте и `.local/modx3/evidence/direct-vendors-first-failure.json`.

Повтор с теми же runtime bytes и всеми исходными assertions выполнил **все 10 независимых cases / 177 assertions / 0 FAIL, 0 SKIP**: GA4/Ads/GTM с independent consent absent/denied/granted и Yandex. Первый FAIL остаётся свидетельством нестабильности проверки с реальным SDK; причина (SDK, timing или окружение) не установлена и требует staging follow-up; он не переименован в PASS. Изменение harness только позволяет продолжить следующие независимые cases после FAIL. Все telemetry requests локально перехватываются; публичный SDK скачан по TLS и исполняется без изменения bytes. Реальные кампании/доставка событий не заявляются.

## Native transport, установка и воспроизводимость

**Финальный ZIP:**

`/Users/sonoma/Desktop/cookie-consent-manager/.local/modx3/artifacts/sync-1.0.6-beta4/cookieconsent3-0.1.0-beta4.transport.zip`

**SHA256:**

`18eae9c7b331e213d637d872e8a1c4668c301b6fc1be6e309ef9f14a6001b69d`

Рядом находятся `.transport.zip.sha256`, `.inventory.json`, `.zip-inventory.json`. Независимые сборки сохранены в worktree `.local/modx3/artifacts/sync106-final-a/` и `sync106-final-b/`. Каждая создана существующим **native MODX 3 modPackageBuilder** в отдельном `compose run` PHP-процессе. Нормализованы только ZIP metadata; архивы и source inventories побайтово совпадают. Проверены native classes, vehicles, canonical policies, source/file SHA и полный ZIP closure.

Состав: **231 runtime-файл** (включая **156** Peast runtime/license файлов), **248 native vehicles**: 15 object, 231 file, 2 script; **490 ZIP entries**. Шесть canonical elements, одна native category, шесть продуктовых settings vehicles, существующий namespace. `bundle_version` создаётся успешной административной сборкой, а не transport default.

Allowlist `_build/transport-files.json` включает prebuilt и все 21 editable source, manifest, реальные Manager/PHP endpoints/processors/controllers, cache hook и Peast. Сохранён обязательный `services/mock-marketing.js`. Нет `mock/` SDK/maps, fixtures/tests, developer docs, sourcemaps/debug, CI/local files, логов, tmp, generated cached bundle, locks/error metadata и owner HTTP rules. Негативные ZIP tests отклоняют добавленные fixtures/maps/неучтённые files и изменённые runtime bytes. На настоящей чистой установке `mock/` отсутствует. При upgrade старые файлы прежнего пакета могут остаться; произвольная зачистка старого/owner runtime не выполнялась.

Перед окончательной упаковкой уточнён только generated Guide и changelog/readme metadata. Автоматический final differential подтверждает: **все canonical executable sources и 230 runtime-файлов идентичны ранее проверенному native candidate; отличается только `CookieConsentGuide.php`**. Предыдущие ZIP не перезаписаны и разные bytes не устанавливались под одной signature в прежнюю fixture. Точный финальный архив заново прошёл настоящие beta2→beta4 и beta3→beta4, clean install, reinstall, uninstall/reinstall и RU/EN Guide acceptance **на новых installations**. Хеши всех 231 файлов и шести DB sources совпали с финальным ZIP/current source.

Проверены сохранение IDs/metadata/property relations/static owner file, точных настроек/JSON переводов, audit key/config и JSONL. Полное старое согласие сохраняет категории/consent ID и архив исходного JSON; частичное не авторизует утраченную категорию, не включает SDK и сохраняет незатронутую категорию. Кеш строится install hook, статус ready; работа после native cache clear и принудительной сборки проверена отдельно тем же executable runtime.

## Оставшиеся release gates

1. **Fenom warm cache — реальный FAIL.** Повторяется до и после переноса на официальном pdoTools3 3.1.0, PHP8.1/8.2. Независимые процессы исполняют только `Hello {$name}`: cold PASS, warm `Undefined variable $fenom` / `Fenom\Render::__construct(... null ...)`. Cookie Consent snippets/JSON/audit не исполняются. Dependency не патчилась. Нужна исправленная поддерживаемая зависимость и повтор full cold/warm acceptance; Standard/cold results не отменяют gate.
2. **Live playback — 3 SKIP.** YouTube iframe HTTP200/плеер получен, продвижение video time не подтверждено. RUTUBE HTTP200, сообщение «Просмотр видео запрещен на этом сайте». VK: дополнительно проверен именно embed URL из задания с исходным hash; получен HTTP200, продвижение video time не подтверждено. Все три live попытки остаются SKIP. Synthetic iframe и HTTP200 не доказывают playback; hash не выдумывался.
3. **Реальные SDK:** latest повтор 10/0 проходит; сохранить и расследовать transient `/a` расхождение на staging с принадлежащими владельцу test IDs. Не обещать стабильность внешнего SDK/тегов по одной локальной попытке.
4. Перед публикацией — ручная staging-приёмка на фактическом сайте, его CSP/сервисах и поддерживаемой PHP версии. Native runtime проверен на 8.1/8.2; отдельный PHP8.5 helper run не является сертификацией MODX на 8.5. PHP8.3/8.4 на этом стенде не запускались.

Пакет предназначен для staging-тестирования. Независимые исходные ветки сохранены; push, merge в `modx3`/`main`, Release и deployment не выполнялись.
