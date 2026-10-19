> Исторический отчёт commit 0444cda. Решение NO-GO и требования миграции/проверки стороннего transport отменены новым заданием первого публичного выпуска. Актуальная приёмка: [modx2-first-public-release.md](modx2-first-public-release.md). Эти старые результаты не относятся к новому ZIP после упрощения установщика.

# CookieConsentManager: переименование пакета MODX 2

Кандидат: `cookieconsentmanager-1.0.8-pl4`, ветка `codex/modx2-cookieconsentmanager`, база `main` / `1824a664e43f380722b0c49be9918acc407a32b7`. MODX `>=2.8.4,<3.0.0`, PHP `>=8.1.0`. Итоговые результаты и SHA256 — в `docs/evidence/modx2-package-rename.json`. Это не опубликованный релиз.

## Итог автоматической проверки

Финальный transport: **560,039 bytes**, SHA256:

```text
60111f6cb08e665d5577007eacdf11db986b80247caec6846114ffe5848d79d5
```

| Контур | Фактический результат |
| --- | --- |
| Native/Manager/browser: MODX 2.8.4 и 2.8.8 × PHP 8.1.34 и 8.2.34 | **72 сценария, 2 004 assertions, 0 FAIL** |
| PHP-семантика, валидаторы, audit, адаптеры, сборщик | **36 suites, 2 358 assertions, 0 FAIL** |
| Дополнительная сверка установленных файлов/канонических элементов/категорий | **1 080 checks, PASS** |
| Воспроизводимость native ZIP | **2 одинаковые сборки**, 248 native vehicles, 231 runtime-файл, 490 ZIP entries |
| Диагностика восьми финальных стендов | **0 неклассифицированных PHP/MODX/HTTP ошибок**; JS page errors отсутствуют |
| Регрессии JS | Выполнены semantics, source-build, video/placeholder esbuild и PHP variants, differential и PHP differential; посетительский JS побайтово совпадает с базой main |
| Официальный Modstore transport чужого cookieconsent + ClientConfig | **NOT RUN** — выполнялся source/native-object conflict fixture |

На PHP 8.2 сохранены предупреждения динамических свойств оригинального MODX/xPDO; исходные Smarty/RSS warnings учитываются отдельно. Наблюдавшийся `xpdocachemanager::writeTree` / `mkdir(): File exists` воспроизведён на неизменённом оригинальном xPDO для всех четырёх сочетаний без загрузки компонента, доказательство включено в отчёт. Отказ preflight при занятом чужом имени и сообщение об ошибке сборки при намеренно сломанном адаптере являются ожидаемыми негативными сценариями и не скрываются.

**NO-GO для загрузки в Modstore** до проверки официального чужого transport с ClientConfig и приёмки ограничения миграции старого package record. **GO для изолированной review/staging-проверки данного ZIP**. Финальный артефакт находится в `.local/package-rename/artifacts/release-rc/`; более ранние сборки с таким же именем в остальных внутренних каталогах не являются выдаваемым ZIP.

## Аудит конфликта

