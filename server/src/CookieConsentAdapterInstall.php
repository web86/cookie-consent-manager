<?php
declare(strict_types=1);

/** Package originals are private. Only this administrative hook writes services/. */
final class CookieConsentAdapterInstall
{
    private const PREFIX = 'assets/components/cookieconsentmanager/js/cookie-consent/services/';
    private const STATE = 'adapter-checksums.json';

    private static function hashes(array $manifest): array
    {
        if (($manifest['tool'] ?? null) !== 'esbuild' || !is_array($manifest['inputs'] ?? null)) throw new RuntimeException('adapter_manifest');
        $result = [];
        foreach ($manifest['inputs'] as $path => $hash) {
            $path = str_replace('assets/js/cookie-consent/', 'assets/components/cookieconsentmanager/js/cookie-consent/', $path);
            if (!str_starts_with($path, self::PREFIX)) continue;
            if (!preg_match('~^assets/components/cookieconsentmanager/js/cookie-consent/services/[a-z0-9-]+\.js$~D', $path) || !is_string($hash) || !preg_match('/^[a-f0-9]{64}$/D', $hash)) throw new RuntimeException('adapter_manifest');
            $result[$path] = $hash;
        }
        if (!$result) throw new RuntimeException('adapter_manifest');
        return $result;
    }

    private static function state(string $path): ?array
    {
        if (!file_exists($path) && !is_link($path)) return null;
        self::regular($path);
        if (filesize($path) > 16777216) throw new RuntimeException('adapter_state');
        $state = json_decode((string)file_get_contents($path), true, 32, JSON_THROW_ON_ERROR);
        if (($state['schema'] ?? null) !== 1 || !is_array($state['versions'] ?? null) || !array_key_exists('current', $state)) throw new RuntimeException('adapter_state');
        foreach ($state['versions'] as $version => $hashes) {
            if (!is_string($version) || !preg_match('/^[a-zA-Z0-9.-]{1,100}$/D', $version) || !is_array($hashes) || count(self::hashes(['tool'=>'esbuild','inputs'=>$hashes])) !== count($hashes)) throw new RuntimeException('adapter_state');
        }
        if ($state['current'] !== null && !isset($state['versions'][$state['current']])) throw new RuntimeException('adapter_state');
        foreach ($state['versions'] as &$hashes) $hashes = self::hashes(['tool'=>'esbuild','inputs'=>$hashes]);
        unset($hashes);
        return $state;
    }

    private static function regular(string $path): void
    {
        clearstatcache(true, $path);
        if (is_link($path) || !is_file($path) || (stat($path)['nlink'] ?? 0) !== 1 || realpath($path) !== $path) throw new RuntimeException('adapter_path');
    }

