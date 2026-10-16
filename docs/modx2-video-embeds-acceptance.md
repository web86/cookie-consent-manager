# MODX 2 — видео и встраивания, 1.0.5-beta1

Дата: 16.10.2026. Ветка: `codex/modx2-video-embeds`. Runtime/native implementation commit: `af69133b199c313167e0d1fc0ae3e502447fa191`. Исходный GitHub HEAD beta5: `d8bb0661b6ad13b51e4c5e2b1799918f9ef53ffa`; перед работой выполнены fetch/fast-forward, проверено чистое дерево. После него созданы baseline и восемь тематических этапов. Последующий отчётный commit не меняет runtime/artifact. Push, merge, release, deployment и MODX 3 не выполнялись.

**NO-GO release/production; staging candidate only.** Самостоятельный transport собран и проверен; реальные видео требуют отдельной staging-приёмки. [Полные результаты и список файлов](evidence/modx2-video-embeds-results.json), [ZIP inventory](evidence/modx2-video-embeds-zip-inventory.json), [подключение и параметры](modx2-video-embeds.md), [воспроизведение тестов](../tests/video-embeds/README.md).

## Артефакт и SHA256

Файл: `.local/artifacts/cookieconsent-1.0.5-beta1.transport.zip`. Две независимые сборки настоящим modPackageBuilder в новых каталогах совпали побайтно после штатной нормализации. Третья финальная сборка после регрессий также побайтно совпала с проверенным transport. 59 runtime-файлов; 146 ZIP entries; шесть canonical элементов, включая новый CookieConsentVideo. Старые настройки/метаданные/журналы не включены в ZIP.

| Объект | SHA256 |
| --- | --- |
| Native ZIP 1.0.5-beta1 | `ae7e3e57ab6038a67d23a16a8f5d64db0d29bfca504007272d6ab5e29d3cb2cd` |
| Production JS, 29435 bytes | `49fbf428d0fd61b456f5d322647a224f5076bf103d097db2a20f64c6cda5b897` |
| CSS, 4129 bytes | `9de4060edd4b0f23a5909b0260d681421710b55577543c3d25258dcb219b7912` |
| Неизменённый beta5 ZIP | `ce1043673c54662e28307e81e1e9fa4e9501948db7f4d245003d9a89ae53ddbc` |

## Архитектура и differential beta5 → beta1

- `embeds.js` отвечает за discovery, service instance/category gate, placeholder/settings/modal, import template, idempotence, apply/revoke и display options. DOM-состояние хранится в WeakMap; один делегированный click handler, без MutationObserver и без второго consent store. Удалённые узлы собираются GC; массовая проверка включает 1000 узлов и WeakRef/CDP GC.
- `embeds/youtube.js`, `rutube.js`, `vk-video.js` содержат только URL-контракты сгенерированных iframe. Они входят в явный frontend builder и общий production bundle. Видео не добавлены в SDK dispatcher.
- Серверный `CookieConsentVideoUrl` нормализует и проверяет автоматические URL; `CookieConsentEmbedOptions` проверяет/экранирует атрибуты. Native CookieConsentVideo выдаёт inert template. Generic template импортируется без разбора/переписывания HTML; его безопасность обеспечивает разработчик.
- Новые типы выключены по умолчанию, рекомендуют external_content и допускают все три необязательные категории и дополнительные ключи. На upgrade сохранённый JSON сервисов не переписывается; новые типы доступны в Manager catalog. Добавление отключённых типов сохраняет старые fingerprints и согласия.
- Категории `categories_v2`, TTL/policy/category versions, `runtimeAllowed`, `onAllowed/stillAllowed`, schema 3/ACK и все SDK adapters сохранены. В consent-manager добавлена только строка публичного `mountEmbeds`; SDK/runtime/storage/audit источники не менялись. Кнопка на заглушке открывает назначенную категорию и не создаёт map_allow/embed_allow.
- Без новых параметров Map выдаёт точный beta5 HTML, использует прежнюю URL allowlist и сохраняет прежние focus/modal/iframe defaults. Native objects прежних элементов, кроме расширенного Map, не изменены; новый Video использует те же canonical validators и backup policy.
- JS вырос с 23957 до 29435 bytes; CSS — с 3286 до 4129 bytes. В native payload добавлены только два общих PHP-класса; полный delta приведён в machine report. Один production JS bundle сохранён.

