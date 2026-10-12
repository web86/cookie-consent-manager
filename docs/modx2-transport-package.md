# MODX 2 transport: установка и сопровождение

Приватная beta для MODX Revolution 2.8.8, PHP ≥8.1 и MySQL/MariaDB с InnoDB-таблицами объектов MODX. Это нативный transport, собранный `modPackageBuilder`. Начинать с резервной копии и отдельного staging. Production deployment не входит в локальную приёмку.

## Установка через Package Manager

1. Проверить SHA256 ZIP по соседнему файлу `.transport.zip.sha256`. Не переупаковывать ZIP. Вновь опубликованная версия с изменениями должна иметь новый release index; опубликованные signature/контрольная сумма неизменяемы.
2. Проверить доступ PHP к `MODX_CORE_PATH/components/`, `MODX_CORE_PATH/packages/` и целевым assets. Для `core` внутри webroot обеспечить серверный запрет HTTP-доступа ко всему core, включая packages/cache/config. Пакет добавляет Apache deny-rule своему компоненту; это не заменяет защиту MODX. Для nginx нужны правила оператора.
3. Если core приватный, каталог учёта пакета создаётся как `MODX_CORE_PATH/.cookieconsent-package/`. Если core публичный, **заранее** создать отдельный канонический каталог вне DOCUMENT_ROOT, writable пользователю PHP (рекомендуется 0700), и указать его в мастере. Путь без symlink/`..`. Существующая настройка `cookie_consent.package_state_dir` сохраняется.
4. Открыть Extras → Installer / Package Management. В меню Download Extras выбрать Upload a Package, загрузить `cookieconsent-0.1.0-beta1.transport.zip`; затем Search Locally for Packages, если пакет не появился автоматически. Нажать Install, прочитать Readme/License/Dependencies, открыть Setup Options и установить.
5. Открыть Extras → Cookie Consent Manager. Для нужных пользователей Manager явно предоставить `cookie_consent_manage` в соответствующей Access Policy, обновить права/сессию. Пакет устанавливает определения permission, **не меняет grants** существующих политик. Пользователю нужны также обычные права доступа к Manager; установщику — `packages`/`file_upload`.

Fresh install создаёт семь settings: `options`, `services`, `texts`, `log_dir`, `audit_config_file`, `package_state_dir`, `package_version` в namespace `cookie_consent`. Первые пять — конфигурация продукта, последние два — служебные markers. Все семь штатных необязательных сервисов выключены, идентификаторы счётчиков пусты. Включение требует настройки и отдельной проверки. Шаблоны, ресурсы, формы и карты установщик не редактирует.

## Приватный аудит, включая shared hosting

`cookie_consent.log_dir` задаёт существующий канонический writable каталог вне DOCUMENT_ROOT. Пустое значение допустимо как явное «аудит не настроен»; HTTP-приёмник возвращает 503. Публичного fallback и удаления старых месячных JSONL нет.

Есть два способа указать конфигурацию:

- Через явно установленную оператором webserver environment variable `COOKIE_CONSENT_AUDIT_CONFIG`. Сохраняется совместимость с доверенным приватным PHP-конфигом ручной установки; поддерживается также JSON. CLI environment не доказывает доступность переменной PHP-FPM/Apache.
- Без environment — через системную настройку `cookie_consent.audit_config_file`. Разрешён только существующий readable канонический **JSON** вне webroot, без symlink/hardlink. PHP include из этой настройки запрещён.

Конфиг содержит `site_origin`, случайный `rate_limit_key` минимум 32 символа и целочисленный `rate_limit_per_minute` (default 60). Не помещать эти значения в публичный root, чанк, шаблон, переводы, registry, Git или комментарии к Issue. Пакет и мастер не создают конфиг и не собирают секреты.

Для явной настройки можно запустить установленный CLI-helper **от пользователя PHP**. Все нижеуказанные пути и переменные — placeholders:

```sh
php "$MODX_CORE_PATH/components/cookieconsent/bin/configure-audit.php" \
  "$MODX_WEBROOT" "$PRIVATE_CONFIG_DIR/audit.json" "$SITE_ORIGIN"
```

Helper создаёт новый приватный JSON с mode 0600, генерирует HMAC key, сохраняет путь в setting и не выводит секреты. Уже существующий файл/другой выбранный путь не перезаписывает. Создать каталоги с нужным владельцем предварительно; root-owned 0600 не будет readable PHP-worker. Если CLI на shared hosting недоступен, оператор создаёт эквивалентный приватный JSON и вводит только путь в CMP. Не использовать web-файл для генерации ключа.

В CMP установить `log_dir` и путь JSON, сохранить. Проверить статус ready и реальный same-origin POST: 200, JSONL в выбранном каталоге, server IP/UA/UTC. Ошибочная/недоступная конфигурация — invalid/503, отсутствующая — not configured/503. Статус не показывает Origin/HMAC. Убедиться, что конфиг и журналы недоступны по HTTP. Доверенные reverse proxy настраиваются отдельно: произвольный X-Forwarded-For не принимается за IP клиента.

## Явное подключение страницы

После установки вручную в staging-шаблоне подключить CSS, `[[!CookieConsentRegistry]]`, затем `i18n.js`, `provider-registry.js`, `consent-manager.js` в этом порядке, и `[[CookiesPopup]]` (либо сохранённый пользовательский чанк). Добавить `data-cc-audit-url` со same-origin endpoint `/assets/components/cookieconsent/audit.php` на корневую разметку компонента.

