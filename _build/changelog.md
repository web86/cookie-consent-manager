# Cookie Consent Manager 1.0.3-beta1 — staging candidate

- Rebuild the combined MODX 2 fixes with version 1.0.3, release beta, index 1 so native Package Manager ranks this candidate above installed stable 1.0.2.
- Preserve the exact runtime and canonical element sources from 1.0.2-beta1; no functional changes to Fenom handling, consent permissions or audit validation.
- Supersedes 1.0.2-beta1 for staging upgrades; independently rebuilt from native package metadata, not renamed.

# Cookie Consent Manager 1.0.2-beta1 — staging candidate

- Fix MODX 2 pdoTools/Fenom blank pages by registering the service registry JSON after resource parsing; preserve split and legacy integration.
- Validate schema 2 accept/accept_all against persisted system category visibility and enabled providers; hidden categories remain false and forged grants remain rejected.
- Preserve consent schemas/fingerprints, service configuration, translations, element metadata and existing audit data.
- Beta only: install on staging and verify templates, consent restoration and the actual audit endpoint before any production rollout.

# Cookie Consent Manager 1.0.0

## Возможности

- Независимое управление видимостью категорий согласия и настройками отдельных сервисов.
- Мультиязычный баннер и Manager с пользовательскими текстами, поиском журнала и экспортом CSV.

## Интеграции

- Поддержка Яндекс.Метрики, Top.Mail.Ru, GA4, GTM, Google Ads, VK Ads Pixel, Meta Pixel, Google Maps и Яндекс.Карт.
- Пользовательские JavaScript-интеграции через `onAllowed()` и безопасные заглушки iframe-карт до согласия.

## Безопасность

- Загрузка сервисов после разрешения, сохранённый выбор посетителя и отзыв согласия через общие настройки.
- Серверный аудит согласий с проверкой событий, защитой от повторной отправки и сохранением существующих журналов.

## Совместимость

- Нативная установка и обновление через MODX Package Manager; сохранение настроек, переводов, параметров сервисов и метаданных элементов.

**Перед обновлением сделайте резервную копию:** пакет заменяет исходники CookiesPopup, CookieConsent, CookieConsentAssets, CookieConsentBanner и CookieConsentMap. Split-подключение Assets/Banner и legacy CookieConsent — альтернативы, их нельзя использовать одновременно. При обновлении со старых версий изменённая конфигурация Метрики требует повторного согласия; получение ClientID для форм вынесено в пользовательский пример. HTTP-доступ к журналам ограничивает владелец сайта.