Differential: 49 сценариев / 253 assertions / 0 FAIL. Сравнение сохраняет исходные 49 сценариев beta5, проверяет новый метод и исключает из точного API-сравнения только добавленное имя mountEmbeds. Consent, audit, requests, map DOM, focus, SDK queues, CSP и ошибки сравниваются без нормализации.

## Поддерживаемые URL

| Тип | Форматы |
| --- | --- |
| YouTube | HTTPS watch, youtu.be, shorts, live, embed; ID 11 символов. Выход — www.youtube-nocookie.com/embed/ID. start/end/autoplay/controls/loop/playsinline; loop связывается с playlist того же ID. |
| RUTUBE | rutube.ru/video/ID/, video/private/ID/?p=KEY, play/embed/ID/; hex ID 32 символа. Ключ p сохраняется при добавлении t; допускаются документированные skinColor/getPlayOptions. Не обещаются query autoplay/controls/mute. |
| VK Видео | Только официальный video_ext.php на vk.com/vkvideo.ru с oid/id; hash сохраняется при наличии, не вычисляется. Обычная video-страница выдаёт локализованную подсказку использовать Share/embed или trusted template. Live-контракт и воспроизведение остаются gate. |

Неизвестные схемы/origins/paths, userinfo/ports/fragments, неверные ID, лишние/дублированные query и XSS-входы отклоняются PHP. PHP/JS contracts проверяются отдельно. Подробная таблица опций и первичные источники — в [справочнике](modx2-video-embeds.md). Документация VK в этой среде недоступна; расширять поддержку без проверки официального URL/реального плеера нельзя.

## Результаты PASS / FAIL / SKIP

| Проверка | Результат |
| --- | --- |
| Registry/defaults/historical fingerprints | PASS, 51 assertions |
| PHP URL + snippets / JS contract | PASS, 31 + 34 + 15 assertions; PHP 8.1.34 и 8.2.34 — по 31 + 34 |
| Video/template browser matrix | 42 сценариев / 646 assertions / 0 FAIL |
| 20 universal suites | PASS, 20 suites, 0 FAIL |
| Native lifecycle | 8 сценариев / 294 assertions / 0 FAIL |
| Установленные snippets / Manager RU/EN / standard + Fenom cold/warm / реальные ACK и JSONL | 10 сценариев / 244 assertions / 0 FAIL |
| Финальные установленные runtime hashes / Manager help и Preview isolation | PASS, 67 assertions |
| Самостоятельный native build / hashes / reproducibility | PASS, 168 assertions |
| Existing full acceptance runner | 27 PASS / 0 FAIL; детали ниже |
| Реальное видео | 0 PASS / 3 SKIP |

Полный runner: reset-disposable=PASS; native=PASS; install-web=PASS; legacy-browser=PASS; legacy-matrix=PASS; beta1042=PASS; universal=PASS; public-registry-upgrade=PASS; examples=PASS; fenom-sync=PASS; fenom-browser=PASS; fenom-modes=PASS; beta-upgrades=PASS; direct-vendors=PASS; manager=PASS; refresh-php81=PASS; php81-native=PASS; php81-categories=PASS; php81-audit=PASS; php81-visibility=PASS; php81-urls=PASS; php82-categories=PASS; php82-audit=PASS; php82-visibility=PASS; php82-urls=PASS; php-and-syntax=PASS; native-verifier=PASS.

Native: fresh без категории; fresh с пользовательской категорией; reinstall без дубликатов; beta32 upgrade; сохранение IDs/category/properties/metadata; uninstall с сохранением DB/data; split/legacy; отдельный свежий beta5 без Video → создание Video с сохранением всех прежних settings/logs/metadata. Upgrade matrix дополнительно сохраняет реальный visitor choice с beta1/beta2/beta3/beta4/beta5. PHP 8.1 native reinstall и PHP 8.1/8.2 existing contracts включены в полный runner.

До изменений baseline прошёл 49 differential сценариев и все 20 universal suites. В отдельном неизменённом direct-vendors baseline был FAIL из-за дополнительного Google `/a` request в одной из пар direct/CMP. Этот исходный результат сохранён в `tests/video-embeds/baseline-results.json`; assertions не ослаблялись. Итог real-SDK gate: PASS (10 случаев, 177 assertions). Повторный полный gate прошёл без изменения assertions; первоначальная нестабильность внешнего SDK сохраняется в истории проверок.

