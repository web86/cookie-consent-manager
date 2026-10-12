# Историческая приёмка beta1 — superseded

Этот отчёт описывает прежний ledger-based transport. Актуальная упрощённая архитектура и результаты: [native beta5 acceptance](modx2-native-minimal-acceptance.md). Его rollback/private-state гарантии не относятся к beta5.

# Issue #1 — приёмка MODX 2 transport package

**Итог: PASS локальной приёмки; готово к code review и контролируемому staging после review. Production и реальные SDK не аттестованы.** Работа выполнена в `feature/modx2-transport-package`, база `10acb4e62d2a6f59e058fe356feef23bf4497c27`. Сначала опубликована `feature/modx2-manager-i18n` с исходной историей; main не объединялся и production не изменялся.

Implementation commit: `6bdbf2a394f2be6ba36febd188243b417c706a59`.

Дата: 2026-10-12. ТЗ: [Issue #1](https://github.com/web86/cookie-consent-manager/issues/1). Установка и сопровождение: [пошаговая инструкция](modx2-transport-package.md), [архитектура](modx2-transport-architecture.md). Обезличенные результаты каждого сценария и snapshots: [JSON evidence](evidence/modx2-transport-results.json), [пофайловый manifest ZIP](evidence/modx2-transport-zip-inventory.json).

## Артефакт

```text
.local/release/cookieconsent-0.1.0-beta1.transport.zip
SHA256: 7411cd0a999179433acea1b30bf27f31754be2b6cf38294610ccf015051a725e
```

Соседние файлы: `.transport.zip.sha256`, `.inventory.json`, `.zip-inventory.json`. В release-каталоге один ZIP для передачи оператору; артефакты вне Git и открытых Releases. beta2 и намеренно повреждённые beta97/98 находятся только в тестовом artifacts-каталоге, не являются поставкой.

Сборщик — **реальный `modPackageBuilder` локального MODX**, не zip-only installer. Проверены native manifest, 11 xPDOObjectVehicle, 38 runtime-файлов, 54 ZIP entries. Семь system-setting vehicles; fresh registry содержит семь optional services, все `enabled=false`, IDs пусты. User values из DB при build не читаются. Source inventory/checksums, private-path defaults и excludes проверены PHP-verifier; он использовал штатный PclZip из MODX (ZipArchive в fixture отсутствует). Две независимые сборки из окончательных исходников нормализованы и **побайтно совпали**, SHA совпадает с поставкой.

Native namespace/menu/snippet/chunk/settings, controller/class processors, assets/core/lexicons установлены автоматически. На clean fixture фактически 7 permission definitions для 7 policy templates, без пропусков/дублей; Access Policy data не менялась. Для входа оператора нужен разрешённый Manager session и явно выданное право cookie_consent_manage.

## Среда и метод

Три disposable MODX Revolution **2.8.8-pl**, Apache/PHP **8.2.34**, MariaDB 10.6/InnoDB, Playwright **1.62.1 / Chromium**, Python 3.9. Порты только loopback. Основной fixture сохраняет ручную M4-установку и её архивы; отдельные clean и publiccore fixtures установлены штатным MODX CLI setup. У clean/main core приватный вне DOCUMENT_ROOT; у publiccore core расположен внутри webroot и защищён Apache deny rules. Сайт/базы production не использовались.

Компонент ставился через authenticated **нативные HTTP processors настоящего Package Manager** (`upload`, `scanlocal`, `install`, `uninstall`), не через CLI installer компонента. Дополнительно Playwright прошёл реальный GUI: Package Management → Reinstall → Dependencies → Setup Options → Install → success. CLI test controls выполняли только подготовку, snapshots и fault injection. Старый CLI installer запускался лишь внутри унаследованного CMP regression-теста своей идемпотентности; runtime после package install не копировался через sync.php.

Перед финальной clean-приёмкой предыдущие файлы fixtures архивированы локально; сброшены только явно именованные disposable базы. Месячные журналы ручного fixture не удалялись. Финальные native тесты и затем вся прежняя регрессия относятся к ZIP указанной SHA. beta2 собран из того же runtime с новым release index: проверен настоящий native upgrade, markers/generation и versioned stock alternatives; это не аттестация будущей функциональности beta2.

## Нативные сценарии и сохранение данных

| Проверка | Статус | Фактическое доказательство |
|---|---|---|
| Clean install | PASS | 0 component settings → 7; install mode; CMP работает; SDK не включены; audit not configured |
| GUI Package Manager wizard | PASS | Зависимости и приватный checklist видны, пустой private-state input для private core, native install success |
| Reinstall/idempotence | PASS | Settings, element IDs/content, templates/resources/Access Policy hashes совпали; mode reinstall |
| beta1 → beta2 | PASS | mode upgrade; custom TTL=123, purpose_id, disabled flags, notice_html, tr translation сохранены |
| Customized CookiesPopup | PASS | Пользовательский snippet content не изменён; stock alternatives с suffix beta1/beta2 созданы отдельно |
| Ручная M4-миграция | PASS | mode manual_migration; registry/options/texts/log_dir сохранены; snippet/menu/namespace не дублированы; новые отсутствующие объекты добавлены |
| Реальное consent_id / browser storage / JSONL history | PASS | Actual accept-all → native upgrade → reload: полный сохранённый consent JSON совпал; архивные SHA совпали |
| Fresh/manual uninstall по умолчанию | PASS | Private config/JSONL/settings/texts/elements/ACL/browser identity сохранены; fresh runtime удалён, manual runtime восстановлен |
| Native REMOVE_PREEXISTING **numeric mode 1** | PASS | Отдельно испытан на clean и manual; данные/журналы сохранены, reinstall успешен |
| Active identity | PASS | Удалялась активная beta2; ledger связывает signature/generation |
| Superseded-version uninstall gate | NOT RUN | Отдельная попытка удаления предыдущей версии не запускалась |
| Missing manual backup | PASS | Native uninstall отказал до удаления runtime; DB/state/file hashes совпали; backup восстановлен тестом |
| Late corrupt payload beta98 | PASS | После частичной активации bytes/modes/objects откатились; native PM вернул failure; active state совпал |
| Intermediate vehicle beta97 | PASS | Ошибка после ранних native objects: namespace/settings откатились DB transaction; install false |
| Read-only / modified runtime | PASS | Refusal без изменения snapshots; пользовательские bytes не перезаписаны |
| MyISAM object table | PASS отказа | Реальная временная конверсия fixture chunks в MyISAM: preflight false, snapshots совпали; InnoDB восстановлен |
| Public core без private state / missing parent / read-only private state / public path | PASS отказа | Native install false, DB до/после совпала |
| Public core с explicit private state | PASS | Native install success; direct component и staged payload HTTP=403 |
| Private JSON без env | PASS | Env отсутствует; readiness source=setting; same-origin POST=200, JSONL IP/UA/CID; duplicate=409; bad Origin=403 |
| Неправильный private config | PASS | Missing/public PHP path/malformed private JSON: status invalid; receiver 503; public fallback не появился |
| Отсутствие secret leakage | PASS в испытанном scope | ZIP exclude/secret scan; no Origin/HMAC в Manager/public output; audit errors generic; конфиг вне webroot |
| Не менять страницы/формы/ACL grants | PASS | Hash snapshots templates/resources/Access Policy до/после native циклов совпали |

Snapshots включают SHA256 всех component setting values и element content с DB IDs, hashes templates/resources/policies, menu identities, ledger mode/signature/generation. Не включают plaintext settings, Origin/HMAC, credentials или IP. Каждый вызов snapshot и результат сравнения сохранён в evidence. Финальные modes: clean — reinstall/active/generation 11; publiccore — install/active/generation 1; manual — reinstall/active/generation 6. Конфигурации пользователей сравниваются отдельно от технических package markers, которые должны менять version/generation.

## Повторная матрица и сеть

| Набор | Сценариев/выполнений | Assertions | FAIL |
|---|---:|---:|---:|
| Native lifecycle + GUI | 6 | 87 | 0 |
| Native safety / hosting / migration | 13 | 103 | 0 |
| Actual visitor/history upgrade + manual uninstall | 4 | 47 | 0 |
| Дополнительный storage probe (повтор gate) | 1 | 2 | 0 |
| Numeric Remove preexisting mode | 2 | 52 | 0 |
| Pure version guard units | 7 | 7 | 0 |
| Browser matrix | 281 | 1161 | 0 |
| HTTP security/audit | 36 | 118 | 0 |
| Native Manager | 4 | 13 | 0 |
| CMP/i18n | 17 | 60 | 0 |
| Limited Manager permission | 1 | 4 | 0 |
| Provider privacy parameters | 4 | 17 | 0 |
| Intercepted live URLs/consent | 11 | 50 | 0 |
| PHP audit | Отдельный PHP-набор, без scenario count | 80 | 0 |
| PHP settings/HTML/i18n | Отдельный PHP-набор, без scenario count | 53 | 0 |
| **Итого выполнений / assertions** | **387** | **1854** | **0** |

Все **256** именованных providers-0…providers-255 выполнены, без пропусков/дублированных имён. Проверены ban/reject/save-none, category/provider combinations, Google/Yandex map placeholders и explicit map authorization/revoke, reload, TTL/policy, old cookie migration, failed audit, responsive/keyboard, dynamic registry, privacy parameter invalidation, translations/source sanitizer/preview, Google consent defaults и URL guards.

**4158 public mock HAR entries** финального набора относятся только к local origin. Это наблюдения HAR, включая cache/reload, не число TCP connections. Real-provider URLs в отдельном live-guard наборе перехватывались/исполняли локальные fixtures; реальные SDK не скачивались. Native Manager Gravatar попытки блокировались тестами и учитываются отдельно от публичной матрицы. Raw HAR/cookies/MODAUTH и несокращённые логи остаются вне Git.

HTTP/PHP security-наборы подтверждают Origin/Fetch Metadata/method/content type/schema/size validation, реальные IP из REMOTE_ADDR (arbitrary forwarded header игнорируется), UA, UTC, schema 1/2, duplicates/concurrent append, rate limit, unsafe/readonly paths и file errors вместо ложного HTTP 200. Старые monthly sentinels сохраняются при смене log_dir, install/upgrade/uninstall; prune отсутствует.

## Команды воспроизведения

Только из checkout с подготовленным disposable MODX/Docker, private compose.env и установленным Playwright. Fixtures/пароли вне Git. Для новой ручной базы использовать ранее описанный M4 local setup; не направлять тестовые controls на чужой сайт.

```sh
python3 _build/baselines.py
# В отдельном контейнере/local MODX; новый output каждый раз:
php _build/build.php "$LOCAL_MODX_WEBROOT" "$NEW_PRIVATE_OUTPUT" 1
python3 _build/normalize.py "$NEW_PRIVATE_OUTPUT/cookieconsent-0.1.0-beta1.transport.zip"
php _build/verify.php "$NEW_PRIVATE_OUTPUT/cookieconsent-0.1.0-beta1.transport.zip" "$LOCAL_MODX_CORE"
# Собрать также release index 2 в другом output и поместить тестовые ZIP в .local/artifacts.
python3 tests/transport/fail-package.py
python3 tests/transport/reset.py clean publiccore
node tests/transport/acceptance.mjs
node tests/transport/advanced.mjs
node tests/transport/roundtrip.mjs
node tests/transport/storage.mjs
# guards.php выполняется PHP CLI локального web container.

node tests/manager-i18n.mjs
node tests/manager-permissions.mjs
node tests/provider-parameters.mjs
node tests/http.mjs
node tests/browser.mjs
node tests/manager.mjs
node tests/live-guard.mjs
# tests/php.php и tests/manager-i18n-php.php: PHP CLI от www-data контейнера.
node tests/transport/uninstall-mode.mjs
node tests/transport/summary.mjs
```

Использован Compose с `--env-file .local/private/compose.env -f tests/local/compose.yaml -f tests/transport/compose.yaml`. Build/verify запускаются внутри web с `/opt/cc-source` source mount; output — `/opt/cc-private/...`. Для regression PHP результаты сохранялись в `.local/transport-evidence/audit-php.json` и `settings-php.json`; guard/ZIP/snapshot probes — в том же private evidence-каталоге. Summary требует эти результаты, release ZIP и финальные snapshots, отклоняет любой FAIL/неполную 256 matrix/чужой public origin.

## Найденные проблемы и исправления

1. MODX 2.8.8 игнорирует resolver false для preserved object: ранняя fault injection вернула ложный success при корректно откатившихся файлах. Активация перенесена в last native validator с abort flag; final corruption/intermediate failure tests дают реальный refusal.
2. В PHP Docker image отсутствуют Git и ZipArchive. Build больше не пытается молча получать baseline-хеши через отсутствующий Git: они экспортируются из фиксированных Git refs; verifier использует встроенный PclZip. Сам artifact остаётся native modPackageBuilder.
3. MODX нормализует snippet whitespace. Без нормализации stock snippet ошибочно считался customized и создавал лишнюю копию. Build/manual hashes приведены к native trimming; final manual migration сохраняет IDs и не создаёт дубликат.
4. Native GUI требует changelog при переходе к setup options, а constraints MODX разделяются запятой. Metadata исправлены; actual GUI wizard прошёл.
5. Во время экспериментальных пересборок одной beta signature OPcache сохранял старые validators с одинаковыми ZIP timestamps. Финальная clean приёмка выполнена после перезапуска disposable PHP. Опубликованные версии должны быть immutable; для изменённого релиза новая signature. Runtime PHP invalidate вызывается при atomic replacement.
6. Malformed приватный JSON должен считаться server configuration failure, а не bad client payload. Error преобразован в RuntimeException; final private-config test подтверждает 503, клиентский malformed JSON по-прежнему 400.
7. Ранний M4 disposable fixture содержал пустой PK menu artifact. Только этот известный тестовый artifact и экспериментальная stock-копия архивированы при восстановлении fixture; production cleanup в пакете нет. Final manual migration имеет один исходный menu и не добавляет дубликатов.
8. Ранние тесты останавливались также на несовпадении ожидаемой английской подписи readiness. Ожидания исправлены по реально отображаемому lexicon; конечный набор без FAIL. Установку fixture после placeholder config отличают по настоящему config.inc.php, а disposable DB создаётся явно до MODX setup.

## NOT RUN и staging gate

| Ветка | Статус | Ограничение |
|---|---|---|
| Реальная установка на PHP 7.4/8.0, PHP 8.1/8.3/8.4 или MODX 3/другой MODX 2 | NOT RUN | 7 pure version classifier cases — PASS; это не запуск иных runtimes |
| Отдельные missing-extension/namespace-conflict/symlinked package-state/renamed manual-menu/superseded-uninstall tests | NOT RUN | Код отказывает/сохраняет по design; отдельные native сценарии не выполнены |
| Real nginx / control panel shared hosting / different web/static worker users | NOT RUN | Env-less configuration и public/private core испытаны на Apache fixture; проверить server protection/asset permissions на staging |
| SQL Server / другие engines | NOT RUN, unsupported beta | MyISAM refusal реально PASS; beta допускает только InnoDB MySQL/MariaDB |
| Real ENOSPC, power loss, DB outage, multi-node concurrent package install | NOT RUN | Испытаны readonly и controlled late/intermediate failure; это не инфраструктурная аттестация |
| Реальные Google/Yandex SDK, GTM container contents, existing third-party cookies | NOT RUN | Interception/mock подтверждают gating нашего loader; поведение реальных vendor scripts требует staging |
| Production templates/forms/customer data | NOT RUN | Только disposable fixtures; production integration/deployment/merge не выполнялись |
| Staging deployment | NOT RUN | Следующий шаг после code review и отдельного разрешения |

Рекомендация: **GO для review**, затем ограниченный staging с backup и проверкой restore, владельцев/HTTP защиты private dirs/core, реального audit POST/JSONL и согласованного подключения шаблона. Реальные SDK включать вручную по одному; GTM проверять на уровне каждого тега и consent requirements. Production GO не выдаётся до этого gate. Юридическая достаточность текста/категорий и политика хранения остаются отдельным решением владельца.
