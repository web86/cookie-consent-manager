# Public service registry

PHP keeps the complete validated registry in `cookie_consent.services`: `name`,
`purpose`, technical configuration and optional `purpose_id`. Manager, text
resolution and banner/map rendering continue to use this full data. No stored
registry schema or setting migration is introduced.

`CookieConsentServiceRegistry::publicRegistry()` projects validated server data
for `CookieConsentAssets`. Each browser entry contains only `key`, `category`,
`enabled`, `loader`, `config` and, if present, `purpose_id`. The schema remains 1.
The compatibility JSON helper/data snippet uses the same projection. The package
does not install or call the retired `CookieConsentRegistry` element.

Public consumers:

| Field | Consumer |
| --- | --- |
| `key` | Stored provider permission, map selector, scoped `onAllowed`, audit provider key |
| `category`, `enabled` | Consent/category guards and enabled provider filtering |
| `loader`, `config` | Reviewed SDK adapter, ID/options, map URL validation |
| `purpose_id` | Stable purpose component of fingerprint v2, otherwise `key` |
| `name`, `purpose` | PHP text fallback and localized map templates; omitted from public JSON |

The browser accepts the minimal contract and strictly validated complete legacy
entries, for cached HTML/custom integrations. Partial display fields and unknown
fields are rejected. Legacy display fields are discarded from runtime service
objects. Adapter/category, ID, boolean, duplicate-key, Mail.Ru/VK collision and
map URL checks remain in place. No SDK URLs or executable settings are allowed.

Fingerprint v2 is unchanged: `JSON.stringify([2, loader, category,
purpose_id || key, privacy])`, using the same sorted configuration/defaults and
excluding `show_title`. Removing display text does not change permissions,
policy/category versions, consent ID, audit schema or language fallback.

Localized banner/settings content and map templates still arrive as PHP HTML;
JavaScript does not translate or replace them. Owner code should use service
keys/technical configuration, not display fields on `web86Providers.services`.
The documented ClientID chunk already follows this contract.

Upgrade through MODX Package Manager, preserving saved settings and elements;
clear ordinary MODX caches and refresh the page. The bundle URL changes with its
content hash. Back up settings/elements and consent logs before upgrading. Old
consent remains valid when its technical configuration is unchanged. This is
part of the unpublished 1.0.1 review candidate; main/v1.0.0 are unchanged.
