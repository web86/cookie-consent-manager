# Cookie Consent Manager 1.0.5-beta2 — transport для staging MODX 2

База: `9ab9052b47771f9d007e9425a156a509dcb29950`; текущая ветка `codex/modx2-adapter-cache-build`. Версия получена native builder из `_build/package.json` (1.0.5, beta, index 2), а не переименованием старого ZIP. Production release, push, merge и deployment не выполняются. Реальные YouTube/RUTUBE/VK ещё требуют staging-проверок воспроизведения.

## Сборка и состав

Четыре сборки существующим `modPackageBuilder` на двух независимых стендах (web и clean, MODX 2.8.8/PHP 8.2.34), включая повтор после финальной build policy. После штатной `_build/normalize.py` все четыре ZIP побайтно совпадают.

- Имя: `cookieconsent-1.0.5-beta2.transport.zip`.
- SHA256: `05a973c0e423e5192f95eadd9797576710de57cd8472471750a675d1ed221be7`.
- Размер: 552898 байт.
- Runtime-файлы: **242 → 231**. Записи ZIP (файлы, без каталогов): **512 → 490**. «До» — контрольная native-сборка указанного HEAD, уже содержащая BundleManager/Peast и 21 JS-исходник, а не старый выпущенный beta1 ZIP с 59 файлами.
- 248 native vehicles: 231 file, 15 object, 2 script. Среди объектов — namespace, menu, category, 6 штатных настроек и 6 канонических элементов: CookiesPopup, CookieConsent, CookieConsentAssets, CookieConsentBanner, CookieConsentMap, CookieConsentVideo. Plugin/Event создаёт существующий идемпотентный install hook.
- Включены PHP runtime, BundleManager/BundleInstall, Manager, processors, RU/EN lexicons/guide, prebuilt JS/CSS, manifest и все 21 исходник в исходном порядке manifest, включая три видеоадаптера. Peast: 156 runtime/license-файлов (autoload, PHP library, LICENSE), без developer README.

Builder использует закрытый `_build/transport-files.json` вместо рекурсивного копирования каталогов и сам отклоняет запрещённые test/mock/debug/docs и отладочные форматы. `_build/verify.php` требует точное совпадение с allowlist, хешами текущих источников и всеми сырыми файлами ZIP, связанными с native vehicles. Проверка `tests/transport/composition.py` дополнительно доказывает отклонение внедрённых test fixture, source map, неизвестного файла и повреждённого runtime-файла.

Файлы разработки, tests/fixtures/debug, CI, локальные артефакты, логи, временные файлы, source maps, developer docs и новые случайные файлы каталогов исходников не включаются. Фактически удалены из прежнего состава только 10 файлов `mock/` и `vendor/peast/README.md`; остальные группы уже отсутствовали. Ничего из этого не удалено из репозитория.

## Аудит mock

| Файлы в `assets/js/cookie-consent/mock/` | Кто обращается | Назначение | В beta2 ZIP |
|---|---|---|---|
| `yandex.js`, `mailru.js`, `google_ga4.js`, `google_ads.js`, `google_gtm.js`, `vk_ads.js`, `meta_pixel.js` | `service-runtime.js:25–26` через `service-loaders.js:36` | Подмена SDK только при явном `mode=mock` | Нет |
| `marketing.js` | Там же, loader `mock_marketing` переименовывается в `marketing` | Исторический тестовый pixel | Нет |
| `google_maps.html`, `yandex_maps.html` | `embeds.js:15–19`; локальные templates `tests/local/stand.html` и `tests/beta31/fixture.php` | Локальные фиктивные iframe-карты только в mock-режиме | Нет |

`server/modx2-banner-snippet.php:7` использует `mode=live` по умолчанию. В `consent-manager.js:14` только явное значение `mock` включает симуляцию; Strict/Legacy определяется отдельно следующей строкой. В live dispatcher идёт в настоящий adapter.start; live карты используют HTTPS provider URL, видео — свои HTTPS validators. Никакой live-адаптер не читает файлы каталога mock.

Manager Preview **не использует mock-файлы**: `assets/components/cookieconsent/manager.js:278–290` формирует инертный srcdoc с `sandbox` и CSP `default-src 'none'`; `server/processors/preview.class.php` возвращает CSS/данные. Слово site_mock — подпись макета. Внешний Gravatar основной оболочки MODX не относится к preview-frame и блокируется тестовым маршрутом.

**Оставлено из mock-именованных файлов:** только `assets/js/cookie-consent/services/mock-marketing.js`, вне каталога mock. Это один из 21 обязательных manifest inputs (`_build/frontend-manifest.json:19`); закрытый dispatcher безусловно создаёт его фабрику (`service-loaders.js:18`). Удаление одного этого файла ломает сборку/инициализацию. Его live start пустой и не обращается к mock/. Сохранение не меняет JS, порядок manifest или архитектуру.

Каталог mock остаётся в репозитории для локальных тестов/демо; production ZIP не поставляет ресурсы для `&mode=mock`. На чистой установленной beta2 каталога нет. Обновление не добавляет resolver для удаления прежних файлов сайта: старые mock-файлы от предыдущего transport могут остаться на диске, но новый ZIP их не содержит.

## Проверки

- Transport composition: 473 assertions PASS, включая 4 отрицательные проверки; native ZIP verifier PASS.
- Native clean/install/upgrade/reinstall/uninstall: 9 сценариев, 349 assertions PASS. Обновления с 1.0.4-beta5 и исходного 1.0.5-beta1 сохраняют пользовательские настройки (включая ttl_days=157, переводы, purpose/log_dir), IDs/категории/свойства элементов, ресурсы, шаблоны, ACL и audit data. Проверены хеши всех 231 runtime-файлов: clean 236 assertions, upgrade fixture 235 assertions.
- Чистая beta2 без mock: 3 сценария, 52 assertions PASS — live SDK, 2 карты, 3 видеоадаптера, Strict/Legacy, saved grants/refusals/revoke, onAllowed, dedup/mount, инертный Manager Preview и административная force-сборка. Внешние ответы контролируются тестом.
- PHP cache builder: 8.1.34/8.2.34/8.5.10, по 70 assertions PASS, Node/npm недоступны. Native cache builder/Manager RU/EN: 11 сценариев, 79 assertions PASS, включая новый URL/HTML-кеш и отсутствие рекурсии OnSiteRefresh.
- Source/transport build checks: 97 assertions PASS. JS semantics PASS. PHP/JS/Python syntax и git diff --check PASS.
- Основные регрессии: 20 наборов PASS, 0 failures.
- Differential: 49 сценариев, 253 assertions PASS.
- Native standard/Fenom × RU/EN × cold/warm, смешанные карты/видео, Preview и реальные audit ACK/JSONL: 10 сценариев, 244 assertions PASS. Это не проверка реального видеовоспроизведения.
- Сборки из web и clean после финальной проверки build policy совпадают с двумя первоначальными сборками; SHA256 всех четырёх ZIP одинаковый. Контрольные beta5/beta1 ZIP не менялись.


Timestamp, BundleManager и Consent Lifecycle побайтно сохранены относительно базы задачи; единственный runtime version change — сгенерированный CookieConsentVersion. JS/CSS prebuilt, 21 JS-исходник, Peast, manifest и RU/EN guide не менялись. Полный список payload и ZIP, machine-readable результаты и контрольные хеши сохранены рядом с артефактом/в evidence.
