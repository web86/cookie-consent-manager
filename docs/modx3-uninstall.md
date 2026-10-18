# CookieConsentManager MODX 3 — штатное удаление

**GO для первого публичного выпуска `cookieconsentmanager3-1.0.8-pl6`.** Ветка `codex/modx3-cookieconsentmanager`, база `ee299272c864416e0ff49348d732ff42bd85e503`. MODX `>=3.1.2,<3.3.0`, PHP `>=8.1.0`. Публикация и изменения main/modx3 не выполнялись. Решение перенесено из проверенного transport MODX 2 без объединения веток. Все три MODX 3 стенда работали с `load_deprecated_global_class_aliases=false`; новые hooks используют FQCN MODX 3/xPDO 3.

Native ZIP: `.local/uninstall3/artifacts/final/release/cookieconsentmanager3-1.0.8-pl6.transport.zip`. SHA256: `5bb0477eda935a67f7cdc2415d7c4f8eb8a37ec424ef1e7484d5314982512f76`. Повторная native-сборка идентична. [Machine evidence](evidence/modx3-uninstall.json).

## Фактическая семантика транспорта

Аудит официальных xPDO 2.8.4/2.8.8 и xPDO 3 подтвердил одинаковые существенные правила: uninstall выполняет vehicles в обратном порядке; object vehicle удаляет объект только при `UNINSTALL_OBJECT && UPDATE_OBJECT` и подходящем `PREEXISTING_MODE`; отсутствие файла считается ошибкой file vehicle. Ошибка uninstall не прерывает следующие vehicles: транспорт агрегирует результат. Поэтому одного переключения `UNINSTALL_OBJECT` недостаточно.

Install-флаги сохранены: `UPDATE_OBJECT=false` для настроек, namespace, меню и категории; `true` только для шести canonical elements. При install/reinstall штатный `PRESERVE_PREEXISTING` продолжает сохранять native backups. Для удаления подтверждённых canonical elements используется native object vehicle с `REMOVE_PREEXISTING` только в uninstall, чтобы не восстанавливать предыдущее содержимое того же продукта. Точные native file vehicles удаляют поставленные файлы; их собственный `PRESERVE_PREEXISTING` исключает возврат старых файлов продукта даже при выборе restore в Package Manager.

Принадлежность подтверждается ID/PK и идентифицирующими полями в дополнительной записи **существующего native `preserved.php`**, а не только именем. Эта запись переносится между версиями одного технического продукта и сохраняется при reinstall. Нет новых таблиц, отдельной БД состояний, uninstall интерфейса, backup framework или ручного SQL. Старые `cookieconsent`/`cookieconsent3` не исследуются и не мигрируются.

Штатные PHP payloads vehicles вычисляют флаги удаления по плану текущего запроса. Так native vehicles безопасно пропускают уже отсутствующие файлы и чужие/изменённые targets; файловый validator повторно проверяет SHA256 непосредственно перед native deletion. Это также предотвращает продолжение удаления остальных объектов, если начальный uninstall hook отказал, поскольку сам xPDO не останавливает uninstall на ошибке.

Последний install verification vehicle первым выполняется при uninstall: проверяет native ownership, пути, доступность и lock, отключает свой build plugin. После native файлов и canonical elements первый install preflight последним завершает очистку служебных объектов и generated-файлов. Оба скрипта содержат небольшой общий helper внутри самого транспорта и не загружают удалённые runtime-классы.

## Удаляется при подтверждённой принадлежности

- Пять сниппетов `CookieConsent`, `CookieConsentAssets`, `CookieConsentBanner`, `CookieConsentMap`, `CookieConsentVideo` и чанк `CookiesPopup` — native vehicles.
- Namespace `cookie_consent`; собственный пункт меню, включая сохранённый пользовательский текст меню; build plugin `CookieConsentCacheBuild` и его event bindings.
- Семь настроек: `cookie_consent.options`, `.services`, `.texts`, `.log_dir`, `.audit_config_file`, `.audit`, `.bundle_version`. Других служебных setting keys аудит не обнаружил.
- Созданные компонентом definitions `cookie_consent_manage`, `cookie_consent_view_logs` во всех policy templates. Существовавшие до установки чужие definitions и пользовательские policy grants сохраняются.
- Private audit queue `cookieconsent-audit-private` только при наличии подтверждённой audit setting, точном штатном формате единственного `rate_limit_key` и отсутствии сторонних topics. Неопознанная/shared queue сохраняется с предупреждением.
- Собственная категория `CookieConsentManager`, если пуста и не содержит сторонних snippets/chunks/plugins/templates/TV или дочерних категорий. Pre-existing/unproven категория сохраняется.
- Все 231 поставленных файла по точной native allowlist, если безопасный regular file и SHA256 соответствует выпуску. Чужая замена/правка не удаляется.
- Публичные сервисные адаптеры, совпадающие с одной из записанных штатных SHA256 версий; `adapter-checksums.json` с распознанной историей; bundle с заголовком `CookieConsentBundle`; штатный error JSON и пустой build lock. Известные каталоги удаляются только пустыми, снизу вверх; произвольная рекурсивная очистка не применяется.

