<?php
declare(strict_types=1);

/** Package originals are private. Only this administrative hook writes services/. */
final class CookieConsentAdapterInstall
{
    private const PREFIX = 'assets/js/cookie-consent/services/';
    private const STATE = 'adapter-checksums.json';

    private static function hashes(array $manifest): array
    {
        if (($manifest['tool'] ?? null) !== 'esbuild' || !is_array($manifest['inputs'] ?? null)) throw new RuntimeException('adapter_manifest');
        $result = [];
        foreach ($manifest['inputs'] as $path => $hash) {
            if (!str_starts_with($path, self::PREFIX)) continue;
            if (!preg_match('~^assets/js/cookie-consent/services/[a-z0-9-]+\.js$~D', $path) || !is_string($hash) || !preg_match('/^[a-f0-9]{64}$/D', $hash)) throw new RuntimeException('adapter_manifest');
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
            if (!is_string($version) || !preg_match('/^[a-zA-Z0-9.-]{1,100}$/D', $version) || !is_array($hashes) || self::hashes(['tool'=>'esbuild','inputs'=>$hashes]) !== $hashes) throw new RuntimeException('adapter_state');
        }
        if ($state['current'] !== null && !isset($state['versions'][$state['current']])) throw new RuntimeException('adapter_state');
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
        $core = rtrim((string)$modx->getOption('core_path'), '/') . '/components/cookieconsent/';
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
            // A malformed/missing legacy manifest is never used to guess ownership.
            try {
                $previous = self::hashes($snapshot['manifest'] ?? []);
                $oldVersion = $snapshot['version'] ?? 'legacy';
                if (!preg_match('/^[a-zA-Z0-9.-]{1,100}$/D', $oldVersion)) $oldVersion = 'legacy';
                $state['versions'][$oldVersion] = $previous;
                $state['current'] = $oldVersion;
            } catch (Throwable $ignored) {}
        }
        if (isset($state['versions'][$version]) && $state['versions'][$version] !== $current) throw new RuntimeException('adapter_version_collision');
        $known = $state['current'] !== null || !empty($snapshot['fresh']);
        $previous = [];
        // Retain the last shipped baseline even when a path disappears from a release.
        foreach ($state['versions'] as $hashes) $previous = array_replace($previous, $hashes);
        if ($state['current'] !== null) $previous = array_replace($previous, $state['versions'][$state['current']]);
        $dir = $assets . 'js/cookie-consent/services';
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
        CookieConsentBundleManager::atomic($statePath, json_encode($state, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT) . "\n");
        if ($report['conflicts']) $modx->log(\MODX\Revolution\modX::LOG_LEVEL_WARN, '[CookieConsent] Adapter update conflicts: ' . count($report['conflicts']) . '; user files retained.');
        return $report;
    }

    public static function preserved($modx): int
    {
        try {
            $state = self::state(rtrim((string)$modx->getOption('core_path'), '/') . '/components/cookieconsent/' . self::STATE);
            $report = $state['report'] ?? [];
            return count($report['modified'] ?? []) + count($report['deleted'] ?? []) + count($report['unknown'] ?? []);
        } catch (Throwable $ignored) { return 0; }
    }
}
