# Cookie Consent Manager for MODX 3 — 0.1.0-beta3

- Register service registry JSON through native MODX 3 startup HTML blocks after resource parsing, preserving Fenom split/legacy rendering and consent fingerprints.
- Validate schema 2 consent grants against trusted persisted system category visibility and enabled services; hidden categories remain false while forged or incomplete grants are rejected.
- Preserve legacy audit schema, origin/replay/rate protection and native package lifecycle semantics.
- Beta candidate for manual staging acceptance on MODX 3.2.4; no stable release or production deployment.

# Cookie Consent Manager for MODX 3 — 0.1.0-beta2

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

- Вторая независимая native подпись для проверки beta1 → beta2 upgrade; frontend и формат согласий сохранены.


- Самостоятельная версия для MODX 3.2.4, PHP 8.1+ и xPDO 3, включая отключённые deprecated aliases.
- Исправлены native transport, маршруты Manager и выбор языка текущей сессии.


- Нативная установка и обновление через MODX Package Manager; сохранение настроек, переводов, параметров сервисов и метаданных элементов.

**Перед обновлением сделайте резервную копию:** пакет заменяет исходники CookiesPopup, CookieConsent, CookieConsentAssets, CookieConsentBanner и CookieConsentMap. Split-подключение Assets/Banner и legacy CookieConsent — альтернативы, их нельзя использовать одновременно. При обновлении со старых версий изменённая конфигурация Метрики требует повторного согласия; получение ClientID для форм вынесено в пользовательский пример. HTTP-доступ к журналам ограничивает владелец сайта.
