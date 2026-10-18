# CookieConsentManager — первый публичный выпуск MODX 2

**Этот отчёт относится к предыдущему кандидату. Актуальный ZIP и GO после исправления namespace-only preflight — в [отчёте исправления](modx2-preflight-fix.md).**

Область выпуска изменена прямым заданием пользователя: новый продукт без существующих установок. Историческая миграция `cookieconsent` не поддерживается и не проверяется; совместная установка официального transport другого дополнения не является release gate. Предыдущий NO-GO по этим двум причинам закрыт как не входящий в требования.

Рабочая ветка: `codex/modx2-cookieconsentmanager`, исходный review commit `0444cda18333e7399eedd7665331e44922bbeec9`. Целевой native transport `cookieconsentmanager-1.0.8-pl4`. Совместимость MODX `>=2.8.4,<3.0.0`, PHP `>=8.1.0`.

## Минимальная реализация

- Техническое имя пакета и vehicle GUID prefix: `cookieconsentmanager`.
- Приватный код, manifest и оригиналы адаптеров: `core/components/cookieconsentmanager/`.
- Manager и HTTP endpoints: `assets/components/cookieconsentmanager/`.
- Категория новых элементов: `CookieConsentManager`; она отличается от известной чужой `cookieconsent` при регистронезависимой collation.
- Namespace `cookie_consent` сохранён. Он отличается от чужого `cookieconsent` и обеспечивает действующие настройки `cookie_consent.*`, lexicon topic и Manager routing.
- Сниппеты `CookieConsent`, `CookieConsentAssets`, `CookieConsentBanner`, `CookieConsentMap`, `CookieConsentVideo`, чанк `CookiesPopup`, API `window.web86CookieConsent`, `onAllowed()` и `mountEmbeds()` сохранены.
- Публичные исходники адаптеров `assets/js/cookie-consent/services/`, рабочая JS-сборка и CSS остаются на своих путях. Они не совпадают с известными чужими `components/cookieconsent/`.

Из preflight удалены распознавание старого component-каталога, чтение прежнего Version/manifest для миграции и предупреждение о ручной работе со старым package record. Удалены импорт старого `adapter-checksums.json` и позднее переключение namespace. Namespace создаётся обычным native object vehicle с правильными путями. Нет uninstall старых пакетов, новых таблиц, отдельного мигратора или alias layer.

Обычные безопасные обновления внутри нового продукта сохранены: SHA256-state новых установок, сохранение изменённых/удалённых public adapters, Manager-only сборка, lock, atomic publication и fallback. При утрате SHA256-state неизвестные файлы сохраняются консервативно; baseline из исторического manifest больше не импортируется.

## Проверки без повторения прежнего регресса

Результаты функционального регресса commit 0444cda сохранены в [историческом machine evidence](evidence/modx2-package-rename.json): 72 native/Manager/browser сценария, 2 004 assertions; PHP 8.1/8.2 — 36 suites, 2 358 assertions. Они подтверждают неизменённый visitor JS, RU/EN, Strict/Legacy × три положения, сервисы, Custom JS, карты/видео, callbacks, JSONL/CSV, ACL и административную сборку. Исторические migration-сценарии учитываются только как прошлые данные, а не новое обязательство выпуска.

Для упрощённого установщика проверяется новый ZIP на двух ранее подготовленных, но **не использованных для установки продукта** MODX-стендах: 2.8.4/PHP 8.2 и 2.8.8/PHP 8.1. До установки отдельно подтверждаются пустые package records и отсутствие canonical elements. Проверяются native upload/scan/install, отказ при занятом имени сниппета, сохранность контрольных файлов в известных чужих путях, независимая категория/namespace, Manager, reinstall, сохранение пользовательского адаптера и рабочего bundle после ошибки. Полная установка стороннего дополнения не выполняется.

Актуальные SHA256, числа новых проверок и итоговое GO/NO-GO записываются в `docs/evidence/modx2-first-public-release.json`. Первоначальный ZIP сохранён в `.local/package-rename/artifacts/first-public/` как исторический кандидат; более ранние ZIP с тем же именем остаются историческими внутренними артефактами.

Внешние SDK в браузерном стенде перехватываются: подтверждается инициирование загрузки и consent gating, а не доставка событий в реальные рекламные кабинеты. Предупреждения исходного MODX/xPDO сохранены в старой классификации; это не новые ошибки компонента.

Автоматическая публикация, Release, deployment и merge в `main` не выполняются.

## Итог

**GO для чистой установки и публикации в Modstore в согласованной области первого выпуска.** 8 новых native-сценариев / 72 assertions / 0 FAIL на двух чистых установках; повтор прежнего полного регресса не выполнялся.

SHA256: `8e1b096f2726f62cc7d94fbb183aa37523791b7448b60a38f3413a8f9449bcee`. 559027 bytes. Две native-сборки побайтово совпали. Во всём ZIP отсутствуют старые `components/cookieconsent/` и импорт `legacy_state`.