    /** Called under the existing bundle lock, after native copies, before parsing JS. */
    public static function synchronize($modx): array
    {
        $core = rtrim((string)$modx->getOption('core_path'), '/') . '/components/cookieconsentmanager/';
        $assets = rtrim((string)$modx->getOption('assets_path'), '/') . '/';
        $manifest = json_decode((string)file_get_contents($core . 'frontend-manifest.json'), true, 16, JSON_THROW_ON_ERROR);
        $current = self::hashes($manifest);
        $version = $manifest['package_version'] ?? null;
        if (!is_string($version) || !preg_match('/^[a-zA-Z0-9.-]{1,100}$/D', $version)) throw new RuntimeException('adapter_manifest');
        $statePath = $core . self::STATE;
        $state = self::state($statePath);
        $snapshot = $modx->getOption('cookie_consent.install_snapshot', null, []);
        if ($state === null) {
            $state = ['schema'=>1, 'current'=>null, 'versions'=>[]];
            $old = $snapshot['manifest'] ?? null;
            if (is_array($old) && isset($old['package_version'])) {
                $state['versions'][$old['package_version']] = self::hashes($old);
                $state['current'] = $old['package_version'];
            }
        }
        if (isset($state['versions'][$version]) && $state['versions'][$version] !== $current) throw new RuntimeException('adapter_version_collision');
        $known = $state['current'] !== null || !empty($snapshot['fresh']);
        $previous = [];
        // Retain the last shipped baseline even when a path disappears from a release.
        foreach ($state['versions'] as $hashes) $previous = array_replace($previous, $hashes);
        if ($state['current'] !== null) $previous = array_replace($previous, $state['versions'][$state['current']]);
        $dir = $assets . 'components/cookieconsentmanager/js/cookie-consent/services';
        if (!is_dir($dir) && !@mkdir($dir, 0755, true)) throw new RuntimeException('adapter_directory');
        if (realpath($dir) !== $dir || !is_writable($dir)) throw new RuntimeException('adapter_directory');
        // Verify all originals before changing any public file. No directory scans.
        $originals = [];
        foreach ($current as $path => $hash) {
            $source = $core . 'adapters/services/' . basename($path);
            self::regular($source);
            $bytes = file_get_contents($source);
            if ($bytes === false || !hash_equals($hash, hash('sha256', $bytes))) throw new RuntimeException('adapter_integrity');
            $originals[$path] = $bytes;
        }
        self::relocate($modx, $state);
        // Preserve the old baseline before any writes; a partial copy can be retried.
        CookieConsentBundleManager::atomic($statePath, json_encode($state, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT) . "\n");
        $report = ['updated'=>[], 'added'=>[], 'modified'=>[], 'conflicts'=>[], 'deleted'=>[], 'unknown'=>[]];
        foreach ($current as $path => $hash) {
            $file = $assets . substr($path, strlen('assets/'));
            $name = basename($path);
            if (!file_exists($file) && !is_link($file)) {
                if (isset($previous[$path]) || !$known) { $report['deleted'][] = $name; continue; }
                if (CookieConsentBundleManager::atomic($file, $originals[$path], false)) $report['added'][] = $name;
                else $report['unknown'][] = $name; // Occupied while the package was copying.
                continue;
            }
            self::regular($file);
            $actual = hash_file('sha256', $file);
            if (hash_equals($hash, $actual)) continue;
            if (isset($previous[$path]) && hash_equals($previous[$path], $actual)) {
                if (CookieConsentBundleManager::atomic($file, $originals[$path], $actual)) { $report['updated'][] = $name; continue; }
                $actual = is_file($file) && !is_link($file) ? hash_file('sha256', $file) : false;
            }
            $report[isset($previous[$path]) ? 'modified' : 'unknown'][] = $name;
            if (isset($previous[$path]) && $hash !== $previous[$path]) $report['conflicts'][] = $name;
        }
        $state['versions'][$version] = $current;
        $state['current'] = $version;
        $state['report'] = $report;
        $state['layout'] = 2;
        CookieConsentBundleManager::atomic($statePath, json_encode($state, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT) . "\n");
        if ($report['conflicts']) $modx->log(modX::LOG_LEVEL_WARN, '[CookieConsent] Adapter update conflicts: ' . count($report['conflicts']) . '; user files retained.');
        return $report;
    }


    private static function relocate($modx, array &$state): void
    {
        if ($state['current'] === null || !empty($state['layout'])) return;
        $assets = rtrim((string)$modx->getOption('assets_path'), '/') . '/';
        $old = $assets . 'js/cookie-consent/';
        $next = $assets . 'components/cookieconsentmanager/js/cookie-consent/';
        if (!is_dir($old)) return;
        if (realpath(rtrim($old, '/')) !== rtrim($old, '/')) throw new RuntimeException('adapter_path');
        $state['legacy_layout'] = true;
        // Publish the fallback before any adapter move can fail.
        $bundle = $old . 'cached-cookie-consent.min.js';
        if (file_exists($bundle)) {
            self::regular($bundle);
            $bytes = file_get_contents($bundle);
            if (!str_starts_with($bytes, '// CookieConsentBundle ')) throw new RuntimeException('bundle_source');
            if (!file_exists($next . 'cached-cookie-consent.min.js')) CookieConsentBundleManager::atomic($next . 'cached-cookie-consent.min.js', $bytes, false);
            $state['legacy_bundle_sha256'] = hash('sha256', $bytes);
        }
        $services = $old . 'services';
        if (is_dir($services)) {
            if (realpath($services) !== $services) throw new RuntimeException('adapter_path');
            // User-created adapters also move; only regular JS files, never links or unrelated files.
            foreach (scandir($services) as $name) {
                if ($name === 'mock-marketing.js' || !preg_match('/^[a-zA-Z0-9_.-]+\.js$/D', $name)) continue;
                $from = $services . '/' . $name;
                self::regular($from);
                $to = $next . 'services/' . $name;
                if (file_exists($to) || is_link($to)) {
                    self::regular($to);
                    if (!hash_equals(hash_file('sha256', $from), hash_file('sha256', $to))) throw new RuntimeException('adapter_migration_conflict');
                    // Equal copies from an interrupted migration can be safely removed.
                    if (!unlink($from)) throw new RuntimeException('adapter_directory');
                } elseif (!rename($from, $to)) throw new RuntimeException('adapter_directory');
            }
        }

    }