Удалить прежние прямые SDK/scripts/noscript и старые analytics.js/marketing.js из подключений. Новое согласие не блокирует код, загруженный вне реестра. Карты подключать только inert markup: без iframe `src`, внешнего thumbnail/SDK до разрешения. Точные примеры и ограничения: [реестр и карты](service-registry.md), [предыдущая приёмка](modx2-m2-maps-acceptance.md). Компактная памятка также находится в CMP.

Сначала использовать локальные mock-адаптеры. Live SDK/GTM, состав тегов контейнера, cookies и production templates требуют отдельного staging gate. Package install не означает готовность PHP-аудита или юридическую аттестацию.

## Обновление и ручная миграция

Сделать backup DB, пользовательских чанков/сниппетов, core/assets, приватной конфигурации, журналов и каталога учёта пакета. Загрузить новую signature и нажать Install/Upgrade в Package Manager. Не выполнять старый CLI installer для обновления транспорта.

Namespace/settings/menu определяются по стабильным ключам. Существующие значения `services/options/texts/log_dir/audit_config_file`, disabled flags, purpose IDs, translations/notice_html и свойства элементов сохраняются. Stock-сниппет нормализован по правилам MODX `modScript::set`; stock-код обновляется только по известным хешам. Пользовательский чанк/сниппет сохраняется, рядом создаётся `*_package_<version_release>` с новым stock-кодом. Выбирать/объединять его оператор должен явно; пакет не меняет подключения шаблона.

Ручной runtime принимается только по хешам проверенных исходников M3/M4 либо ранее установленной версии. Изменённый/неизвестный runtime, конфликт пути namespace, недостаточные права или неканонические пути вызывают отказ до активации. В таком случае сравнить файл с исходниками, сохранить изменения отдельно и согласовать миграцию. Не удалять пользовательскую копию ради зелёного статуса. Предшествующие дубликаты не очищаются автоматически; проверить их вручную.

Mode install/manual_migration/reinstall/upgrade хранится в приватном `state.json`. Ledger содержит хеши/владение/поколение, stock backups и имена конфликтов, без Origin/HMAC или snapshots пользовательских settings. Не редактировать и не удалять ledger при работающем пакете. Приватный путь нельзя менять в ходе обновления.

## Удаление и отдельная ручная очистка

Удалять через Package Manager **активную версию**. Даже при выборе Remove preexisting objects пакет сохраняет namespace, settings, translations, snippets/chunks, ACL definitions, приватный конфиг, журналы и browser consent. Неизменённые созданные им runtime-файлы и созданное меню удаляются; проверенные файлы ручной установки восстанавливаются из приватных backups. Пользовательские изменения сохраняются. Нет рекурсивного удаления каталогов и нет очистки JSONL. Отсутствующий manual backup вызывает отказ до удаления runtime.

Сначала вручную убрать подключения компонента из шаблонов/форм/карт: при fresh install после uninstall assets отсутствуют. При ручной миграции исходный runtime может продолжить работать. Browser consent не удаляется серверным Package Manager; уже поставленные сторонние cookies также требуют отдельной процедуры.

Полная очистка — отдельное решение владельца: экспортировать settings/elements и backup журналов; отключить все подключения; удалить только подтверждённо ненужные объекты namespace/menu/settings/elements/permission definitions, не задеть grants других пользователей; удалить только принадлежащие компоненту assets/core и уже не нужный ledger; приватный конфиг/JSONL удалять только после отдельного решения по хранению. Автоматического purge инструмента нет. Не использовать удаление namespace для «чистого reinstall»: MODX может каскадно удалить settings.

## Сборка из исходников

Требуется доверенный checkout и **отдельный локальный** MODX 2.8.8 для загрузки native builder. Builder не сериализует установленный registry/config/чанки/логи. Нужны PHP ≥8.1 и Python 3; MODX встроенный PclZip достаточен, ZipArchive необязателен.

```sh
python3 _build/baselines.py
php _build/build.php "$LOCAL_MODX_WEBROOT" "$NEW_PRIVATE_OUTPUT" 1
python3 _build/normalize.py "$NEW_PRIVATE_OUTPUT/cookieconsent-0.1.0-beta1.transport.zip"
php _build/verify.php "$NEW_PRIVATE_OUTPUT/cookieconsent-0.1.0-beta1.transport.zip" "$LOCAL_MODX_CORE"
```

`baselines.py` читает только фиксированные reviewed Git refs; экспорт уже включён в исходники, Git в PHP-контейнере не требуется. При добавлении поддерживаемой ручной версии обновить refs осознанно. `package.json` задаёт version/release/source_epoch. Повторять builder в разных **новых** output-каталогах; одинаковые исходники и release должны дать одинаковые ZIP. Нормализатор меняет только metadata/order уже созданного native ZIP. Verifier проверяет native vehicles, defaults/excludes, source checksums и SHA256; он исполняет PHP-декларации vehicle и предназначен только для собственных доверенных сборок.

Артефакты сохраняются вне Git, не публикуются в открытых Releases. Тестовые beta2/beta97/beta98 нужны только для приёмки. beta97/98 намеренно повреждены и не предназначены для установки оператором.