[Modstore cookieconsent](https://modstore.pro/packages/other/cookieconsent) ссылается на [QupeDev/cookieconsent](https://github.com/QupeDev/cookieconsent), проверен commit `2fb353a5ebf7974f38be080f5fbcb8baef3ccef8` (18 октября 2026). Его builder, settings resolver и данные элементов используют:

- пакет/namespace `cookieconsent`, каталоги `core/components/cookieconsent/` и `assets/components/cookieconsent/`;
- категорию `cookieconsent`, чанк `cookieconsentMarkup`, плагин `InjectCookieMarkup`;
- настройки `cookieconsent.enabled`, `cookieconsent.css_path`, `cookieconsent.js_path`, `cookieconsent.loader_js_path`.

Категории `cookieconsent` и `CookieConsent` конфликтуют при регистронезависимой collation MODX. Поэтому новые элементы группируются в `CookieConsentManager`. Категории существующих элементов сохраняются вместе с их пользовательскими метаданными; старые категории не удаляются. Namespace `cookie_consent` отличается от чужого `cookieconsent`, менять его не требуется: он также является API настроек и переводов. Действующие имена наших пяти сниппетов и чанка не совпадают с элементами проверенного чужого проекта.

## Изменённые и сохранённые имена

| Объект | Результат |
| --- | --- |
| Native package / signature | `cookieconsentmanager` / `cookieconsentmanager-1.0.8-pl4` |
| Публичное название | `CookieConsentManager`; существующая подпись меню, включая пользовательскую, сохраняется |
| Приватный код, процессоры, контроллеры, лексиконы, manifest, оригиналы адаптеров | `core/components/cookieconsentmanager/` |
| Manager JS/CSS, connector, audit endpoint | `assets/components/cookieconsentmanager/` |
| Новый audit URL | `/assets/components/cookieconsentmanager/audit.php` с учётом `assets_url` сайта |
| Native vehicle GUID prefix | `cookieconsentmanager/`; уникальные ключи элементов остаются прежними |
| Категория для новых элементов | `CookieConsentManager` |
| Namespace / лексикон / настройки | `cookie_consent`, `cookie_consent:default`, `cookie_consent.*` сохранены |
| Канонические элементы | `CookieConsent`, `CookieConsentAssets`, `CookieConsentBanner`, `CookieConsentMap`, `CookieConsentVideo`, `CookiesPopup` сохранены |
| Cache plugin / событие | `CookieConsentCacheBuild` / `OnSiteRefresh`, обновляются по прежнему имени без дублей |
| JS-адаптеры, общая JS-сборка, CSS | `assets/components/cookieconsentmanager/js/cookie-consent/`, `assets/components/cookieconsentmanager/css/cookie-consent.min.css` сохранены |
| Browser API / хранилище | `window.web86CookieConsent`, `onAllowed()`, `mountEmbeds()`, ключи consent/cookie/localStorage сохранены |
| Audit JSONL / private config / rate-limit key | Существующие настройки, путь, формат и register queue `cookieconsent-audit-private` сохранены |
| SHA256 state | `adapter-checksums.json` переносится в новый приватный каталог после валидации прежнего состояния; ключи путей и вся история версий сохранены |

Посетительские JS-исходники, CSS, логика Strict/Legacy, сервисов, видео, карт, consent TTL и policy не изменены. На посетительском запросе нет сборки/синхронизации адаптеров. Сборка выполняется существующим PHP/Peast механизмом только при установке, явной команде Manager и административной очистке кеша. Ошибка парсинга оставляет последнюю рабочую сборку и прежний timestamp.

## Переход с cookieconsent-1.0.8-pl3

**Это новая установка по классификации native Package Manager, а не обычное обновление семейства `cookieconsent`.** Старый package record остаётся установленным. Установщик не вызывает uninstall, не удаляет записи пакетов и не чистит старые каталоги.

1. Сначала повторите переход на копии сайта. Сохраните БД, исходный transport и его native `preserved.php`, оба старых каталога components, `assets/components/cookieconsentmanager/js/cookie-consent/`, настройки `cookie_consent.*`, приватные audit-конфигурацию и JSONL. Native `preserved.php` заменяется при reinstall и не является постоянным бэкапом.
2. Проверьте, что namespace `cookie_consent` указывает на старый каталог именно этого продукта, manifest существует и цел, присутствует SHA256-история. При повреждённом manifest/state восстановите их из бэкапа: установщик не должен угадывать происхождение данных. Само наличие пакета с именем `cookieconsent` не доказывает, что это наш продукт.
3. Через Package Manager загрузите **новый** transport, выполните поиск локальных пакетов и установите `cookieconsentmanager-1.0.8-pl4`. Не удаляйте старый пакет перед установкой. Установка предупреждает о замене кода пяти сниппетов/чанка, сохраняя IDs и метаданные; пользовательскую логику в этих исходниках предварительно вынесите в собственные элементы.
4. Preflight проверяет пути и конфликты до native file vehicles. В новый каталог доставляются закрытый allowlist runtime-файлов и приватные оригиналы адаптеров. Под блокировкой существующего административного сборщика читается и валидируется старая SHA256-история. Public adapters остаются на прежних путях: изменённые/удалённые файлы сохраняются, обновляются только совпадающие с известным оригиналом. Неизвестный файл не считается оригиналом. Новая версия добавляется к истории; старая история остаётся и в старом каталоге.
5. После проверки файлов/элементов и административной сборки переключаются только пути namespace на `components/cookieconsentmanager/`. Шаблоны и вызовы сниппетов менять не требуется. Вручную прописанные старые connector/audit URL и пути к CLI следует заменить в своих интеграциях. Старые wrappers остаются на диске для ранее закешированных страниц; новые страницы получают новый URL.
6. Очистите кеш через Manager. Проверьте RU/EN, настройки/переводы, обе политики, имеющийся browser consent, ACK/JSONL/CSV и редактирование/пересборку адаптеров. После частичной установки не считайте сообщение об ошибке rollback: проверьте native журнал, исправьте причину и повторите новый transport либо восстановите полный бэкап.

**После перехода не выполняйте uninstall/reinstall/update старого пакета `cookieconsent` и не запускайте его старый CLI-installer.** Его прежние native file vehicles владеют общими `assets/components/cookieconsentmanager/js/cookie-consent/*`, а uninstall hook удаляет `CookieConsentCacheBuild` по имени. MODX не ведёт общего ownership/reference count для этих двух семейств. Новый пакет не может безопасно переписать уже установленный чужой или старый transport. Поэтому полностью автоматическая смена семейства с безопасным последующим uninstall старого пакета не заявляется. Старые package records намеренно не маскируются; их ручное редактирование/удаление и перепривязка provider требуют отдельной проверки и не входят в этот кандидат.

Не устанавливайте старое дополнение нашего проекта и чужой Modstore `cookieconsent` в один namespace/package record до миграции. При последующей установке чужого дополнения provider будет использовать старое имя `cookieconsent`: оставшаяся запись нашего старого пакета создаёт неоднозначность истории/обновлений. Для такой существующей установки нужен отдельный ручной план работы с Package Manager; одновременная независимая установка **нового** пакета рядом с чужими путями/объектами проверяется отдельно на чистой БД. Не удаляйте каталоги `components/cookieconsent` целиком — в них могут находиться чужие и пользовательские файлы.

Пользовательский audit config остаётся на своём настроенном пути. Если он размещён в старом component-каталоге, перенести его можно отдельно через существующий UI конфигурации; пакет не копирует неизвестные приватные файлы и не делает предположений об их владельце. Месячные JSONL и существующие согласия не перемещаются и не переписываются.

## Проверки и границы приёмки

Результаты экспортируются из новых изолированных стендов для MODX 2.8.4/2.8.8 × PHP 8.1/8.2. Каждый имеет отдельную БД/сеть, loopback port и маркер владения. Проверяются native Manager upload/scan/install, переход pl3 → новое семейство, reinstall, RU/EN, настройки, translations, Strict/Legacy × три положения, аналитика/реклама/Custom JS, видео/карты, onAllowed, реальные HTTP audit ACK с физическим JSONL, CSV и ACL. Отдельные clean fixtures проверяют чужие файлы/объекты/категорию, отказ при занятом имени сниппета, fallback после ошибки адаптера и отсутствие сборки на visitor request. Test-only successor `cookieconsentmanager-1.0.9-pl1` используется только для native ACTION_UPGRADE/reinstall внутри нового семейства; этот архив не предназначен для передачи в Modstore.

Контракт исходников браузера сравнивается с `main`; меняются только component-пути PHP и необходимые метаданные. Dry run нового `restore-elements.php` прочитал шесть native backups без применения изменений на всех четырёх стендах. Исторические несовпадающие ZIP/попытки стенда сохраняются в `.local/package-rename/`; доказательства для выдаваемого ZIP имеют отдельный SHA256 и `-final` fixtures.

**Ограничение проверки стороннего дополнения:** используются проверенные файлы и нативные namespace/settings/category/chunk/plugin из указанного публичного commit. Официальный Modstore ZIP и полная установка его ClientConfig не запускались; одновременная работа двух включённых баннеров не заявляется. Внешние SDK перехватываются браузерным стендом; это проверка загрузки/consent gating, а не реальной доставки аналитических событий внешнему сервису. Действительные ID клиентов, production-деплой и публикация Release не использовались.

## Решение и MODX 3

GO/NO-GO и числа проверок зафиксированы в машинном отчёте. Для загрузки в Modstore требуется закрыть ограничение официального стороннего transport и принять описанный ручной переход/ограничение старого package record. До этого **NO-GO для публикации**. Код и ZIP можно передать на изолированную приёмку.

`main` не изменён. MODX 3 (`modx3`, `ef96e4f2e4d39ffebae5e63d2bbfbc9cfe48af32`) не изменён: этап 2 начинается только после успешной приёмки MODX 2. Кандидат `cookieconsentmanager3-1.0.8-pl5`, отдельная рабочая ветка/commit и ZIP для MODX 3 в этой работе пока не создавались. Его диапазон должен остаться `>=3.1.2,<3.3.0`, PHP `>=8.1.0`; перенос архитектуры MODX 2 в эту ветку запрещён.
