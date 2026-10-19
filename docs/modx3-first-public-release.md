# CookieConsentManager — первый публичный выпуск MODX 3

Предыдущий `pl5` сохранён как исторический кандидат. Актуальный `pl6` со штатным uninstall: [отчёт](modx3-uninstall.md).


Рабочая ветка `codex/modx3-cookieconsentmanager` создана от актуального `origin/modx3` / `ef96e4f2e4d39ffebae5e63d2bbfbc9cfe48af32` после GO MODX 2 (`codex/modx2-cookieconsentmanager`, `3e03babf5c2fdb635306ea96784129f68d7ed162`). Ветки и независимые реализации не объединялись.

Кандидат **`cookieconsentmanager3-1.0.8-pl5`**. MODX **`>=3.1.2,<3.3.0`**, PHP **`>=8.1.0`**. Продукт предназначен для новых установок. Нет импорта старых пакетов `cookieconsent3`/`cookieconsent`, новых таблиц, общей платформенной обёртки или дополнительных aliases.

## Имена и архитектура

| Поверхность | Значение |
| --- | --- |
| Native package, transport signature и vehicle GUID prefix | `cookieconsentmanager3` |
| Приватный runtime / manifest / оригиналы адаптеров | `core/components/cookieconsentmanager3/` |
| Manager, connector, audit endpoint | `assets/components/cookieconsentmanager3/` |
| Категория новых элементов | `CookieConsentManager` |
| Namespace / lexicon / настройки | `cookie_consent`, `cookie_consent:default`, `cookie_consent.*` — сохранены, отличаются от известного чужого `cookieconsent` |
| Канонические элементы | `CookieConsent`, `CookieConsentAssets`, `CookieConsentBanner`, `CookieConsentMap`, `CookieConsentVideo`, `CookiesPopup` — сохранены |
| Browser API | `window.web86CookieConsent`, `onAllowed()`, `mountEmbeds()` — сохранены |
| Public adapters / JS / CSS | прежние `assets/js/cookie-consent/`, `assets/css/cookie-consent.min.css` |

Сохранены `MODX\Revolution\*`, `MODX\Revolution\Transport\modPackageBuilder`, namespaced processors и `xPDO\Transport\*` vehicles. Deprecated global aliases отключены **до установки** на всех стендах. Сохранены существующие MODX 3 post-parse registration, private audit queue, logger/CSV, Peast, административные rebuild/lock/atomic/fallback и отсутствие visitor build. Из адаптерного установщика убран только импорт исторического manifest; новые установки сохраняют собственную SHA256-историю для последующих обновлений внутри своего семейства.

Закрытый runtime allowlist и весь ZIP проверяются на отсутствие старых `components/cookieconsent/`, `components/cookieconsent3/`, `legacy_state`, fixtures, логов, секретов и prebuilt production JS. На чистых стендах контрольные файлы в известных чужих каталогах сохраняются; стороннее дополнение не устанавливается.

## Приёмка

Четыре независимые официальные установки: MODX 3.1.2 / 3.2.4 × PHP 8.1.34 / 8.2.34. Комплектные xPDO 3.1.5 / 3.1.7, MariaDB 11.8.9. Свои БД, volumes, каталоги и loopback-порты; источники CMS и Composer dependencies не патчатся.

Проверяются native Manager upload/scan/install, неизменный transport и version stamps, отсутствие aliases, независимые namespace/category/paths, Manager RU/EN, настройки/тексты/guide/preview, Strict/Legacy × три положения, аналитика/реклама/Custom JS, две карты/три видео/generic embed, onAllowed, reload/revoke, настоящие HTTP audit ACK с корреляцией физического JSONL, CSV и ACL. Reinstall сохраняет IDs, настройки, журнал и изменённый public adapter.

