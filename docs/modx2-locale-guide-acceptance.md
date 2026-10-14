# Приёмка 1.0.2: locale JSON и руководство onAllowed

14 октября 2026, Europe/Istanbul. Ветка: `feature/modx2-commercial-polish-performance`.
Перед правками рабочее дерево было чистым; fetch проверил отсутствие входящих изменений.
База: `44b36c7`. Коммиты: `0706282` (frontend), `dd46995` (RU/EN guide).
**GO только для review.** Новый transport — неопубликованный кандидат 1.0.2.

**506 проверок / 4170 assertions / 0 итоговых FAIL.**
[Полный PASS/FAIL/NOT RUN, имена сценариев и список изменённых файлов](evidence/modx2-locale-guide-results.json).
Реальная среда: MODX Revolution 2.8.8-pl, PHP 8.2.34, Apache/MariaDB,
Chromium, Playwright 1.62.1, esbuild 0.28.2. Все установки — локальные одноразовые,
включая core внутри и вне webroot; никаких production-действий.

## Изменения

В bundle входят runtime.js/provider-registry.js/consent-manager.js. Два последних
используют только web86Runtime.message(); потребителей config/locale в production
нет. runtime.js теперь читает PHP data-cc-message и экспортирует только message.
CookieConsentAssets и compatibility registry source больше не выводят locale JSON;
Assets не требует BannerRenderer для формирования технических данных.

До:

```html
<script type="application/json" id="cc-service-registry">…</script>
<script type="application/json" id="cc-public-config">{"locale":"ru"}</script>
<link rel="stylesheet" href="…cookie-consent.min.css?v=…">
<script src="…cookie-consent.min.js?v=…" defer></script>
```

После:

```html
<script type="application/json" id="cc-service-registry">…тот же JSON…</script>
<link rel="stylesheet" href="…cookie-consent.min.css?v=…">
<script src="…cookie-consent.min.js?v=…" defer></script>
```

Удалено 78 байт на RU/EN страницу. JS: 20201 → 20095 байт (−106); CSS 3286 байт,
хеш прежний. Сохранены defer, content-hash cache busting и single-call split/legacy
контракт. Нет дополнительных запросов/плагинов/обработчиков MODX/инфраструктуры.

Основные файлы реализации: runtime.js, два PHP snippet source, min.js и frontend
manifest, package.json (новая подпись), user-guide.json и три generated outputs.
Mock demo перегенерирован PHP; соответствующие тесты обновлены. Manager JS/CSS,
ServiceRegistry/Texts/BannerRenderer, consent-manager/provider-registry и audit
receiver/logger не менялись. Полный file list — в JSON отчёте.

PHP cultureKey, пользовательские тексты, RU/EN/TR, fallback и локализованные error/map
nodes сохранены. Старые data-cc-text/data-cc-html не перезаписываются JavaScript.

## Руководство и совместимость

В едином _build/user-guide.json добавлен раздел 5 после подключения шаблона:
«Подключение собственных JavaScript-сервисов» / “Integrating custom JavaScript services”.
Три примера: guarded import собственного модуля, { service: 'yandex' } и unsubscribe.
Описаны категории analytics/marketing/external_content, category vs instance grant,
включённый настроенный instance key, fingerprint, stillAllowed после async и перед
SDK/network, восстановленное согласие, отмена ожидающих действий и невозможность
отменить уже отправленные запросы задним числом. Код владельца — в его чанках/JS,
API не создаёт сервисы Manager и не вводит free-form script editor.

RU/EN имеют одинаковые paragraph/code block types. Package Readme, PHP guide и
manifest сгенерированы штатным процессом; consistency check PASS. Native Manager
и Package Manager показывают все примеры буквально, без исполнения. Escape,
кнопка закрытия, scrolling, inert background, focus return и draft сохранены.

Исторический i18n.js/lexicons.json не удалены и не изменены; они не входят в bundle
или transport public assets. Отдельно PASS для его ready/t: RU/EN через same-origin
lexicons и html lang, пользовательский TR через owner-supplied legacy strings.
Для standalone нужны собственные файлы/конфигурация владельца; это не стандартная
MODX интеграция. Не смешивайте исторический translation stack с текущим bundle.
Доступ к cc-public-config/web86Runtime.config сознательно убран из standard contract;
зависимые пользовательские скрипты должны иметь свою locale-конфигурацию/html lang.
[Подробности совместимости](modx2-locale-guide.md).

## Проверки

| Набор | Статус | Проверки | Assertions |
| --- | --- | ---: | ---: |
| `browser-results` | PASS | 281 | 1423 |
| `categories-results` | PASS | 23 | 200 |
| `managerCategories-results` | PASS | 4 | 73 |
| `callbacks-results` | PASS | 13 | 44 |
| `maps-results` | PASS | 9 | 42 |
| `clientIdExample-results` | PASS | 4 | 13 |
| `localization-results` | PASS | 4 | 112 |
| `publicJson-results` | PASS | 3 | 84 |
| `liveGuard-results` | PASS | 11 | 51 |
| `providerParameters-results` | PASS | 4 | 18 |
| `pixels-results` | PASS | 32 | 175 |
| `gtm-results` | PASS | 9 | 126 |
| `frontend-results` | PASS | 9 | 77 |
| `viewer-results` | PASS | 11 | 77 |
| `http-results` | PASS | 37 | 121 |
| `native-results` | PASS | 8 | 224 |
| `provider-config` | PASS | 16 | 287 |
| `ui` | PASS | 7 | 227 |
| `package` | PASS | 1 | 20 |
| `settings` | PASS | 1 | 24 |
| `projection` | PASS | 1 | 85 |
| `examples` | PASS | 5 | 22 |
| `settings-validation` | PASS | 1 | 26 |
| `categories-php` | PASS | 1 | 198 |
| `viewer-php` | PASS | 1 | 62 |
| `config-php` | PASS | 1 | 53 |
| `reinstall` | PASS | 1 | 63 |
| `syntax` | PASS | 1 | 188 |
| `zip` | PASS | 1 | 0 |
| `reviewed-candidate-upgrade` | PASS | 6 | 55 |

