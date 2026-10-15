# MODX 2 1.0.4-beta2 — приёмка 2026-10-15

Ветка `codex/modx2-universal-services`, база `d26823123e88fddabe90d6438dbed697510f2231` (проверенная 1.0.4-beta1). `main` и MODX 3 не менялись. Push, merge, release и production deployment не выполнялись. Старый [отчёт beta1](modx2-universal-services-acceptance.md) сохранён как исторический.

## Вывод по заявленной ошибке

**Ошибка «Принять не запускает аналитику» на 1.0.4-beta1 не воспроизвелась.** До изменений на исходном beta1 выполнено 8 сценариев / 98 assertions / 0 FAIL: нажатие `accept` сразу вызвало запрос SDK Метрики и `ym(testId, 'init', …)`, сохранило `categories_v2`, действительные версии категорий и запись `accept` schema 3 через настоящий JSONL receiver. Аналогичный сценарий `accept-all` тоже прошёл.

В исходном `consent-manager.js` оба обработчика передавали одинаковые аргументы в `commit()`. Эта функция уже ограничивала разрешения видимостью категорий, сохраняла состояние и вызывала `applyConsent()`. Конкретного дефекта этой цепочки в beta1 не установлено; приписывать ей причину клиентского симптома оснований нет.

В клиентской диагностике фигурировали модель `categories_v1` и asset hash `2adee12c7b5928c9a093`. Он совпадает с первыми 20 символами SHA256 bundle в `main` и историческом артефакте 1.0.2: `2adee12c7b5928c9a093dea198d9449a3831a4ea614e43dab9d200e276c297af`. У beta1 другой хеш — `71d18eb5b2b37e01c6d8`. Затем владелец подтвердил, что **1.0.4 на сайте ещё не устанавливалась**. Это объясняет несовпадение версий; данные с сайта не являлись проверкой beta1.

В том же клиентском состоянии категория analytics была видима и разрешена, а скрипт Метрики присутствовал. Поэтому сам исходный симптом на старой установленной версии не доказан как отсутствие загрузки. Его точная причина и доставка данных в кабинет остаются непроверенными. Production-сайт не запрашивался и не изменялся; адрес сайта, реальные ID и consent ID в отчёт не включены.

## Что изменено

- `accept` и `accept-all` используют одну ветку выдачи разрешений на видимые категории. Различается только историческое имя события аудита: `accept` / `accept_all`. Новых provider grants нет.
- Manager показывает активную runtime-версию под заголовком. Его JS/CSS получают content hash, чтобы обновление не оставляло прежний интерфейс в обычном asset cache.
- После текста о видимости размещена кнопка i в кружке. Подсказка с полным текстом ответственности доступна мышью и с клавиатуры. Скрытая категория с включёнными сервисами получает объяснение, почему они не запускаются.
- `custom_js` принимает локальный путь и полный HTTPS-адрес `.js`, включая допустимый query. PHP, Manager и frontend проверяют один контракт; канонические повторы host/default port отклоняются. Валидация не загружает URL на сервере, Save/Preview не исполняют интеграцию. Ошибка адреса сообщает о JavaScript, а не об ID счётчика.
- Поле переименовано в «Название сервиса» / `Service name` в добавлении и настройках сервисов. Возможность перевода сохраняется.
- Руководство явно описывает только `service.enabled === true && consent.categories[service.category] === true`. Consent Mode и GTM consent checks отдельно ограничивают обработку данных. HTTPS не меняет категорийное согласие; изменение адреса, назначения или категории обновляет соответствующие версии.

Карты, disabled-сервисы, скрытые категории, исторический аудит, миграция и перезагрузка после отзыва сохраняют категорийный контракт. Пакет не включает категории автоматически.

## Результаты проверок

**PASS:** 23 browser/HTTP/Manager/native suites, 303 сценария, 2268 assertions, 0 FAIL. Baseline beta1 (8/98) показан отдельно и не добавлен к итоговому счётчику.

| Suite | Статус | Сценарии | Assertions |
| --- | --- | ---: | ---: |
| Universal Manager/frontend | PASS | 21 | 173 |
| Audit Moscow RU/EN | PASS | 2 | 14 |
| All adapter/category combinations | PASS | 30 | 300 |
| Frontend persistence and categories | PASS | 33 | 185 |
| HTTP audit compatibility/security | PASS | 37 | 121 |
| Live adapters with local SDK fulfillment | PASS | 11 | 51 |
| Provider parameter guards | PASS | 4 | 18 |
| Manager i18n | PASS | 17 | 60 |
| Pixel queues/revocation/legacy migration | PASS | 32 | 175 |
| Pixel Manager | PASS | 4 | 48 |
| Callback API | PASS | 13 | 44 |
| Consent-aware custom map wrappers | PASS | 9 | 42 |
| Optional ClientID wrapper | PASS | 4 | 13 |
| Manager category visibility | PASS | 4 | 73 |
| Category visibility/SSR/epochs | PASS | 23 | 201 |
| SSR/split/legacy/assets | PASS | 9 | 80 |
| Locale fallback | PASS | 4 | 112 |
| Audit Viewer/CSV/history | PASS | 11 | 77 |
| Manager UX/native audit integration | PASS | 15 | 113 |
| Manager permissions | PASS | 1 | 4 |
| Focused accept / final installed beta2 | PASS | 11 | 129 |
| Native beta1 to final beta2 consent preservation | PASS | 1 | 15 |
| Native fresh/upgrade/reinstall/uninstall | PASS | 7 | 220 |

