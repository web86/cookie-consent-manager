Cookie Consent Manager — native MODX 2 package

No Setup Options or package-state directory is required. After Install, open Extras → Cookie Consent Manager and configure the existing private audit log directory and private audit JSON path. Audit stays unconfigured until an actual same-origin POST is verified. No secrets or private audit configuration are created by installation.

Settings, translations, notice HTML, service parameters and consent logs are preserved. Active CookieConsentRegistry/CookiesPopup elements are NEVER overwritten. New *_package_VERSION stock copies are available for an explicit comparison/application by the administrator. Templates/forms/maps are not edited; optional services start disabled on a fresh install.

Back up DB/elements/templates, customized runtime, private config and JSONL before upgrading. Native file vehicles replace package-managed runtime files; direct edits to these files require backup/merge. MODX stores native preserved objects/files in core/packages, which must be protected as part of MODX. A partial file/ORM failure may leave a partial installation. There is no custom DB/FS atomic rollback or private lifecycle ledger.

Uninstall removes only the exact shipped runtime files. Settings, namespace/menu, elements, permission definitions, private config/JSONL and browser consent remain. Remove template connections first; retained menu/elements may refer to removed code. Full purge is a separate administrator decision. Do not run a superseded ledger-based beta uninstall over a newer native installation.
