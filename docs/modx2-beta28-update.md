# beta28 — CookiesPopup и категория элементов

Две небольшие правки к beta26. [Результаты приёмки и ограничения](modx2-beta28-acceptance.md). GO только для review; merge и deployment не выполнялись.

В начале исходного `CookiesPopup` добавлен HTML-комментарий: пустые `data-cc-text` и `data-cc-html` — места для PHP-локализации через `CookieConsentBannerRenderer` и `CookieConsentTexts::resolve()`. Сохранённые значения вкладки «Тексты» имеют прежний приоритет, stock RU/EN и языковые fallback сохранены. Renderer выводит только корень баннера, поэтому комментарий не попадает даже в исходный код готовой страницы. Статические строки не заполняются JavaScript.

Одна штатная `modCategory` vehicle перед элементами использует имя `CookieConsent`, `UPDATE_OBJECT=false`, `PRESERVE_KEYS=false`, `UNINSTALL_OBJECT=false`: категория создаётся с локальным ID либо существующая используется без изменения метаданных. ID с машины сборки не переносится. Существующий canonical validator назначает эту категорию только отсутствующим элементам. Для существующих элементов прежняя ветка обновления кода не менялась: ID, имя, properties, category и пользовательские metadata сохраняются. Никакой миграции категорий нет. При upgrade категория может существовать отдельно от элементов, которые администратор оставил в своих категориях.

Шесть постоянных имён: чанк `CookiesPopup`; сниппеты `CookieConsent`, `CookieConsentAssets`, `CookieConsentBanner`, `CookieConsentRegistry`, `CookieConsentMap`. Код обновляется на месте; `*_package_VERSION` копии не создаются. Пользовательские элементы и категории за пределами этих имён не изменяются. Существующая политика static canonical элементов остаётся прежней: переход на DB-backed source с сохранением исходного файла, поэтому его тоже нужно включать в backup.

## Установка и обновление

ZIP: `.local/release/cookieconsent-0.1.0-beta28.transport.zip` в checkout.

SHA256: `1a69b5a88719d606d180b30e53421365940d08526ddf9430f6a8473612cb2db1`.

1. Сохраните DB, элементы и static sources, пользовательские runtime-файлы и журналы. Код всех шести canonical элементов будет заменён; перенесите необходимые правки кода отдельно. Native `preserved.php` перезаписывается при reinstall и не заменяет backup.
2. Проверьте SHA256 ZIP. После review установите через MODX Package Manager на staging-копии, прочитав предупреждение об обновлении кода. Setup Options отсутствуют. На существующем сайте категорию элементов можно перенести вручную; пакет этого не делает.
3. Обычная очистка кэша MODX. Проверьте сохранённые тексты RU/EN, HTML-ссылки, настройки сервисов, путь журнала и реальные согласия. Старые журналы и выбранный путь сохраняются. Удалять весь `core/cache/` вместе с журналами нельзя без backup.
4. Подключение не меняется: `[[!CookieConsentAssets]]` один раз в `<head>`, `[[!CookieConsentBanner]]` один раз перед `</body>`. Альтернатива — прежний `[[!CookieConsent]]`; одновременно методы не используются. `CookieConsentMap` остаётся самостоятельным сниппетом.

Новых MODX-плагинов, обработчиков событий, PHP suppression flags или lifecycle storage нет. JS/CSS и публичный receiver идентичны beta26. Uninstall оставляет категории, элементы, настройки и журналы; шаблоны нужно отключить от удалённого runtime заранее. Native установка не обещает атомарный rollback при любых DB/FS-сбоях.

## Воспроизведение локальных проверок

Используются disposable MODX 2.8.8 fixtures, Docker и Playwright, как в [beta26](modx2-beta26-frontend.md). `reset.py` архивирует предыдущие fixture-файлы и сбрасывает только именованные тестовые DB; основной stand не сбрасывается.

```sh
node _build/transport.mjs /var/www/html /opt/cc-private/new-beta28-build 28
python3 _build/normalize.py .local/private/new-beta28-build/cookieconsent-0.1.0-beta28.transport.zip
# Скопировать ZIP и inventory из нового build-dir в .local/artifacts.
python3 tests/transport/reset.py clean publiccore
node tests/beta28/categories.mjs
CC_INSTALL_SERVICES=web node tests/transport/install-current.mjs
node tests/beta28/localization.mjs
node tests/browser.mjs
node tests/http.mjs
```

Native upgrade fixture использует сохранённый immutable beta26 ZIP в `.local/release`. beta27 — прежний тестовый номер, не новый опубликованный release; следующий кандидат имеет уникальное имя beta28.
