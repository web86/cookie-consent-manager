# Обновление beta21 → beta23

beta23 — кандидат **только для review**, без выполненного staging/production deployment. [Приёмка и NOT RUN](modx2-beta23-acceptance.md).

Архив: `.local/release/cookieconsent-0.1.0-beta23.transport.zip` в checkout. SHA256:

```text
e3a97fc4f949e11f964404c4cae485076fff3f97f9bc4c3afccaa7883cfb06f2
```

1. Сделайте согласованную backup DB, включая native registry/key, canonical elements, их static sources, templates, изменённый runtime, private config и журналы. Сохраните beta21 ZIP и отдельную копию нужного native `core/packages/SIGNATURE/preserved.php` до reinstall. Native backups не заменяют полноценный backup; reinstall перезаписывает preserved snapshot.
2. Сверьте `shasum -a 256 cookieconsent-0.1.0-beta23.transport.zip` с указанным SHA и соседним `.sha256`. Старую beta21 не переименовывайте/не заменяйте. beta24/beta91 из `.local/artifacts` — тестовые, не устанавливать на рабочий сайт.
3. На отдельной staging-копии после review загрузите beta23 в **MODX Package Manager → Download Extras/Upload → Scan local → Install/Update**. Прочитайте штатное metadata warning: CODE WILL BE REPLACED для `CookiesPopup`, `CookieConsent`, `CookieConsentRegistry`, `CookieConsentMap`. Их IDs/names/types/properties сохраняются, source обновляется; static canonical становится DB-backed, его исходный файл не редактируется. Новые stock tree copies не создаются, старые копии не удаляются. Setup Options отсутствуют. После upgrade очистите cache MODX и согласованно обновите browser/CDN cache статических JS/CSS; проверьте, что загрузились файлы новой версии.
4. Проверьте сохранение своих settings, RU/EN texts/HTML и каждого service parameter; отсутствие прямых счётчиков/noscript pixels вне consent manager. Не изменяйте policy_version ради этого upgrade: прежние согласия сохраняются. Новые/изменённые providers не получают permission автоматически.
5. Откройте Manager именно по публичному каноническому HTTPS-адресу сайта. В **Cookie Consent Manager → Журнал → Настройка хранения** выбранный каталог должен уже существовать и быть writable PHP: site mode `logs/cookies/`/`/logs/cookies`, либо absolute mode `/absolute/private/path`. Компонент проверяет FS безопасность, а HTTP-защита каталога остаётся ответственностью администратора. Существующий `.htaccess` сохраняется.
6. Нажмите **«Проверить и включить журнал»**. Это явное действие использует показанный public origin Manager: у managed configuration исправляет старый origin, сохраняя key/rate; external environment/private JSON не переписывается. Если external config имеет другой origin, исправьте только `site_origin` в защищённой конфигурации вручную, сохранив ключ. Изменение иных полей формы применяется отдельным Save.
7. Успех означает совпадающий receiver JSON ACK/event_id и найденную matching monthly запись, а не только connector HTTP 200. Test event остаётся в журнале. Проверьте Audit Viewer с отдельным `cookie_consent_view_logs` permission; установка не выдаёт это право сама.
8. Проверьте категории для своей конфигурации: necessary всегда; каждая optional только с enabled service; draft toggles сразу меняют preview. Проверьте карты до consent (без внешних запросов), consent/refusal/save/reopen и отсутствие автоматического разрешения нового provider.

Если check не принят, сравните **receiver HTTP** и bounded reason, а не только **connector HTTP**:

- 301/302: используйте конечный публичный HTTPS origin. Redirect не будет автоматически пройден.
- 403 / `origin_forbidden`: сверить public browser origin с доверенной audit config; отдельный proxy/WAF 403 не выдаёт произвольное тело в UI.
- 404: проверить локальный `assets_url` и установленный public `assets/components/cookieconsent/audit.php`.
- 400: сверить версии установленного runtime/registry; отправлять test через компонент.
- 429: подождать rate-limit окно.
- 503: проверить MODX API-mode bootstrap, private config/key и доступ PHP к журналу. В серверных логах используются bounded class/reason/request_id, без secret/body.
- TLS: настроить корректный сертификат/цепочку/имя и доверенные CA PHP. **Не отключать verify_peer/verify_peer_name.**
- Network: PHP должен разрешать DNS, устанавливать исходящее соединение и делать self-request к публичному endpoint. Проверить hosting routing/egress/worker capacity с владельцем сервера. Не подменять URL на произвольный private endpoint.
- HTTP 200 + malformed ACK / event mismatch / record missing/invalid: проверить routing/cache/WAF/receiver и общий журнал между PHP workers; не считать настройку успешной.

Proxy должен сохранять публичный Host/Origin и корректно настраивать HTTPS для MODX на уровне доверенной конфигурации веб-сервера. Компонент не доверяет произвольным Forwarded headers и не переключает TLS off. При отдельном домене Manager или переписывании Host нужна согласованная архитектура/конфигурация владельца хостинга; это не проверено автоматически на вашем сайте.

При неуспешном check прежний log_dir восстанавливается с revision guard. Инициализированный ключ, явно исправленный managed origin и реально записанный test event остаются. В конфликте нужно перечитать настройки. Update/uninstall используют стандартные native vehicles, не собственный ledger и не обещают атомарный rollback при произвольных DB/FS failures. Для восстановления используйте согласованный backup; [canonical restore guide](modx2-canonical-elements.md) описывает hash-only preview и явное in-place восстановление.

Uninstall удаляет shipped runtime files, сохраняет settings/canonical elements/ключ/metadata/logs/untracked files. Перед uninstall отключите template calls; сохранённые элементы/меню могут ссылаться на удалённый код. Полное удаление данных — отдельное решение владельца сайта. Компонент не удаляет старые журналы.
