# Установка и обновление до beta24

**GO только для review.** [Приёмка PASS/FAIL/NOT RUN](modx2-beta24-acceptance.md). Deployment и merge не выполнялись.

Архив `.local/release/cookieconsent-0.1.0-beta24.transport.zip` в checkout, SHA256:

```text
6829d696da9fb0a4bdbeed19e92e27e872d09504cbe63c64194006f55bb05e5f
```

1. Сделайте согласованный backup DB (включая private native registry/HMAC), canonical elements/static sources/templates/runtime, configuration и всех месячных журналов с `.rate/`. Стандартный каталог MODX `MODX_CORE_PATH . 'cache/logs/'` тоже должен входить в backup. Перед ручным удалением всего `core/cache/` сохраните эти данные отдельно. Старый ZIP и native preserved snapshots сохраните до reinstall: штатный backup map перезаписывается повторной установкой.
2. Сверьте SHA256 и загружайте только release beta24 через настоящий **MODX Package Manager → Upload/Scan local → Install/Update** после review на отдельной staging-копии. beta25/beta91 в `.local/artifacts` — test-only. Не переименовывайте/не заменяйте beta23 или опубликованный beta24.
3. Прочитайте metadata warning: source `CookiesPopup`, `CookieConsent`, `CookieConsentRegistry`, `CookieConsentMap` обновляется на месте. IDs/name/type/properties и связи остаются; static canonical становится DB-backed без изменения исходного файла. Новых stock copies нет. Setup Options отсутствуют.
4. Очистите штатный MODX cache и согласованно обновите browser/CDN cache JS/CSS. Подключение — `[[!CookieConsent]]` один раз; прямые счётчики/пиксели вне consent manager нужно убрать. Проверьте сохранение переводов/HTML/IDs и индивидуальных service parameters. Policy version автоматически не меняется, прежние consent grants сохраняются.
5. Откройте **Cookie Consent Manager → Основные → Журнал согласий** в конце вкладки. Свежая установка предлагает фактический `MODX_CORE_PATH/cache/logs/` целевого сайта; core может быть внутри или вне webroot. Update сохраняет выбранный путь, включая намеренно пустой disabled value. Существующие paths не заменяются новым default даже при перемещении core.
6. Каталог должен уже существовать и быть writable пользователю PHP. Выберите site-relative `logs/cookies/`/`/logs/cookies/` либо absolute directory. Пустой путь отключает новые записи и сохраняет старые файлы/config/key. Нажмите общую **«Сохранить»**. При первой настройке cfg инициализируется, даже если default path не меняли. Проверка — локальный временный PHP write/flock/read/cleanup; self-request и фиктивных согласий нет.
7. При partial Save остальные корректные параметры сохранены, прежний путь остаётся, отклонённый draft виден в поле. Исправьте причину (missing/path/symlink/permissions/write/read), затем Save снова. Неверные ordinary fields по-прежнему блокируют Save целиком. Если стандартная папка исчезла, компонент её не создаёт и не выбирает unsafe fallback; восстановите именно нужный каталог/права и данные из backup.
8. Вкладка **«Журнал»** содержит только фильтры/current year/all months/action/search, Find, total/CSV, таблицу и detail/pagination. Для чтения/export нужно `cookie_consent_view_logs`; manage permission не требуется и установка его не выдаёт автоматически. Конфигурации и audit buttons на этой вкладке больше нет.
9. Local Save не доказывает public delivery. Проверьте реальное browser consent событие на staging: POST → `ok:true`/тот же `event_id` ACK → запись этого ID в месячном журнале с IP/UA/server time. HTTP 400 `invalid_payload` на `{}` подтверждает только достижимость receiver. PHP self-request может быть запрещён хостингом — он больше не нужен. Недоступный receiver не отключает уже сохранённый локальный каталог.

Origin/schema/provider/HMAC/rate/replay механизмы receiver сохранены. Existing config/origin/key/rate не меняются ordinary Save; env/private JSON имеет прежний приоритет. Неправильный public origin исправляйте в доверенной конфигурации владельца, сохраняя ключ. Не ослабляйте Origin/TLS для обхода hosting rules. HTTP-доступ к logs/core/private configuration защищает владелец сайта; компонент не создаёт/не редактирует `.htaccess`.

Месячные файлы `YYYY-MM-cookie-consent.log` отделены от `error.log`: новые содержат текстовый header и JSON records; прежние файлы без header совместимы. Старые каталоги/файлы не переносятся и не удаляются. При disabled пустом пути Viewer не ищет прошлые папки автоматически; владелец хранит backups и выбирает нужный каталог осознанно.

Штатная MODX 2.8.8 clearcache операция сохранила journals/error.log в тестах. Произвольные manual purges и сторонние plugins могут их удалить; компонент восстановить их без backup не может. Native install/upgrade/uninstall не обещает атомарный rollback при любых DB/FS failures. [Canonical backup/restore](modx2-canonical-elements.md) использует штатный preserved map/hash preview/in-place restore. Uninstall сохраняет settings/elements/keys/logs/untracked files, удаляет shipped runtime; template calls нужно отключить перед uninstall.
