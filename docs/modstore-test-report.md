# cookieconsentmanager-1.0.8-pl7 release verification

Result: PASS. Local branch `codex/modx2-modstore-fixes`, based on `4ba4ef4`. No push or publication.

- Immutable transport ZIP: `cookieconsentmanager-1.0.8-pl7.transport.zip`.
- SHA-256: `f8ba51ffb572fc2a0d250916e170689abeb1b91e673e283d8d19787c7221072a`.
- Two independently built, normalized ZIPs are byte-identical. Native composition verification and 1,426 static assertions pass.
- Four compatibility combinations for this product (two CMS versions × PHP 8.1.34/8.2.34) pass upgrades from the requested previous candidate. Two have relocated assets/core; all have the real current CMS runtime.
- An additional fresh final-candidate CMS with relocated assets/core passes clean install. Earlier exploratory clean installs covered the four compatibility combinations before the final path-display/fallback-order refinements.
- Strict/Legacy × bottom/right/left, consent save/change/reload, analytics/ads/custom script gates, maps and all three video providers pass in Chromium. SDK/iframe responses are intercepted.
- Real authenticated Manager force-rebuild and native clearcache processor pass.
- Ordinary HTTP checker posts to the configured endpoint and finds the acknowledged event ID in the audit log; invalid method/content/origin/payload are rejected. Bootstrap failure gives generic 503 JSON without internal paths.
- Upgrade preserves exact edited-adapter/custom-adapter SHA-256 and historical baselines. An intentionally broken adapter preserves the previous bundle during migration; repair plus reinstall succeeds. Repeat installs create no adapter copies.
- Restore dry-run/apply handles exactly six existing native elements; settings and IDs remain unchanged. Fresh installations without backups refuse restoration safely.
- Native uninstall preserves edited/custom adapters, unknown files and audit log hashes, and removes the generated bootstrap plus package runtime.
- PHP 8.1/8.2: 202 shipped PHP sources lint; bundle suite 73 assertions and adapter/migration suite 58 assertions pass with Node unavailable during the PHP build. Host regression suite: 22 suites, zero failures.

Evidence: `docs/evidence/modstore/`; harness: `tests/modstore/`. Original historical evidence files were retained unchanged. Old path literals remain only where needed for migration, legacy fixtures or historical records; installed frontend URLs use component directories.

Limitations: real vendor delivery/video playback is not certified by intercepted load-gating tests. Existing compiled-Fenom/pdoTools limitations were not changed. MODX 2.8.4 with PHP 8.2 emits an inherited xPDO dynamic-property deprecation in CLI; it is outside the component and does not break the tested flows. No component failures remain in the final matrix.

Local frontend CI: PASS; 19 focused immutable-baseline differential scenarios, 95 assertions, zero failures. Runtime URLs are normalized for the intentional move and the retired mock adapter is excluded from both fixtures.