Дополнительно проверяются установленный adapter syntax failure → рабочий fallback → отсутствие сборки на visitor request → восстановление через Manager, PHP release gates на 8.1/8.2, preflight boundaries всех шести разрешённых версий и отказ ниже 3.1.2/начиная с 3.3.0, JS video/placeholder suites на PHP-generated bundle и синтаксис PHP/JS. Source-contract проверка сравнивает код с исходным `modx3`: visitor JS/CSS, Manager JS и ключевые native PHP-контракты сохранены; в сниппетах/renderer/builder меняются только предусмотренные идентификаторы и пути.

Первые попытки harness сохранены в ignored evidence: он ожидал `{}` вместо PHP JSON `[]` для пустого списка пакетов, затем не учитывал префикс `v` в Composer pretty version. Второе ожидание остановило проверку **после успешной native-установки**. После исправления выполнена проверка установленного exact ZIP и продолжена функциональная приёмка на тех же БД, без reset и без установки исторического предшественника. Первоначальные ошибки тестового кода не объявляются ошибками пакета и не скрываются.

В вспомогательном браузерном adapter-harness без locale наблюдался штатный warning MODX login об отсутствующем `HTTP_ACCEPT_LANGUAGE`; файлы login сверены с официальными дистрибутивами, сообщение классифицировано отдельно. Для последующих запусков вспомогательный контекст задаёт locale. Неожиданные ошибки компонента не скрываются.

Актуальные числа, SHA256, весь список групп и диагностика — в `docs/evidence/modx3-first-public-release.json`. Единственный выдаваемый ZIP — `.local/modx3-first-public/artifacts/release/cookieconsentmanager3-1.0.8-pl5.transport.zip`. Две независимые сборки должны совпасть побайтно.

## Область GO и сохранённые ограничения

Пользователь отдельно подтвердил **«GO для новой native-области»**. Поэтому историческая миграция, полноценный совместный тест другого дополнения, прогретый Fenom cache стороннего pdoTools3 3.1.0 и подтверждение реального внешнего video playback не являются blockers согласованного первого публичного выпуска.

Известное ограничение Fenom/pdoTools3 3.1.0 сохранено в исторических отчётах и не исправлялось этим переименованием. Поддержка этой конфигурации и полная Fenom-приёмка **не заявляются**. Браузерный стенд проверяет consent gating/инициирование SDK и iframe, перехватывая внешнюю сеть; доставку событий в реальные аналитические кабинеты и live playback не подтверждает. Эти ограничения не превращаются в PASS и не распространяются на проверенную native область.

Автоматические публикация в Modstore, GitHub Release, deployment, push и merge в `modx3` не выполняются.

## Итог

**GO для чистой установки и публикации в Modstore в подтверждённой пользователем native-области.**

| Проверка | Результат |
| --- | --- |
| Четыре чистые native установки, Manager/browser и адаптеры/fallback | 60 групп, 1 872 assertions, 0 FAIL |
| PHP 8.1/8.2 release gates | 38 suites, 8 572 assertions, 0 FAIL |
| Физические файлы, package identity, namespace, aliases, version stamps | 996 checks, PASS |
| Соответствие исходному modx3/native контрактам | 517 assertions, PASS |
| Совместимость/preflight boundaries | 4 autoloaders × 13 assertions, PASS |
| Синтаксис | 220 PHP-файлов на каждом PHP; 42 JS/MJS, PASS |
| Video/placeholder на PHP-generated JS | 42 + 32 сценария, PASS |
| Native transport | 248 vehicles / 231 runtime-файл / 490 ZIP entries, PASS |
| Неожиданные PHP/MODX/HTTP ошибки | 0; намеренный adapter parse failure и исходный login warning выделены отдельно |

SHA256: `652bd25dd5ea52266b39a5ef536be3014902012e7ee090f63d8eef483d259bb7`.
Размер: **573995 bytes**. Две native-сборки побайтово совпали.

Миграции со старого пакета нет. Публикация, deployment и merge основных веток не выполнялись.