Новый video fixture первоначально использовал неверный путь modParser и основной стенд без pdoTools. Финальный gate перенесён в существующий помеченный Fenom clone с установкой того же ZIP через native PM. В этом старом clone отсутствовали штатные PM processors: они восстановлены побайтно из того же MODX 2.8.8 (SHA256 проверены), подготовлены только fixture component/cache/package/log paths и локальный audit origin. pdoTools/vendor sources не патчились; проверки не ослаблялись. Исходная fixture-попытка сохранена отдельно.

Первый общий PHP прогон остановил два исторических теста с жёстким ожиданием 9 defaults. Контракт обновлён до 12 с точным списком ключей и отдельными assertions disabled/category новых типов; pixel collision test проверяет сохранение всех входных строк. После этого повторены все 12 PHP suites, 112 PHP lint и 142 JS checks: 0 FAIL. Исходная попытка сохранена отдельно в machine report; проверки безопасности/аудита не ослаблялись.

## Реальное воспроизведение и ограничения

- youtube: **SKIP** — Playback unavailable in this environment; iframe HTTP success alone is not playback proof.
- rutube: **SKIP** — Playback unavailable in this environment; iframe HTTP success alone is not playback proof. Плеер RUTUBE явно запретил просмотр на тестовом сайте.
- vk_video: **SKIP** — No verified official VK Share/embed URL supplied; hash is never fabricated.

HTTP 200 iframe не считается воспроизведением; PASS требует движения currentTime при playing. Synthetic fixtures проверяют CMP, а не доступность/настройки ролика или доставку данных в рекламные кабинеты. VK требует реальный официальный URL из Share/embed; hash не выдумывается. Политики владельца видео, браузерный autoplay, ограничения домена/Referer, geo/network/CSP и клиентский hosting остаются staging gates. Firefox/WebKit и production/CDN в этой задаче не проверялись.

Внешняя обложка принимается как inert конфигурация и не скачивается: placeholder скрывается при активации iframe. Same-origin poster может отображаться до выбора; локальный URL должен не перенаправлять на сторонний домен. Generic trusted HTML не санитизируется. CMP удаляет созданные им клоны в пределах обёртки; внешний SDK state и DOM за её пределами контролирует разработчик и штатная перезагрузка.

## Ручной план staging-приёмки

1. Установить точный ZIP на резервную копию MODX 2.8.8: fresh install и upgrade с beta5. Проверить шесть canonical элементов, ID/metadata прежних пяти, пользовательские настройки, переводы, журналы и отсутствие дубликатов. Новые типы добавить из Manager catalog при upgrade.
2. В RU и EN включить YouTube/RUTUBE/VK по очереди в каждой из трёх необязательных категорий; затем включить все одновременно с Google/Yandex Maps. Проверить дополнительный экземпляр `youtube_2`, выключенный экземпляр, скрытую категорию и неизвестный ключ.
3. Подключить каждый сервис через CookieConsentVideo, собственный template и onAllowed/stillAllowed. Проверить обычные страницы, modal и AJAX; повторить mountEmbeds(root) и mountEmbeds() несколько раз.
4. В чистом профиле Strict открыть DevTools Network до навигации: до выбора отсутствуют внешние iframe/SDK/poster запросы. Нейтральная и локальная обложка видны; внешняя обложка инертна. Кнопка заглушки открывает назначенную категорию и сама не сохраняет разрешение.
5. Сохранить частичный выбор, перезагрузить, отозвать и перезагрузить. Повторить с сохранённым отказом, истёкшим TTL, новой policy и принудительным запросом согласия. Проверить границы категорий и штатное обновление аудита.
6. В Legacy проверить подтверждённый первый визит без выбора: разрешённые режимом видимые сервисы стартуют без фиктивной consent-записи. Сохранённый отказ/частичный выбор/истечение имеют приоритет. Проверить общий reject/reload.
7. Использовать собственные разрешённые к embed видео: YouTube public/unlisted, RUTUBE public и private `p` с `start`, VK официальный Share/embed URL с hash и без hash, если сервис сам его выдал. Подтвердить настоящее движение currentTime/воспроизведение. Проверить autoplay/controls/start и остальные заявленные параметры отдельно; ограничения браузера и владельца видео не считать ошибкой CMP.
8. Проверить iframe title, fullscreen on/off, размеры/ratio, loading/referrer policy карт; старый вызов карты остаётся совместимым. Проверить клавиатуру Enter/Space/Tab/Escape и восстановление modal/focus. Проверить desktop/mobile размеры и Firefox/WebKit на реальном хостинге.
9. Под текущим CSP разрешить нужные frame-src origins, убедиться в отсутствии ошибок CSP и pre-consent запросов. Проверить небезопасные URL/host/path/port/userinfo/query и HTML/XSS попытки в сниппете: iframe не создаётся. Доверенный template тестировать как HTML разработчика; CMP его не валидирует.
10. Для checkbox+Save/reject проверить HTTP 200 ACK с исходным event_id и ровно одну JSONL-запись на событие, schema 3 без provider grants и без map_allow/embed_allow. Повторить после cold/warm MODX/Fenom кэша и на фактической конфигурации CDN/hosting.

