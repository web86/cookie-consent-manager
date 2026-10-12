# Beta13: журнал и согласие по категориям

Основа: 80f30ac, отдельная feature/modx2-category-consent-audit. Beta7 не перезаписывается. Native install/upgrade/uninstall без Setup Options, собственного lifecycle ledger или полного rollback.

## Обновление

Backup DB (включая private queue options), core/assets, canonical elements, private config и все JSONL. Проверить SHA нового beta13 ZIP и установить через MODX Package Manager. Settings/элементы/props/переводы/consent IDs/журналы сохраняются; native file vehicles заменяют runtime. Canonical пользовательские чанки/сниппеты не перезаписываются. Новые stock *_package_0_1_0_beta13 сравнивать и применять явно, только если требуется. Техническая инструкция убрана из обычной формы. Шаблоны installer не изменяет, основной API остаётся [[!CookieConsent]], карты — CookieConsentMap.

## Журнал

Вся конфигурация — вкладка «Журнал». Выбрать **внутри сайта** и ввести /logs/cookies/ (либо logs/cookies), либо **абсолютный приватный путь**. Внутренний путь разрешается относительно настоящего DOCUMENT_ROOT, хранится канонический filesystem path. Каталог должен существовать и быть PHP-writable. Нет автоматического выбора между filesystem path и URL: mode выбирается явно; старые абсолютные значения совместимы.

«Проверить и включить журнал» проверяет revision/path → сохраняет существующие administrator .htaccess rules или создаёт deny rule, если файла нет → проверяет реальный HTTP 403 → setup HMAC/origin/rate → сохраняет только каталог → реальный POST/проверка JSONL. Другие черновики формы не сохраняются этой операцией. Проверочная запись остаётся. При POST failure previous directory восстанавливается с revision guard; при concurrent conflict сообщается отдельная причина. Ключ и записанные события не удаляются. Это не обещание атомарности между DB, HTTP и FS.

Обычная Save работает без журнала и с защищённым каталогом даже до setup. При отсутствии config status=not_configured и receiver fail-closed. Guard больше не сравнивается с единственным шаблоном: существующие правила, parent/server denial допустимы **только при реальном 403** для безопасных probes, existing JSONL/monthly logs и .rate/state.json. Symlink/hardlink/traversal/canonical checks сохраняются. Apache direct only: nginx, unknown server, известные proxy/CDN headers и cache headers не получают public fallback. Приватный каталог рекомендуется.

HTTP 200 + success=false — ошибка. UI локализует missing/not-directory/permissions/traversal/symlink/root/http-protection/post/write/revision causes и сохраняет draft. Безопасный request_id/action/status помогают найти соответствующий MODX log без вывода secret/draft. HMAC остаётся в серверных native private queue options; system setting содержит только origin/rate. ENV/private JSON priority совместим с beta7.

## Category-only consent

В public preferences и preview ровно четыре категории: необходимые locked/disabled, analytics, marketing, external_content. Под каждой — один администраторский description, не генерируется список сервисов. При новом выборе категории включаются все **активные** её providers. Выключенный сервис не запускается. GTM требует все активные permissions; само marketing-согласие не отменяет эту защиту. Индивидуальные map load/revoke кнопки сохраняются, не разрешают другие карты/сервисы.

Provider fingerprints и schema1/2 аудит остаются внутренними. Новые committed records имеют model=categories_v1 и disclosed fingerprints. Старые records не переписываются при чтении: сохраняются consent_id/проверенные grants, banner просит review. Partial category отображается mixed; untouched Save сохраняет точный набор providers. Только явное изменение checkbox/Accept all расширяет разрешение. Добавленный/включённый позднее provider или смена fingerprint требуют review, не наследуют разрешение. Map choice раскрывает только выбранную карту и не считает прочие новые сервисы просмотренными. Cosmetic text/language edit не меняет fingerprints.

Прежняя матрица 256 internal grants проверяется через реальные legacy localStorage records и category-only Save, без скрытых DOM checkbox. Это не «тест пропущен»: каждый mask сравнивается с точным Network и provider set, включая GTM guard.

«Тексты»: один MODX language select, notice HTML source и названия/описания четырёх категорий (9 полей). Service text fields удалены из editor; legacy locale overrides остаются в DB и разрешаются как прежде. Stock RU/EN messages/buttons/a11y/service names берутся из package lexicons. Preview изолирован sandbox/CSP, без SDK/audit. Native context cache/OPcache ограничения beta7 сохраняются.

## Ограничения

Не проверено на production, неизвестных server routes/CDN aliases, HTTPS certificates, Firefox/WebKit/custom skins/других версиях PHP/MODX. Нативная частичная установка не атомарна; ENOSPC/power loss/DB outage/multi-node не аттестованы. Backup/restore обязателен. Для неподтверждённого public HTTP denial выбрать private directory. Никаких merge/deployment.
