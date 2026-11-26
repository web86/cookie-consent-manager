# Filesystem compatibility regression

Run `php tests/paths/filesystem.php` with PHP 8.1+ and dom/json/mbstring.
The GitHub workflow runs PHP 8.3 on Windows and Linux for both maintained branches.

This suite uses actual files and the actual preflight, adapter synchronization, JS parser/builder and transport ownership implementation. Only MODX persistence/cache APIs are doubles. It copies the full transport inventory, saves the bundle version, repeats the upgrade action, and removes owned files while retaining a modified adapter and log directory. It is **not** a native MODX Package Manager or Open Server Panel installation test.

Coverage includes mixed separators on Windows, drive roots/letters, UNC spelling/root termination, private core and external assets, existing and missing directories, unwritable targets (Windows deny-write ACL / Unix permissions), traversal, directory symlinks, Windows junctions, hardlinks and atomic publication. Windows junction creation is mandatory. Symlink tests report a skip if the account lacks the privilege. A real UNC share is tested only when `CC_TEST_UNC_DIRECTORY` names an existing canonical directory; otherwise it is explicitly skipped. On Unix a literal backslash remains part of a filename.

Temporary files are created in a random directory under the real system temporary directory. Cleanup never follows symlinks/junctions created by the fixture. Do not run tests against production directories.

Before releasing, test native install and upgrade on Windows/PHP 8.3 (preferably Open Server Panel), Manager settings save/rebuild and native uninstall, including relocated core/assets and a real UNC share if supported. A passing filesystem job alone does not satisfy that release gate.
