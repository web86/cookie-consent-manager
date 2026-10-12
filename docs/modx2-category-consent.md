# Beta15: журнал и согласие по категориям

Основа: 80f30ac, отдельная feature/modx2-category-consent-audit. Beta7 не перезаписывается. Native install/upgrade/uninstall без Setup Options, собственного lifecycle ledger или полного rollback.

## Обновление

Backup DB (включая private queue options), core/assets, canonical elements, private config и все JSONL. Проверить SHA нового beta15 ZIP и установить через MODX Package Manager. Settings/элементы/props/переводы/consent IDs/журналы сохраняются; native file vehicles заменяют runtime. Canonical пользовательские чанки/сниппеты не перезаписываются. Новые stock *_package_0_1_0_beta15 сравнивать и применять явно, только если требуется. Техническая инструкция убрана из обычной формы. Шаблоны installer не изменяет, основной API остаётся [[!CookieConsent]], карты — CookieConsentMap.

## Журнал

Вся конфигурация — вкладка «Журнал». Выбрать **внутри сайта** и ввести /logs/cookies/ (либо logs/cookies), либо **абсолютный приватный путь**. Внутренний путь разрешается относительно настоящего DOCUMENT_ROOT, хранится канонический filesystem path. Каталог должен существовать и быть PHP-writable. Нет автоматического выбора между filesystem path и URL: mode выбирается явно; старые абсолютные значения совместимы.

«Проверить и включить журнал» проверяет revision/path → setup HMAC/origin/rate → сохраняет только каталог → выполняет реальный POST в существующий audit endpoint и ищет event_id в JSONL. Проверочная запись остаётся. При POST failure previous directory восстанавливается с revision guard; при concurrent conflict сообщается отдельная причина. Ключ и записанные события не удаляются. Это не обещание атомарности между DB, HTTP и FS.

HTTP-доступ к журналам обеспечивает владелец сайта. Компонент не проверяет тип сервера, proxy/CDN, HTTP 403 и не создаёт/изменяет .htaccess в каталоге журналов. Существующие правила остаются без изменений. ZIP также больше не содержит file vehicle для core/components/cookieconsent/.htaccess: существующий файл остаётся untracked и сохраняется. Защиту публичного MODX core настраивает владелец сайта; рекомендуется core вне webroot. Работают Apache (включая reverse proxy), nginx/PHP-FPM и другие серверы при подходящих правах PHP. HTTP клиент используется только для явного POST-теста, не для проверки защиты.

**Журналы могут содержать IP-адреса и технические сведения о посетителях. Ограничение HTTP-доступа к каталогу обеспечивает администратор сайта**

Обычная «Сохранить» применяет options/services/texts независимо от несохранённого поля каталога; каталог применяется только кнопкой включения журнала. Неизменённый недоступный log_dir или legacy config не блокирует остальные настройки. При изменении пути через API выполняется проверка; endpoint всегда проверяет путь при записи. Каталог должен существовать, быть каноническим, доступным PHP на запись, отличаться от самого DOCUMENT_ROOT. Traversal, symlink, hardlink и неregular audit/state файлы отклоняются. Администратор должен владеть каталогом и не допускать его конкурентной подмены непривилегированными пользователями.

JSONL, server IP/User-Agent, consent_id, месячная ротация, подавление повторных event_id и rate limiting сохранены. Старые журналы не удаляются. HMAC остаётся в серверных native private queue options; system setting содержит только origin/rate. ENV/private JSON priority совместим с beta7. Legacy action audit_protect оставлен как совместимый валидатор пути с ответом valid=true: он не создаёт правил и не подтверждает HTTP-защиту.

HTTP 200 + success=false — ошибка. UI локализует missing/not-directory/permissions/traversal/symlink/root/post/write/revision causes и сохраняет draft. Безопасный request_id/action/status помогают найти MODX log без вывода secret/draft. Back up DB/registry, runtime, настройки и журналы перед обновлением; native filesystem rollback не атомарен. Ограничения lifecycle остаются прежними.

## Category-only consent

В public preferences и preview ровно четыре категории: необходимые locked/disabled, analytics, marketing, external_content. Под каждой — один администраторский description, не генерируется список сервисов. При новом выборе категории включаются все **активные** её providers. Выключенный сервис не запускается. GTM требует все активные permissions; само marketing-согласие не отменяет эту защиту. Индивидуальные map load/revoke кнопки сохраняются, не разрешают другие карты/сервисы.

Provider fingerprints и schema1/2 аудит остаются внутренними. Новые committed records имеют model=categories_v1 и disclosed fingerprints. Старые records не переписываются при чтении: сохраняются consent_id/проверенные grants, banner просит review. Partial category отображается mixed; untouched Save сохраняет точный набор providers. Только явное изменение checkbox/Accept all расширяет разрешение. Добавленный/включённый позднее provider или смена fingerprint требуют review, не наследуют разрешение. Map choice раскрывает только выбранную карту и не считает прочие новые сервисы просмотренными. Cosmetic text/language edit не меняет fingerprints.

Прежняя матрица 256 internal grants проверяется через реальные legacy localStorage records и category-only Save, без скрытых DOM checkbox. Это не «тест пропущен»: каждый mask сравнивается с точным Network и provider set, включая GTM guard.

«Тексты»: один MODX language select, notice HTML source и названия/описания четырёх категорий (9 полей). Service text fields удалены из editor; legacy locale overrides остаются в DB и разрешаются как прежде. Stock RU/EN messages/buttons/a11y/service names берутся из package lexicons. Preview изолирован sandbox/CSP, без SDK/audit. Native context cache/OPcache ограничения beta7 сохраняются.

## Ограничения

Не проверено на production, неизвестных server routes/CDN aliases, HTTPS certificates, Firefox/WebKit/custom skins/других версиях PHP/MODX. Нативная частичная установка не атомарна; ENOSPC/power loss/DB outage/multi-node не аттестованы. Backup/restore обязателен. Для неподтверждённого public HTTP denial выбрать private directory. Никаких merge/deployment.
