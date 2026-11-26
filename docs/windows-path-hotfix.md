# Windows canonical path hotfix — 2026-11-26

## Cause and approach

MODX accepts `C:/OSPanel/home/site.local/core`, while Windows PHP realpath returns backslashes. Strict byte comparison therefore refused canonical directories. Equivalent checks later refused adapters, bundle sources, temporary files and uninstall targets. Unix-only absolute-path assumptions and parent loops stopping only at `/` also prevented Windows operation.

`CookieConsentPath` supplies one OS-aware policy. Separator spelling and drive-letter case are normalized only on Windows; Unix backslashes and case remain significant. Canonical equality does not fold component case, including on Windows (NTFS directories can be case-sensitive). Private-path exclusion additionally rejects possible Unicode case aliases conservatively; this may refuse a distinct case-sensitive sibling, but cannot grant it access. Each existing component, including every ancestor to a Unix/drive/UNC root, must match its actual realpath and must not be a link. Windows readlink targets are also checked (Windows readlink returns a full path even for ordinary directories). Missing destinations are checked through their nearest existing canonical directory. Dot segments, drive-relative/root-relative Windows paths, device namespaces, alternate data streams and Win32 device/trimming aliases are refused.

Spelling equality by itself never establishes filesystem safety. Namespace strings are compared only after the MODX roots are validated; manifest ownership and every destination still require filesystem validation. Core and assets are independently anchored to their configured roots, so they may be outside public_html.

## Updated checks

- Native preflight: MODX roots, namespace spellings, manifest, existing component trees, shipped destinations and parents, backup, bundle/services directories and temporary write probes.
- Native ownership and uninstall validator: real regular files, hashes/link counts, bundle lock, generated files and bounded inventory-derived pruning. Receipt schema and object ownership rules are unchanged.
- Adapter synchronization and legacy migration: originals/state/services, target publication and cleanup.
- Bundle builder and install bootstrap: canonical config, manifest/sources, containment, lock, temporary-file directory, replacement targets and actual writes.
- Private config, log directory, reader/logger, limiter state and install/recovery CLI: OS-aware absolute/canonical paths and terminating ancestor checks. Consent processing, settings schema and log format are unchanged.
- Build: allowlist ships the helper; the same source is embedded in native script vehicles and the uninstall file validator so uninstall does not depend on removed runtime PHP.

## Validation and release gate

Local macOS/PHP 8.5: both branches pass filesystem lifecycle, the 88-assertion PHP suite, the 58-assertion adapter-update suite and the 73-assertion bundle/cache suite. PHP lint and diff whitespace checks pass.

Linux container filesystem lifecycle: MODX 2 source passes PHP 8.2.34 and 8.3.36; MODX 3 source passes PHP 8.3.36. The suite reports platform skips, rather than treating unexecuted cases as passed.

Native Linux Package Manager: MODX 2.8.8 / MODX 3.2.4, PHP 8.2.34, both core and assets outside public_html. Fresh installation, adapter synchronization/JS build, configuration persistence, cache rebuild, reinstall, old-layout upgrade (MODX 2 baseline pl5; MODX 3 baseline pl7), HTTP audit acknowledgement, and native uninstall pass. User settings and element IDs survive upgrade; customer marker files and audit records survive uninstall. Stock CookieConsentAssets code changes on upgrade as expected between the old baseline and the current target branch.

Windows Server 2025 / PHP 8.3.37 GitHub Actions filesystem lifecycle passes on both branches, including actual symlinks, junctions, hardlinks, deny-write ACLs, mixed separators, full inventory copy, adapter synchronization, parser/build, settings persistence through a DB double and ownership-based removal. The only reported skip is a real UNC share; UNC spelling/root termination are exercised. Native Windows/Open Server Panel MODX Package Manager installation and Manager UI settings save have not been verified. No full Windows installation PASS is claimed.

The workflow adds PHP 8.3 Windows/Linux coverage and disables checkout CRLF conversion to preserve manifest checksums. Native Windows Package Manager + Manager UI settings save/rebuild + uninstall remains a release gate even if the filesystem workflow passes. No real UNC share is available locally. Custom case aliases that realpath changes are conservatively refused. Nonstandard reparse points and Open Server-specific ACL behavior require native verification. As before, destination directories must be administrator-owned: PHP path checks cannot make native transport copies immune to a malicious account concurrently renaming parent directories.

Existing release ZIPs and release metadata are not changed. Local builds retain the source metadata signatures (pl7/pl9) in isolated directories only, with no new release number assigned; they are test candidates, they are not published releases. New release numbers must be selected after acceptance. No Modstore publication or merge is performed.