## Сохраняется и сообщается владельцу

JSONL, `.rate`, `.htaccess` и любые прочие данные в частном или общем каталоге журналов, в том числе `core/cache/logs/`; произвольные пути из настроек; внешняя audit configuration; изменённые/неизвестные адаптеры; неизвестные файлы и пользовательские каталоги; чужие замены объектов/файлов и непустые/shared категории. Также сохраняются ресурсы, шаблоны, скрипты сайта и пользовательские согласия в браузере.

Предупреждения перечисляют сохранённые изменённые адаптеры, targets и каталоги. Для отдельного удаления владелец сначала сохраняет нужные данные, затем удаляет именно перечисленные файлы/объекты через свои средства управления сайтом. Никакой автоматической очистки всего log path нет. Сохранённый пользовательский файл/объект может намеренно блокировать новую чистую установку; это защита от перезаписи.

Для upgrade с предыдущего кандидата того же продукта используются native backup provenance категории и точные fingerprints созданных прежним hook permission definitions. Если старый кандидат уже перезаписал исходный category backup при reinstall, доказательство создания категории может быть потеряно: такая категория консервативно остаётся. Новые ownership receipts этот случай устраняют. Это ограничение старого непубличного кандидата; универсальная историческая миграция не добавлялась.

## Проверки и ошибки

Финальный ZIP прошёл **18 native сценариев / 282 assertions / 0 FAIL** на MODX 3.1.2/PHP 8.1.34 (xPDO 3.1.5) и MODX 3.2.4/PHP 8.2.34 (xPDO 3.1.7). На каждом стенде выполнены все 9 заданных сценариев настоящими processors Package Manager: clean uninstall, reinstall того же ZIP, изменённые настройки, изменённый адаптер, пользовательские файлы/пустой каталог, реальные JSONL/.rate в private и shared log directory, upgrade с собственного `pl5`, отказ/повтор, защита чужих объектов/файлов. Проверены чужие замены canonical snippet, build plugin, setting в другом namespace, namespace assets path, поставленного `manager.js`, pre-existing permission и категория со сторонним элементом.

При ошибке прав Package Manager возвращает failure, сохраняет `installed=true`, а hook пишет `uninstall incomplete` с причиной. После исправления прав повтор проходит, включая уже отсутствовавший shipped file. Файлы и service plugin не удаляются, пока initial gate не готов. При позднем сбое возможна частичная очистка: полный rollback не заявляется; сохранённый native ownership и обработка missing targets позволяют повторить uninstall. При недоступном ownership очистка блокируется и не выдаётся за успешную.

Функциональный регресс: **14 сценариев / 461 assertions / 0 FAIL** на отдельном MODX 3.2.4/PHP 8.2.34: RU/EN, Strict/Legacy × 3 положения, все snippets, аналитика/реклама/Custom JS, видео/карты/обычный iframe, callbacks/API, browser consent, JSONL/CSV, ACL, SHA256 update и административная PHP JS-сборка. Функциональный регресс использовал тот же финальный ZIP. От прежнего `pl5` отличаются только два runtime-файла — Version и package_version в frontend manifest; вся нативная реализация MODX 3 сохранена. Базовые предупреждения MODX/xPDO/Smarty/RSS не выдаются за новые ошибки компонента. Внешние SDK перехватываются локальным стендом. Ранее согласованные ограничения прогретого compiled Fenom cache pdoTools3 3.1.0 и реального внешнего video playback остаются вне native release scope и не объявляются устранёнными этим изменением.

Дополнительно 2 проверки / 8 assertions подтвердили доставку предупреждений через настоящий register console Package Manager; 2 suites / 26 assertions проверили границы совместимости. Итого: **36 проверок / 777 assertions / 0 финальных FAIL**, включая настоящие native операции. После штатного uninstall без пользовательских дополнений повторная установка проходит без ручной очистки БД. Сами package records и timestamps управляются только Package Manager.

Точные приватные/публичные component-пути: `core/components/cookieconsentmanager3/` и `assets/components/cookieconsentmanager3/`. Публичные JS/CSS-пути и `window.web86CookieConsent` сохранены. В transport нет старых `components/cookieconsent/` или `components/cookieconsent3/`.