    /** Cleanup is an install action after a successful build, using only exact shipped hashes. */
    public static function cleanupLegacy($modx): void
    {
        $core = rtrim((string)$modx->getOption('core_path'), '/') . '/components/cookieconsentmanager/';
        $assets = rtrim((string)$modx->getOption('assets_path'), '/') . '/';
        $state = self::state($core . self::STATE);
        if (empty($state['legacy_layout'])) return;
        $known = json_decode((string)file_get_contents($core . 'legacy-files.json'), true, 16, JSON_THROW_ON_ERROR);
        foreach ($known as $path => $hash) {
            if (!preg_match('~^assets/(?:js/cookie-consent/(?:[a-z0-9-]+/)?[a-z0-9.-]+\.js|css/cookie-consent\.min\.css)$~D', $path)) throw new RuntimeException('adapter_manifest');
            $file = $assets . substr($path, 7);
            if (!is_file($file) || is_link($file) || realpath($file) !== $file || (stat($file)['nlink'] ?? 0) !== 1) continue;
            if (hash_equals($hash, hash_file('sha256', $file))) @unlink($file);
        }
        // Remove only the exact migrated bundle after the replacement has built successfully.
        $old = $assets . 'js/cookie-consent/cached-cookie-consent.min.js';
        $next = $assets . 'components/cookieconsentmanager/js/cookie-consent/cached-cookie-consent.min.js';
        $state = self::state($core . self::STATE);
        if (is_file($old) && !is_link($old) && realpath($old) === $old && (stat($old)['nlink'] ?? 0) === 1 && is_file($next) && hash_file('sha256', $old) === ($state['legacy_bundle_sha256'] ?? null)) @unlink($old);
        $oldDir = $assets . 'js/cookie-consent/';
        $error = $oldDir . 'cookie-consent.last-error.json';
        if (is_file($error) && !is_link($error) && realpath($error) === $error && (stat($error)['nlink'] ?? 0) === 1) {
            $data = json_decode((string)file_get_contents($error), true);
            if (is_array($data) && array_keys($data) === ['failed_at'] && is_string($data['failed_at'])) @unlink($error);
        }
        $lock = $oldDir . 'cookie-consent.build.lock';
        if (is_resource($modx->getOption('cookie_consent.legacy_lock')) && is_file($lock) && !is_link($lock) && filesize($lock) === 0) @unlink($lock);
        foreach (['services/', 'embeds/', ''] as $part) {
            $dir = rtrim($oldDir . $part, '/');
            if (is_dir($dir) && !is_link($dir) && realpath($dir) === $dir && count(scandir($dir)) === 2) @rmdir($dir);
        }
    }

    public static function preserved($modx): int
    {
        try {
            $state = self::state(rtrim((string)$modx->getOption('core_path'), '/') . '/components/cookieconsentmanager/' . self::STATE);
            $report = $state['report'] ?? [];
            return count($report['modified'] ?? []) + count($report['deleted'] ?? []) + count($report['unknown'] ?? []);
        } catch (Throwable $ignored) { return 0; }
    }
}