PHP 8.2: **16 suites / 4024 assertions / 0 FAIL**. PHP 8.1: **13 suites / 802 assertions / 0 FAIL**. Syntax: **106 PHP / 109 JS/MJS**, PASS. Generated guide/version, source-to-package hashes и `git diff --check`: PASS.

Первый общий прогон выявил две проблемы самого тестового запуска: слишком широкий селектор посчитал tooltip как поле категории; Manager UX пересёкся со сбросом используемой им disposable базы. Селектор ограничен реальными `select/input`, затронутые suites повторены последовательно после native установки. В итоговых числах учитывается один успешный результат каждой suite.

Среда: MODX Revolution 2.8.8-pl, PHP 8.2.34 / 8.1.34, Playwright Chromium. Все внешние SDK/iframe-запросы получали локальные ответы либо блокировались. Проверены реальные попытки загрузки и аргументы `init`; реальная отправка поставщику не заявляется. Перед каждым focused browser-сценарием сравнивались байты установленного bundle с текущим исходным артефактом.

[Санитизированное машинное свидетельство](evidence/modx2-1.0.4-beta2.json). [Полный список изменённых файлов относительно beta1](modx2-1.0.4-beta2-files.txt). Подробные локальные результаты и снимок Manager находятся в игнорируемой `.local/beta1042-evidence/`. Commit SHA сообщается вместе с результатом работы; самоссылочный SHA здесь не хранится.

## Native transport

- Файл: `.local/artifacts/cookieconsent-1.0.4-beta2.transport.zip`, **198016 байт**.
- SHA256: `b434196505b56ae3bdd470a6b23e4228dcd6b60827aceba5d61dfcb24a1507b4`.
- Native verifier: PASS, **73 vehicles / 57 runtime files / 140 ZIP entries**.
- Frontend SHA256: `6ba0dff5be883d3de431a30c363981c786a8082dfe17901bbb2dd41e0d9953e3`, URL suffix `?v=6ba0dff5be883d3de431`.
- Beta1 не перезаписана: SHA256 `d762bf4a412d51e8fe45d2c9deb0978f0ab596718a17240cf044597d5a5c811e`, 191889 байт.

Проверены native fresh, upgrade beta32 → beta2, reinstall, uninstall/reinstall и отдельно beta1 → beta2 с существующим согласием. При последнем неизменённые настройки, данные и журналы сохраняются; consent JSON, ID, время и версии остаются побайтно прежними, ненужного нового запроса согласия нет. Реальный Package Manager устанавливает новый bundle с другим hash URL.

## Ручная проверка на сайте

1. Сделайте резервную копию базы, файлов и журналов. Сначала установите beta2 через Package Manager на тестовой копии. После установки под заголовком Manager должна отображаться `1.0.4-beta2`.
2. В «Сервисах» включите Метрику с нужным ID, назначьте `analytics`, включите видимость этой категории. В «Основных» оставьте «Отклонить» и «Принять», сохраните. Скрытая категория должна остаться скрытой; при включённых сервисах Manager объясняет блокировку.
3. Очистите обычный MODX/HTML/CDN cache и обновите страницу. В Network проверьте `cookie-consent.min.js?v=6ba0dff5be883d3de431`. Установка пакета без обновления отданного HTML ещё не подтверждает, что браузер использует новый код.
4. В новом профиле до выбора не должно быть запроса `mc.yandex.ru/metrika/tag.js`. Нажмите «Принять»: ожидаются запрос SDK, вызов `init` и новое согласие `categories_v2` с `categories.analytics === true` и актуальной `category_versions.analytics`. В новом объекте нет `providers`/`disclosed`. Скрытые категории остаются false.
5. Проверьте `web86CookieConsent.getConsent()` и сохранённый `web86_cookie_consent`, затем reload: разрешение действует и SDK загружается один раз на страницу. В журнале найдите `accept` schema 3 с теми же разрешёнными категориями. В «Настройках cookie» отзовите analytics: после reload SDK не запрашивается.
6. Повторите с «Настроить» / «Принять все». Выключите Метрику: она не должна запускаться даже после принятия analytics. Проверьте скрытую analytics и Метрику, перенесённую в marketing. Одно разрешение группы запускает всех её включённых участников.
7. Создайте custom JS с HTTPS-адресом, проверьте подпись «Название сервиса», сохранение и отсутствие исполнения в Manager Preview. На сайте он запускается только после разрешения своей категории. Изменение URL требует нового согласия затронутой категории.

Быстрая проверка состояния в консоли после выбора:

```js
({
  scripts: [...document.scripts].map(s => s.src).filter(s => s.includes('cookie-consent.min.js')),
  analyticsVisible: document.querySelector('#cookie-block')?.dataset.ccCategoryAnalytics,
  consent: window.web86CookieConsent?.getConsent(),
  yandexScriptPresent: !!document.querySelector('script[src*="mc.yandex.ru/metrika/tag.js"]')
})
```

Присутствие тега подтверждает попытку подключения. Для клиентской диагностики отдельно проверяются ответ SDK в Network, выполнение `init`, последующие запросы и кабинет; один этот флаг не подтверждает всю цепочку.

## PASS / FAIL / SKIP

Итоговые локальные проверки — PASS; незакрытых FAIL нет. **SKIP:** установка на клиентском сайте, реальные SDK/доставка в кабинеты, пользовательские теги опубликованного GTM-контейнера, Safari/Firefox и фактические клиентские шаблоны/CSP. Они не проверялись этой локальной матрицей. Откат и production-публикация не выполнялись.

Команды воспроизведения и ограничения fixtures: [tests/beta1042/README.md](../tests/beta1042/README.md), [tests/universal/README.md](../tests/universal/README.md).
