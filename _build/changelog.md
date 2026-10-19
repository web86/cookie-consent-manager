# 1.0.8-pl9 — исправления modstore / modstore corrections

RU: Runtime находится в `assets/components/cookieconsentmanager3/`, приватный код — в `core/components/cookieconsentmanager3/`. Пути строятся от настроек MODX. Установщик создаёт `bootstrap.php` рядом с `audit.php` по фактическому `config.core.php`; перенесённые assets и core поддерживаются без ручных действий.

EN: Runtime lives under `assets/components/cookieconsentmanager3/`; private code remains under `core/components/cookieconsentmanager3/`. The installer generates `bootstrap.php` beside `audit.php` from the actual `config.core.php`, including relocated assets and core, without extra setup.

RU: Обновление переносит JS-файлы из старого services/ без изменения байтов и сохраняет историю SHA-256. Удалённые адаптеры не восстанавливаются. Конфликт разных файлов останавливает перенос без перезаписи. Очистка после успешной сборки удаляет только известные старые файлы с точным совпадением SHA-256; чужие и изменённые файлы сохраняются.

EN: Upgrades move user JS adapters unchanged and retain SHA-256 history. Deleted adapters stay deleted; conflicting destination files stop migration without overwriting either version. After a successful build, cleanup removes only exact known legacy hashes; unknown/changed files remain.

RU: Сборка выполняется установщиком, вручную в Manager и при очистке кеша Manager. Frontend загружает готовый bundle без проверки SHA адаптеров. Ошибка сборки сохраняет прежний bundle и версию. Docker-маршрут удалён; тестовый mock-marketing хранится только в tests/.

EN: Builds remain in installation and authenticated Manager actions (manual rebuild and cache clear). Visitors load the prepared bundle without adapter hashing. Failed builds retain the working bundle/version. Docker-only routing was removed; mock-marketing is confined to tests/.

RU: restore-elements использует шесть фактических элементов transport-пакета, существующие ID, транзакцию и dry-run по умолчанию. Настройки не меняются.

EN: restore-elements uses the six actual transport elements, existing IDs, a transaction and a default dry run. Settings remain unchanged.

# CookieConsentManager 1.0.8-pl7 — MODX 3 preflight parity

- Allow a correct namespace alone after an interrupted first installation; it does not prove ownership.
- Validate namespace core/assets paths and reject unowned canonical settings/menu even in another namespace.
- Reject unknown component/public JS contents, links and occupied runtime targets; allow empty directories and the standard empty build lock.
- Retain native MODX 3/xPDO 3 installation, ownership receipts, uninstall and user adapter/settings preservation.
- No historical package migration; runtime differs from pl6 only by version stamps.

# CookieConsentManager 1.0.8-pl6 — native uninstall

- Complete native uninstall of confirmed package objects, service records and generated files.
- Native preserved.php records ownership across reinstall/upgrade; settings retain UPDATE_OBJECT=false.
- Disable the build plugin before removing runtime PHP; safely retry interrupted cleanup.
- Preserve changed adapters, unknown files, shared categories, consent logs and custom paths with warnings.
- Fresh install after ordinary uninstall requires no manual database cleanup.

# CookieConsentManager 1.0.8-pl5 — MODX 3 first public package

- Independent native package cookieconsentmanager3, core/assets component directories cookieconsentmanager3, category CookieConsentManager.
- Preserve namespace cookie_consent, settings, canonical elements, browser API and consent behavior.
- Native MODX 3 and xPDO 3 FQCNs; no deprecated global aliases, historical package migration or state import.
- Preserve SHA256-safe adapter updates, administrative PHP build, atomic publication and working-bundle fallback.
- Compatibility: MODX >=3.1.2,<3.3.0; PHP >=8.1.0. Fresh installation is the public-release scope.
