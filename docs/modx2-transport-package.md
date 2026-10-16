# Установка native transport (beta7)

Актуальная инструкция по UX, аудиту, обновлению beta5 и новым сниппетам: [Manager UX beta7](modx2-manager-ux.md). Описание ниже сохранено как историческая инструкция beta5; для beta7 настройки аудита и подключение изменились.

MODX Revolution 2.8.8, PHP ≥8.1. Установка выполняется обычным MODX Package Manager без Setup Options и private package-state каталога. Анализ упрощения, native замены и потерянные гарантии: [архитектура](modx2-transport-architecture.md).

## Install / upgrade

1. Сделать backup DB, templates/elements, runtime core/assets, private audit config и JSONL. Проверить SHA256 ZIP. Не заменять опубликованный ZIP под прежней signature.
2. Проверить writable core/packages, component core/assets. MODX core/config/cache/packages должен быть недоступен по HTTP. Для Apache package добавляет deny rule компоненту, но это не заменяет защиту MODX; nginx настраивается оператором.
3. Extras → Installer/Package Management → Upload a Package → Search Locally при необходимости → Install. Прочитать Readme/License/Dependencies, нажать Continue/Install. Дополнительных вопросов нет.
4. Extras → Cookie Consent Manager: явно предоставить cookie_consent_manage нужным mgr policy. Package создаёт только отсутствующие permission definitions, не меняет grants.

Fresh install создаёт **пять** product settings: cookie_consent.options, services, texts, log_dir, audit_config_file. Optional services выключены, IDs пусты. Namespace/menu/canonical snippet/chunk не перезаписываются, пользовательские content/properties/IDs сохраняются. Для новой версии добавляются stock `CookieConsentRegistry_package_0_1_0_beta5` и `CookiesPopup_package_0_1_0_beta5`. Их применение — явное решение администратора после сравнения с пользовательским элементом. Шаблоны/формы/карты installer не редактирует.

Runtime-файлы принадлежат поставке и заменяются штатными file vehicles. Прямые изменения runtime надо сохранить/объединить отдельно. MODX хранит native preserved.php и *.preserved.zip в core/packages. Они помогают восстановлению, но не заменяют полный backup и не гарантируют атомарный rollback.

## Аудит в CMP

Выбрать существующий канонический writable каталог журналов вне DOCUMENT_ROOT и указать cookie_consent.log_dir. Для shared hosting без environment указать readable canonical private JSON в cookie_consent.audit_config_file. Только JSON из этой настройки; PHP include допускается лишь для доверенного legacy webserver environment COOKIE_CONSENT_AUDIT_CONFIG. Environment имеет приоритет.

Приватный config содержит site_origin, случайный rate_limit_key минимум 32 символа, integer rate_limit_per_minute (default 60). Эти значения не входят в ZIP и не выводятся в CMP. Не помещать config/логи в webroot/Git. Каталоги/файл должны принадлежать подходящему PHP-user; рекомендуются directory 0700 и JSON 0600.

Оператор может явно создать новый config установленным CLI-helper от пользователя PHP (все переменные placeholders):

```sh
php "$MODX_CORE_PATH/components/cookieconsent/bin/configure-audit.php" \
  "$MODX_WEBROOT" "$PRIVATE_CONFIG_DIR/audit.json" "$SITE_ORIGIN"
```

Helper генерирует key без вывода, не перезаписывает уже существующий файл/другой выбранный путь. Без CLI оператор создаёт JSON приватно и задаёт только путь в CMP. Пустые настройки — честный not configured/HTTP 503, invalid private config — invalid/503; fallback в webroot отсутствует.

Сохранить settings в CMP и проверить реальный same-origin POST=200 и JSONL с server UTC/IP/User-Agent/CID. Readiness не заменяет POST-проверку. Wrong Origin/Fetch Metadata/тип/размер/schema отклоняются, forwarded IP не принимается за REMOTE_ADDR. Старые monthly JSONL не удаляются.

## Подключение страницы

**Историческая схема ниже не относится к текущему native transport.** Сейчас подключайте `[[!CookieConsentAssets]]` в head и `[[!CookieConsentBanner]]` перед закрытием body (либо один `[[!CookieConsent]]`); Assets выдаёт CSS и единственный content-hashed bundle. Не подключайте standalone sources вместе с bundle.

Прежняя ручная схема на staging: CSS → [[!CookieConsentRegistry]] → i18n.js → provider-registry.js → consent-manager.js → [[CookiesPopup]] либо выбранный пользовательский чанк. Корневой audit URL — same-origin /assets/components/cookieconsent/audit.php. Убрать прямые SDK/scripts/noscript и старые analytics.js/marketing.js; maps — inert markup без src/SDK/thumbnail до разрешения. [Примеры реестра/карт](service-registry.md).

## Uninstall / restore / migration

Удалять активную новую native версию через Package Manager. Удаляются только **точные 38 runtime-файлов**, не каталоги целиком и не untracked files. Namespace/menu/settings/canonical и stock elements/permission definitions/private config/JSONL/browser consent остаются. Перед uninstall убрать template connections; retained menu и элементы после удаления controller/runtime не будут работоспособными. Их осознанное удаление — отдельный purge после backup. Нет автоматической очистки журналов, cookies или namespace cascade.

Standard Restore preexisting objects может использовать native archives соответствующего release, но не гарантирует полный возврат всех DB/FS изменений. При позднем failure возможна partial install/uninstall: читать native console/logs, устранить причину, проверить DB/elements/runtime и restore либо повторную установку. Не считать installed-status доказательством здоровой страницы. Real ENOSPC/power loss/multi-node/DB outage не аттестованы.

Миграция manual installation использует natural keys, не копирует элементы поверх существующих и не сбрасывает settings. Старые legacy package_state_dir/package_version и .cookieconsent-package folders остаются **неиспользуемыми**; новые builds их не создают/читают/удаляют. Не запускать старый custom uninstall ledger-based beta поверх новой native версии. Backup старых restore данных нужен до отдельной ручной очистки.

## Сборка

Из доверенного checkout на отдельном локальном MODX, не из customer settings/элементов:

```sh
php _build/build.php "$LOCAL_MODX_WEBROOT" "$NEW_OUTPUT" 5
python3 _build/normalize.py "$NEW_OUTPUT/cookieconsent-0.1.0-beta5.transport.zip"
php _build/verify.php "$NEW_OUTPUT/cookieconsent-0.1.0-beta5.transport.zip" "$LOCAL_MODX_CORE"
```

Version/release/source_epoch — _build/package.json. Новый output каждый build; две одинаковые builds должны совпасть после metadata normalization. Verifier проверяет native manifest/vehicles, defaults/excludes/checksums и отсутствие Setup Options/lifecycle storage; исполняет доверенные vehicle PHP declarations, не использовать для чужих ZIP. MODX PclZip достаточен, ZipArchive необязателен. ZIP остаётся вне Git/открытых Releases.
