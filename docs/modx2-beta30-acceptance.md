# beta30 — Manager config serialization: приёмка

Дата: 2026-10-13. Ветка `feature/modx2-frontend-bundle`, база beta29 `ced9884`, implementation `764e635`.

**GO только для review. 370 проверок / 2185 assertions / 0 FAIL.** Настоящий локальный MODX **2.8.8-pl**, PHP **8.2.34**, MariaDB **10.6**, Apache, Playwright Chromium **1.62.1**. Merge/deployment не выполнялись.

Immutable ZIP: `cookieconsent-0.1.0-beta30.transport.zip`.

SHA256: `065c4ebdcc3c8a6cd2b3fb7e8ac74d6af3fbc8ba06301c058d8ee75722e22c48`.

## Root-cause analysis

Фактическая цепочка до исправления: **DB JSON object `{}` → PHP `stdClass` → native `modError::toArray()` → PHP array → Manager GET `[]` → draft JS Array → POST `[]` без ID**.

PHP read/registry validation работают правильно. MODX `modProcessor::success()` вызывает `modError::process()`, который перед возвратом response делает recursive `toArray()`, включая `get_object_vars()` для stdClass. Пустые объекты теряют object representation на этом этапе. Manager clone не создавал ошибку типа, а сохранял пришедший массив. ID/boolean assignment добавляли named array properties; сериализация массива их пропускала. Локальная проверка ID видела эти свойства, поэтому Save отправлялся, а сервер справедливо возвращал validation.

На beta29 введён корректный формат `G-BETA30TEST`, GA4 включён, нажата настоящая Save. Захвачен реальный POST: `enabled:true`, `config:[]`, ID отсутствует. Реальный ответ — validation. **PASS у reproduction означает подтверждение ожидаемого дефекта; успешного beta29 Save здесь не было.** Проверены DB/read/processor типы и браузерный GET, 6 assertions.

## Исправление

Локальный helper в существующем Manager обрабатывает registry при первоначальном draft и после ответа Save. Пустой массив без named properties превращается в `{}` до clone. Непустой массив, null или scalar не преобразуется; ошибка блокирует редактирование/перезапись. Plain objects сохраняют ID и boolean values. PHP schema/Settings/processor/core не изменены. Нет отдельного normalization module, плагина, глобального события или lifecycle.

Near-field errors RU/EN показывают required/invalid ID и ожидаемый формат. Save переводит пользователя к нужному полю, раскрывает settings, фокусирует input и не отправляет invalid POST. Корректировка ID убирает ошибку/aria-invalid. Отключённый сервис может иметь пустой config без ID.

## PASS/FAIL

| Проверка | Статус | Подтверждение |
|---|---|---|
| Beta29 reproduction / точный этап смены типа | PASS — defect reproduced | Native MODX serializer, настоящий GET, поле и POST Save; expected validation |
| GA4 ID / POST / сохранение / reload | PASS | G-... в реальном input; POST config object с id и flags; stored setting и reload совпали |
| Ads / GTM / Mail.Ru / Яндекс.Метрика | PASS | Реальные поля, enable, Save, DB setting, reload; Mail.Ru сохраняет leading zero как string |
| Existing `{}` и legacy `[]` | PASS | По пять E2E на каждую исходную форму; transport GET возвращает arrays, каждый POST содержит objects |
| Несколько Save без reload | PASS | Пять providers настроены последовательно в том же draft; empty configs из каждого Save response снова пригодны для editing |
| Boolean options true/false | PASS | Все options GA4/Ads/Яндекс.Метрики изменены обоими способами; POST values boolean, reload checked values совпали |
| Required/invalid ID возле поля RU/EN | PASS | Пять providers на обоих языках, aria-invalid/describedby, focus, details open, 0 invalid Save POST |
| Непустые arrays / null / scalar | PASS | PHP validation и client-corrupted GET; без молчаливой потери значений или замены stored setting |
| Целевая browser E2E suite | PASS | 16 сценариев / 295 assertions |
| PHP compatibility/strict validation | PASS | 49 assertions; old empty representations, ID/boolean types, malformed configurations refused |
| Native beta29 → beta30 | PASS | 88 assertions: settings, configs/keys/JSONL, IDs/metadata, Registry preserved |
| Native fresh install | PASS | Пять canonical source, шесть settings, без Registry, MODX 2.8.8-pl |
| Manager UI beta29 / preview / responsive | PASS | 6 сценариев / 62 assertions; прежний full-width Log/preview contract сохранён |
| Settings/text/HTML/i18n через Manager | PASS | 17 сценариев / 60 assertions, translate keeps consent; privacy change требует нового permission |
| SDK boolean parameters / strict GTM | PASS | 4 intercepted сценария / 17 assertions; SDK responses fulfilled local stubs |
| 256 комбинаций consent / maps / storage | PASS | 281 browser scenario / 1419 assertions; 3298 mock HAR requests, 0 external |
| PHP receiver / ACK / JSONL / IP-UA / security | PASS | 37 HTTP сценариев / 121 assertions, Origin/replay/rate/concurrency/path/file guards |
| Scope/runtime/build | PASS | Четыре изменённых runtime-файла, 53 installed hashes, два byte-identical ZIP, syntax checks |

Первый checkbox test ожидал explicit true для неизменённого default=true поля. Это неверное ожидание: прежний Manager не записывает untouched defaults. Тест исправлен на фактическое переключение каждого checkbox, затем повторён полностью. Такое отсутствие default-поля не выдаётся за ошибку сериализации. Final rows отражают завершённый повторный прогон.

## Совместимость и артефакт

Native package: **69 vehicles = 14 object / 53 file / 2 script**, **132 ZIP entries**. Канонические source/vehicles идентичны beta29. Settings vehicle UPDATE_OBJECT=false сохраняет существующие значения; нормализация UI не является автоматической миграцией DB.

Из runtime изменены только `manager.js`, `manager.css`, RU/EN lexicons. Public JS/CSS, PHP registry/Settings, fingerprint/consent/SDK/maps/GTM, Viewer, журнал и receiver побайтно совпадают с beta29. Существующий beta29 immutable ZIP не изменён. Reproduction/E2E меняют только disposable/local fixture settings и восстанавливают исходные значения; production не использовался.

## NOT RUN

- Production/staging установка/deployment и действительные hosting/CDN/browser asset caches.
- Реальные Google/Яндекс/Mail.Ru SDK и аккаунты/API keys, содержимое произвольного GTM container. Тестовые ID проверяют формат/сериализацию, не существование счётчика у провайдера.
- Firefox/WebKit, другие PHP/MODX, Windows/IIS/LiteSpeed.
- Полная Viewer/CSV/ACL/cache/reverse-proxy матрица и native uninstall/rollback failure injection в beta30 не повторены; прежние результаты — [историческая beta29 приёмка](modx2-beta29-acceptance.md).
- ENOSPC, power loss, DB outage и произвольные FS races. Универсальный atomic rollback не обещается.

[Safe results JSON](evidence/modx2-beta30-results.json), [ZIP inventory](evidence/modx2-beta30-zip-inventory.json), [root cause / инструкция обновления](modx2-beta30-config-fix.md).

Рекомендация: review, затем staging с backup, hard reload Manager и проверкой своих ID/flags. Production GO не выдаётся.
