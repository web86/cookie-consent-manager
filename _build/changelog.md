# Unreleased — Custom JS HTML attributes

RU: Custom JS поддерживает необязательные data-* атрибуты, редактор строк и безопасный текстовый предпросмотр. Сервер и публичный runtime проверяют имена, строки UTF-8, лимиты и дубликаты. Непустые атрибуты участвуют в fingerprint и существующей модели повторного согласия; старые конфигурации сохраняют идентичность. Руководство содержит пример Ahrefs и предупреждение о публичности значений.

EN: Custom JS supports optional data-* attributes, a row editor and a safe text preview. Server and public runtime validate names, UTF-8 strings, limits and duplicates. Nonempty attributes participate in fingerprints and existing category reconsent; legacy configurations retain their identity. The guide includes an Ahrefs example and a public-value privacy notice.

# 1.0.8-pl7 — исправления modstore / modstore corrections

RU: Runtime находится в `assets/components/cookieconsentmanager/`, приватный код — в `core/components/cookieconsentmanager/`. Пути строятся от настроек MODX. Установщик создаёт `bootstrap.php` рядом с `audit.php` по фактическому `config.core.php`; перенесённые assets и core поддерживаются без ручных действий.

EN: Runtime lives under `assets/components/cookieconsentmanager/`; private code remains under `core/components/cookieconsentmanager/`. The installer generates `bootstrap.php` beside `audit.php` from the actual `config.core.php`, including relocated assets and core, without extra setup.

RU: Обновление переносит JS-файлы из старого services/ без изменения байтов и сохраняет историю SHA-256. Удалённые адаптеры не восстанавливаются. Конфликт разных файлов останавливает перенос без перезаписи. Очистка после успешной сборки удаляет только известные старые файлы с точным совпадением SHA-256; чужие и изменённые файлы сохраняются.

EN: Upgrades move user JS adapters unchanged and retain SHA-256 history. Deleted adapters stay deleted; conflicting destination files stop migration without overwriting either version. After a successful build, cleanup removes only exact known legacy hashes; unknown/changed files remain.

RU: Сборка выполняется установщиком, вручную в Manager и при очистке кеша Manager. Frontend загружает готовый bundle без проверки SHA адаптеров. Ошибка сборки сохраняет прежний bundle и версию. Docker-маршрут удалён; тестовый mock-marketing хранится только в tests/.

EN: Builds remain in installation and authenticated Manager actions (manual rebuild and cache clear). Visitors load the prepared bundle without adapter hashing. Failed builds retain the working bundle/version. Docker-only routing was removed; mock-marketing is confined to tests/.

RU: restore-elements использует шесть фактических элементов transport-пакета, существующие ID, транзакцию и dry-run по умолчанию. Настройки не меняются.

EN: restore-elements uses the six actual transport elements, existing IDs, a transaction and a default dry run. Settings remain unchanged.

# CookieConsentManager 1.0.8-pl5 — native uninstall

- Complete native uninstall of confirmed package objects, service records and generated files.
- Native preserved.php records ownership across reinstall/upgrade; settings retain UPDATE_OBJECT=false.
- Disable the build plugin before removing runtime PHP; safely retry interrupted cleanup.
- Preserve changed adapters, unknown files, shared categories, consent logs and custom paths with warnings.
- Fresh install after ordinary uninstall requires no manual database cleanup.

# CookieConsentManager 1.0.8-pl4 — MODX 2 first public package

- Independent native package cookieconsentmanager, component directories cookieconsentmanager and category CookieConsentManager.
- Namespace cookie_consent, settings, canonical elements and browser API remain unchanged.
- No migration, old-package state import, uninstall or historical directory switch. Existing adapters within this product retain SHA256-safe updates and administrative build/fallback.
- Fresh-install release scope: MODX >=2.8.4,<3.0.0, PHP >=8.1.0. Historical package migration and full third-party-extra testing are outside this first public release.

# Cookie Consent Manager 1.0.7-beta2 — MODX 2 manual upgrade test

- New unique test signature based on the accepted UI-refinement branch.
- Include SHA256 adapter preservation, private originals and installed PHP bundle generation.
- Include RU/EN settings/services/journal refinement and the existing pathname field in the journal table/CSV.
- Validate native fresh install and 1.0.6 upgrade with user settings, edited/deleted adapters, owner JS and historical JSONL retained.
- No public release, push or production deployment.
