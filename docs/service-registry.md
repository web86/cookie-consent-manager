# Service Registry — MODX 2

Актуальная модель: **посетитель разрешает только три категории**, администратор управляет сервисами. Запуск каждого включённого сервиса следует исключительно действительному согласию назначенной категории. В новом выборе нет индивидуальных permissions. [Инструкция, архитектура, миграция и примеры](modx2-universal-services.md).

Registry schema 1 сохраняется:

```json
{"schema":1,"services":[{"key":"ga4_main","name":"Google Analytics 4","purpose":"Статистика посещений","purpose_id":"statistics","category":"analytics","enabled":false,"loader":"google_ga4","config":{"id":"G-EXAMPLE2026"}}]}
```

До 32 записей / 32768 байт JSON. Уникальный key `[a-z][a-z0-9_]{0,31}`, optional purpose_id `[a-z][a-z0-9_.-]{0,63}`. Обязательны key/name/purpose/category/enabled/loader/config. Неизвестные поля запрещены. enabled строго boolean; config объект. Название ≤100 байт, назначение ≤500 байт, непустой текст без control и HTML. Категория — analytics, marketing или external_content, никогда necessary.

| loader | recommended_category | config |
| --- | --- | --- |
| yandex | analytics | numeric id, webvisor/clickmap/trackLinks/accurateTrackBounce booleans |
| mailru | analytics | numeric id |
| google_ga4 | analytics | G-* id; send_page_view, allow_google_signals, allow_ad_personalization_signals |
| google_gtm | marketing | GTM-* id |
| google_ads | marketing | AW-* id; allow_ad_personalization_signals, restricted_data_processing |
| vk_ads | marketing | numeric id; не должен конфликтовать с активным Top.Mail.Ru |
| meta_pixel | marketing | numeric id |
| google_maps / yandex_maps | external_content | show_title boolean |
| custom_js | marketing | root-relative .js path or explicit HTTPS .js URL with optional query |
| mock_marketing | marketing | тестовый адаптер без production-интеграции |

Рекомендация не ограничивает категорию. Реальные SDK/iframe сохраняют host/path validation; дополнительные рекламные сигналы Consent Mode вычисляются отдельно от условия запуска. GTM tag-level checks настраивает владелец контейнера.

Публичная проекция сохраняет технические данные и legacy fingerprint v2 только для миграции прежних браузерных записей. Runtime не проверяет consent.providers. Поле purpose у custom_js проецируется для совместимости с промежуточным legacy-контрактом; новая актуальность определяется версиями категорий на серверном Save.

Изменение эффективного состава обработки увеличивает версии затронутых категорий; privacy config включает defaults, исключает cosmetic show_title. Имя/переводы/map_notice не вызывают reconsent. См. `CookieConsentSettings::categoryProcessing()`. Используйте штатный Save, а не прямую запись DB JSON.

Новый выбор categories_v2 и аудит schema3 не содержат provider grants. Исторические schema1/schema2 журналы и данные не переписываются. Миграция частичных прежних разрешений консервативно требует выбора всей затронутой категории, сохраняя другие категории и consent ID.
