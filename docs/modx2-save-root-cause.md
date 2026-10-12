# Save: root cause beta7 и Stage A

На настоящем локальном Apache MODX 2.8.8 воспроизведён HTTP 200 с success=false для /logs/cookies/, хотя DOCUMENT_ROOT/logs/cookies существует и HTTP запрещён. Причина: ввод трактуется как абсолютный filesystem path. Дополнительно audit_protect отказывает с audit_not_configured до настройки; после setup custom .htaccess даёт guard_review даже при реальном 403.

Stage A: явные modes site/absolute, site разрешается относительно настоящего DOCUMENT_ROOT; канонический абсолютный путь хранится в setting. Custom .htaccess не заменяется и не требует байтового совпадения. Безопасность подтверждается HTTP probes и canonical/symlink/hardlink/traversal checks. nginx/CDN/unknown остаются неподдержанными для public directories.

Save с заполненным публичным каталогом без audit config, Save без журнала и единый enable с реальным POST→JSONL прошли. Интерфейс показывает конкретную причину, учитывает success=false даже при HTTP 200. Journal actions находятся на вкладке Журнал; Main только TTL/buttons/reconsent. Stock-copy инструкции оставлены в upgrade docs.

Это локальное воспроизведение механизма из задания; доступ к production не использовался. Рабочие журналы не удалялись. Машинные доказательства: .local/category-evidence/baseline-save.json и save-results.json (в итоговом отчёте публикуется безопасная агрегация).
