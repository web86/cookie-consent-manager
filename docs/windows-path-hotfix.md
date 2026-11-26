# Windows canonical path hotfix — 2026-11-26

## Cause and approach

MODX accepts `C:/OSPanel/home/site.local/core`, while Windows PHP realpath returns backslashes. Strict byte comparison therefore refused canonical directories. Equivalent checks later refused adapters, bundle sources, temporary files and uninstall targets. Unix-only absolute-path assumptions and parent loops stopping only at `/` also prevented Windows operation.

`CookieConsentPath` supplies one OS-aware policy. Separator spelling and drive-letter case are normalized only on Windows; Unix backslashes and case remain significant. Other component case is deliberately not folded, including on Windows (NTFS directories can be case-sensitive). Each existing component, including every ancestor to a Unix/drive/UNC root, must match its actual realpath and must not be a link. Windows readlink additionally rejects junction/reparse targets. Missing destinations are checked through their nearest existing canonical directory. Dot segments, drive-relative/root-relative Windows paths, device namespaces, alternate data streams and Win32 device/trimming aliases are refused.

Spelling equality by itself never establishes filesystem safety. Namespace strings are compared only after the MODX roots are validated; manifest ownership and every destination still require filesystem validation. Core and assets are independently anchored to their configured roots, so they may be outside public_html.

## Updated checks

- Native preflight: MODX roots, namespace spellings, manifest, existing component trees, shipped destinations and parents, backup, bundle/services directories and temporary write probes.
- Native ownership and uninstall validator: real regular files, hashes/link counts, bundle lock, generated files and bounded inventory-derived pruning. Receipt schema and object ownership rules are unchanged.
- Adapter synchronization and legacy migration: originals/state/services, target publication and cleanup.
- Bundle builder and install bootstrap: canonical config, manifest/sources, containment, lock, temporary-file directory, replacement targets and actual writes.
- Private config, log directory, reader/logger, limiter state and recovery CLI: OS-aware absolute/canonical paths and terminating ancestor checks. Consent processing, settings schema and log format are unchanged.
- Build: allowlist ships the helper; the same source is embedded in native script vehicles and the uninstall file validator so uninstall does not depend on removed runtime PHP.

## Validation and release gate

Local macOS/PHP 8.5: both branches pass filesystem lifecycle, the 88-assertion PHP suite, the 58-assertion adapter-update suite and the 73-assertion bundle/cache suite. PHP lint and diff whitespace checks pass.

Linux container filesystem lifecycle: MODX 2 source passes PHP 8.2.34 and 8.3.36; MODX 3 source passes PHP 8.3.36. The suite reports platform skips, rather than treating unexecuted cases as passed.

Native Linux MODX Package Manager validation and Windows CI results are recorded below as they become available. Windows/Open Server Panel native installation has not been verified locally. No full Windows installation PASS is claimed.

The workflow adds PHP 8.3 Windows/Linux coverage. Native Windows Package Manager + Manager UI settings save/rebuild + uninstall remains a release gate even if the filesystem workflow passes. No real UNC share is available locally. Custom case aliases that realpath changes are conservatively refused. Nonstandard reparse points and Open Server-specific ACL behavior require native verification. As before, destination directories must be administrator-owned: PHP path checks cannot make native transport copies immune to a malicious account concurrently renaming parent directories.

Existing release ZIPs and release metadata are not changed. Local transport builds are isolated test candidates; they are not published releases. New release numbers must be selected after acceptance. No Modstore publication or merge is performed.
