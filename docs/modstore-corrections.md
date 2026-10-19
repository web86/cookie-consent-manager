# 1.0.8-pl9 — исправления modstore / modstore corrections

RU: Runtime находится в `assets/components/cookieconsentmanager3/`, приватный код — в `core/components/cookieconsentmanager3/`. Пути строятся от настроек MODX. Установщик создаёт `bootstrap.php` рядом с `audit.php` по фактическому `config.core.php`; перенесённые assets и core поддерживаются без ручных действий.

EN: Runtime lives under `assets/components/cookieconsentmanager3/`; private code remains under `core/components/cookieconsentmanager3/`. The installer generates `bootstrap.php` beside `audit.php` from the actual `config.core.php`, including relocated assets and core, without extra setup.

RU: Обновление переносит JS-файлы из старого services/ без изменения байтов и сохраняет историю SHA-256. Удалённые адаптеры не восстанавливаются. Конфликт разных файлов останавливает перенос без перезаписи. Очистка после успешной сборки удаляет только известные старые файлы с точным совпадением SHA-256; чужие и изменённые файлы сохраняются.

EN: Upgrades move user JS adapters unchanged and retain SHA-256 history. Deleted adapters stay deleted; conflicting destination files stop migration without overwriting either version. After a successful build, cleanup removes only exact known legacy hashes; unknown/changed files remain.

RU: Сборка выполняется установщиком, вручную в Manager и при очистке кеша Manager. Frontend загружает готовый bundle без проверки SHA адаптеров. Ошибка сборки сохраняет прежний bundle и версию. Docker-маршрут удалён; тестовый mock-marketing хранится только в tests/.

EN: Builds remain in installation and authenticated Manager actions (manual rebuild and cache clear). Visitors load the prepared bundle without adapter hashing. Failed builds retain the working bundle/version. Docker-only routing was removed; mock-marketing is confined to tests/.

RU: restore-elements использует шесть фактических элементов transport-пакета, существующие ID, транзакцию и dry-run по умолчанию. Настройки не меняются.

EN: restore-elements uses the six actual transport elements, existing IDs, a transaction and a default dry run. Settings remain unchanged.