До закрытия live playback и оставшихся внешних gates кандидат не объявляется готовым к production/release. Push, merge, release и deployment в этой задаче не выполняются.


## Новые и изменённые файлы

- MOD `_build/build.php`
- MOD `_build/changelog.md`
- MOD `_build/frontend-manifest.json`
- MOD `_build/frontend.mjs`
- MOD `_build/package-readme.md`
- MOD `_build/package.json`
- MOD `_build/preflight.php`
- MOD `_build/user-guide-manifest.json`
- MOD `_build/user-guide.json`
- MOD `_build/validators/canonical-elements.php`
- MOD `_build/verify-install.php`
- MOD `_build/verify.php`
- MOD `assets/components/cookieconsent/manager.js`
- MOD `assets/css/cookie-consent.css`
- MOD `assets/css/cookie-consent.min.css`
- MOD `assets/js/cookie-consent/consent-manager.js`
- MOD `assets/js/cookie-consent/cookie-consent.min.js`
- MOD `assets/js/cookie-consent/embeds.js`
- NEW `assets/js/cookie-consent/embeds/rutube.js`
- NEW `assets/js/cookie-consent/embeds/vk-video.js`
- NEW `assets/js/cookie-consent/embeds/youtube.js`
- MOD `assets/js/cookie-consent/provider-registry.js`
- NEW `docs/evidence/modx2-video-embeds-results.json`
- NEW `docs/evidence/modx2-video-embeds-zip-inventory.json`
- NEW `docs/modx2-video-embeds-acceptance.md`
- NEW `docs/modx2-video-embeds.md`
- MOD `README.md`
- MOD `server/bin/restore-elements.php`
- MOD `server/lexicon/en/default.inc.php`
- MOD `server/lexicon/ru/default.inc.php`
- MOD `server/modx2-map-snippet.php`
- NEW `server/modx2-video-snippet.php`
- MOD `server/src/CookieConsentBannerRenderer.php`
- NEW `server/src/CookieConsentEmbedOptions.php`
- MOD `server/src/CookieConsentGuide.php`
- MOD `server/src/CookieConsentServiceRegistry.php`
- MOD `server/src/CookieConsentVersion.php`
- NEW `server/src/CookieConsentVideoUrl.php`
- MOD `tests/beta102/control.php`
- MOD `tests/beta31/php.php`
- MOD `tests/beta32/native-fixture.php`
- MOD `tests/beta33/native.mjs`
- MOD `tests/frontend-refactor/manager.mjs`
- MOD `tests/legacy-autoload/upgrade.mjs`
- MOD `tests/php.php`
- NEW `tests/video-embeds/baseline-results.json`
- NEW `tests/video-embeds/baseline.json`
- NEW `tests/video-embeds/browser.mjs`
- NEW `tests/video-embeds/build.mjs`
- NEW `tests/video-embeds/contracts.mjs`
- NEW `tests/video-embeds/control.php`
- NEW `tests/video-embeds/differential.mjs`
- NEW `tests/video-embeds/native-browser.mjs`
- NEW `tests/video-embeds/native.mjs`
- NEW `tests/video-embeds/README.md`
- NEW `tests/video-embeds/real-playback.mjs`
- NEW `tests/video-embeds/registry.mjs`
- NEW `tests/video-embeds/snippets.php`
- NEW `tests/video-embeds/urls.php`
