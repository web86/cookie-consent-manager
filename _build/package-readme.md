# Cookie Consent Manager — private MODX 2 beta

This transport installs the CMP and files. It NEVER edits templates, connects trackers,
changes forms, creates tracking pixels or enables optional services.

First installation leaves every optional provider disabled. Existing system settings,
translations, customized elements, purpose IDs and private JSONL stay intact on upgrade.

After install open Extras → Cookie Consent Manager. Grant cookie_consent_manage to
only the intended mgr Access Policies. Connect the uncached CookieConsentRegistry,
i18n.js, provider-registry.js, consent-manager.js, CSS and CookiesPopup manually in a
staging template. Remove obsolete direct trackers/noscript and use inert map markup.

Audit is NOT configured until BOTH the private log directory and private audit config
are valid. A webserver env variable is optional, not assumed on shared hosting.
Use a private JSON config and cookie_consent.audit_config_file if env is unavailable.
Never paste the HMAC key or actual config into Manager texts, public files or Git.
The configure-audit.php CLI helper creates a private JSON file without printing secrets.

Uninstall preserves settings/translations/logs and namespace/element/permission data.
It removes only unmodified package-owned runtime files/menu, or restores pre-existing
manual files. Edited/untracked files are retained. Remove integration markup manually.
Any destructive purge of retained user data is a separate manual operator task.

Real SDK/GTM and production templates are NOT certified by this beta. Review first,
then staging with test accounts, then a separate production release decision.

This beta requires MySQL/MariaDB with transactional InnoDB MODX object tables. Other database engines are refused before changes. Published beta signatures are immutable: verify SHA256 and use a new release index for changed code. Reset PHP OPcache only through your hosting operator when required by its configuration.