PASS: действительное согласие из неизменяемого reviewed 1.0.1 ZIP сохранено до
native upgrade на 1.0.2 в том же browser context. После reload raw storage,
consent_id, policy/category versions, разрешения и fingerprints v2 побайтно прежние;
баннер не появился. Технический JSON реестра и PHP HTML баннера совпали до/после;
cc-public-config отсутствует. Разрешённые девять mock SDK/iframe fixtures продолжили
работу. Настройки, private audit configuration и хеши существующих журналов совпали.
Scoped onAllowed и пользовательский ClientID-пример работают.

PASS: реальное выполнение примера A при нуле зарегистрированных сервисов,
отсутствие import до согласия, восстановление после reload; отзыв во время ожидающего
import предотвращает initMap после завершения загрузки. Existing callback suite
покрывает scoped grants, guard, unsubscribe, ошибки и изменённый/отключённый provider.

PASS: 256 provider combinations, RU/EN/custom-language SSR без JS cold/warm,
переводы/HTML/буквальные MODX/Fenom delimiters, mock/live guards, maps allow/revoke,
Manager settings/preview, metadata/data retention, native fresh/reinstall/uninstall,
1.0.0 native upgrade и отдельный reviewed 1.0.1 upgrade. Audit POST/ACK/event_id/JSONL,
schema 1/2, Origin/replay/rate limiting, Viewer/details/CSV и view-only права — PASS.
Safe owner GTM-WJD8XJD6 v4 проверен вживую; прочие SDK/network контролировались.

Первое сравнение HTML показало **FAIL**: старый запрос захватил EN из ещё не
перепроверенного PHP context cache, после upgrade получен RU. Исправлен fixture:
ожидание revalidation 2.3s и явная проверка RU до baseline. Затем точное сравнение
при одинаковом контексте прошло. Product locale/consent code не требовал исправления.
При сборе доказательств обнаружено совпадение имён файлов matrix/upgrade результатов;
upgrade повторён в отдельной папке, в итоговом отчёте оба набора присутствуют независимо.

**NOT RUN:** production/client hosting/CDN и нагрузка; nginx/proxy/LiteSpeed/IIS в этом
прогоне; PHP 8.1/прочие версии, Firefox/WebKit/старые браузеры и screen readers;
реальная доставка Meta/VK/прочих аккаунтов, реальные client map API/backend/tiles;
новый полный late filesystem/DB fault injection и архивная beta migration матрица;
произвольные скрипты клиентов/полные исторические standalone CMP stacks.
Причина: границы локального patch-прогона. Неизвестные сценарии не объявлены PASS;
native lifecycle не обещает атомарного rollback, backup/restore остаётся необходимым.

## Артефакт и обновление

Immutable review ZIP: `.local/review/locale-guide/cookieconsent-1.0.2.transport.zip`.
180188 байт, 71 native vehicle (14 object/55 file/2 script), 136 ZIP entries.
Две независимые сборки побайтно совпали; состав, hashes, отсутствие secrets/Setup
Options/ledger/plugins/stock copies проверены. Новый ZIP имеет отдельную подпись
и output path; 1.0.1 не пересобирался и не перезаписывался.

SHA256:
`dc01bd4c6d5b5e96888a6c6707a92d134daadea7fe506ea741152783153cc506`.

1. Backup DB, element source/runtime, audit configuration и всех журналов.
2. Проверьте SHA256; загрузите 1.0.2 через MODX Package Manager → Install/Upgrade
   на локальном/staging сайте. Setup Options отсутствуют.
3. Очистите обычный кэш MODX и HTML/CDN cache. Не удаляйте журнал при ручной очистке
   всего core/cache/. Новый JS автоматически имеет новый content-hash URL.
4. Миграция настроек/согласий не требуется. Сохраните один Assets в head + один Banner
   перед body close либо один legacy CookieConsent, не смешивая способы.
5. Зависимые от прежнего locale JSON скрипты адаптируйте отдельно; собственные modules
   не должны запускать SDK на import. Проверьте guard/revoke и реальные события на staging.

SHA256 protected 1.0.1: `cb239c590c9e1f4df42409e98c642b9b927e82934520748310830e4c9f24b3d4`.
Protected 1.0.0: `0ed4563a2e92cf5e40ba1c269dc0d39bd0acdb6b3fb12a86f734983ce2f4b04b`.
Хеши подтверждены. main/v1.0.0 и опубликованная история не менялись;
GitHub Release/tag/default branch/deployment не выполнялись.

Рекомендация: **GO для review**; произвольные пользовательские интеграции требуют
самостоятельной проверки. Это patch-кандидат, а не публикация стабильного релиза.
