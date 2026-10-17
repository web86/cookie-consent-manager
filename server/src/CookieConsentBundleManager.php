<?php
declare(strict_types=1);

/** Administrative builder. Frontend selection uses only MODX cached settings. */
final class CookieConsentBundleManager
{
    private const VERSION_KEY = 'cookie_consent.bundle_version';
    private const FILE = 'js/cookie-consent/cached-cookie-consent.min.js';
    private const HEADER = '// CookieConsentBundle ';
    private const RECIPE = 'peast-1.17.6-compact-es2020-v1';

    private static function manager($modx): bool
    {
        return $modx->context->get('key') === 'mgr' && $modx->user->isAuthenticated('mgr');
    }

    public static function rebuild($modx, bool $force = false): array
    {
        if (!self::manager($modx)) throw new RuntimeException('bundle_forbidden');
        return self::build($modx, $force);
    }

    /** Called only by the package's verification vehicle / CLI installer. */
    public static function install($modx, ?callable $synchronize = null): array
    {
        if (PHP_SAPI !== 'cli' && !self::manager($modx)) throw new RuntimeException('bundle_forbidden');
        return self::build($modx, false, $synchronize);
    }

    private static function metadata(string $file): ?array
    {
        if (!is_file($file)) return null;
        $stream = @fopen($file, 'rb');
        if (!$stream) return null;
        try { $line = fgets($stream, 512); } finally { fclose($stream); }
        if (!is_string($line) || !str_starts_with($line, self::HEADER)) return null;
        $meta = json_decode(substr($line, strlen(self::HEADER)), true);
        if (!is_array($meta) || !is_string($meta['fingerprint'] ?? null) || !preg_match('/^[a-f0-9]{64}$/D', $meta['fingerprint'])) return null;
        return $meta;
    }

    /** No JS/manifest access, file checks or SQL: use MODX's already loaded config. */
    public static function asset($modx): string
    {
        $version = (int)$modx->getOption(self::VERSION_KEY, null, 0);
        if ($version > 0) return self::FILE . '?v=' . $version;
        return '';
    }

    public static function status($modx): array
    {
        $version = (int)$modx->getOption(self::VERSION_KEY, null, 0);
        $dir = rtrim((string)$modx->getOption('assets_path'), '/') . '/js/cookie-consent/';
        $errorFile = $dir . 'cookie-consent.last-error.json';
        $attempt = is_file($errorFile) ? json_decode((string)@file_get_contents($errorFile), true) : null;
        require_once __DIR__ . '/CookieConsentAdapterInstall.php';
        return ['state' => is_array($attempt) ? 'error' : ($version > 0 ? 'ready' : 'fallback'),
            'built_at' => $version > 0 ? gmdate('Y-m-d\TH:i:s\Z', $version) : null, 'version' => $version > 0 ? $version : null,
            'preserved' => CookieConsentAdapterInstall::preserved($modx)];
    }

    /** Administrative install failure policy; never called by visitors. */
    public static function hasWorking($modx): bool
    {
        return (int)$modx->getOption(self::VERSION_KEY, null, 0) > 0
            && self::metadata(rtrim((string)$modx->getOption('assets_path'), '/') . '/' . self::FILE) !== null;
    }

    private static function manifest($modx): string
    {
        return rtrim((string)$modx->getOption('core_path'), '/') . '/components/cookieconsent/frontend-manifest.json';
    }

    private static function build($modx, bool $force, ?callable $synchronize = null): array
    {
        $assets = rtrim((string)$modx->getOption('assets_path'), '/') . '/';
        $dir = $assets . 'js/cookie-consent/';
        if ((!is_dir($dir) && !@mkdir($dir, 0755, true)) || realpath($dir) !== rtrim($dir, '/') || !is_writable($dir)) {
            throw new RuntimeException('bundle_directory');
        }
        $lockFile = $dir . 'cookie-consent.build.lock';
        if (is_link($lockFile)) throw new RuntimeException('bundle_directory');
        $lock = $synchronize !== null ? $modx->getOption('cookie_consent.install_lock') : null;
        $held = is_resource($lock);
        if (!$held) $lock = @fopen($lockFile, 'c');
        if (!$lock) throw new RuntimeException('bundle_directory');
        if (!$held && !flock($lock, LOCK_EX | LOCK_NB)) { fclose($lock); throw new RuntimeException('bundle_busy'); }
        try {
            if ($synchronize !== null) $synchronize();
            $manifest = json_decode((string)file_get_contents(self::manifest($modx)), true, 16, JSON_THROW_ON_ERROR);
            if (($manifest['tool'] ?? '') !== 'esbuild' || !is_array($manifest['inputs'] ?? null)) throw new RuntimeException('bundle_manifest');
            $sourceRoot = realpath($assets . 'js/cookie-consent');
            if ($sourceRoot === false) throw new RuntimeException('bundle_manifest');
            $sources = [];
            $hash = hash_init('sha256');
            hash_update($hash, self::RECIPE . "\0");
            // The same ordered manifest inputs drive frontend.mjs and installed PHP.
            foreach ($manifest['inputs'] as $path => $unused) {
                if (!str_ends_with($path, '.js')) continue;
                if (!preg_match('~^assets/js/cookie-consent/(?:[a-z0-9-]+/)?[a-z0-9-]+\.js$~D', $path) || str_ends_with($path, '.min.js')) throw new RuntimeException('bundle_manifest');
                $file = $assets . substr($path, strlen('assets/'));
                $real = realpath($file);
                if ($real === false || $real !== $file || !str_starts_with($real, $sourceRoot . '/') || !is_file($real)) throw new RuntimeException('bundle_manifest');
                $bytes = file_get_contents($real);
                if ($bytes === false) throw new RuntimeException('bundle_source');
                $sources[] = $bytes;
                hash_update($hash, $path . "\0" . strlen($bytes) . "\0" . $bytes . "\0");
            }
            if (!$sources) throw new RuntimeException('bundle_manifest');
            $fingerprint = hash_final($hash);
            $file = $assets . self::FILE;
            $old = self::metadata($file);
            if (!$force && $old && $old['fingerprint'] === $fingerprint && (int)$modx->getOption(self::VERSION_KEY, null, 0) > 0) {
                if (is_file($dir . 'cookie-consent.last-error.json')) @unlink($dir . 'cookie-consent.last-error.json');
                return self::status($modx) + ['rebuilt' => false];
            }
            require_once dirname(__DIR__) . '/vendor/peast/autoload.php';
            $source = "(()=>{if(window.web86CookieConsentFrontendInitialized)return;window.web86CookieConsentFrontendInitialized=true;\n" . implode("\n;\n", $sources) . "\n})();";
            $ast = \Peast\Peast::ES2020($source, ['strictEncoding' => true])->parse();
            $renderer = new \Peast\Renderer();
            $renderer->setFormatter(new \Peast\Formatter\Compact());
            $output = $renderer->render($ast) . "\n";
            // Fail closed if a renderer produces invalid JS. No regex minification.
            \Peast\Peast::ES2020($output, ['strictEncoding' => true])->parse();
            // Keep only the administrative source fingerprint in the file header.
            $meta = ['fingerprint' => $fingerprint];
            $setting = $modx->getObject('MODX\Revolution\modSystemSetting', ['key' => self::VERSION_KEY]);
            $previousVersion = $setting ? (int)$setting->get('value') : 0;
            $previous = is_file($file) ? file_get_contents($file) : null;
            if ($previous === false) throw new RuntimeException('bundle_source');
            if (!$modx->beginTransaction()) throw new RuntimeException('bundle_version');
            try {
                self::atomic($file, self::HEADER . json_encode($meta, JSON_THROW_ON_ERROR) . "\n" . $output);
                $version = time(); // The file is already published before state can switch.
                // time() has second precision: two immediate successful builds need distinct URLs.
                if ($version === $previousVersion) { sleep(1); $version = time(); }
                if (!$setting) {
                    $setting = $modx->newObject('MODX\Revolution\modSystemSetting');
                    $setting->fromArray(['key' => self::VERSION_KEY, 'xtype' => 'textfield', 'namespace' => 'cookie_consent', 'area' => 'consent'], '', true, true);
                }
                $setting->set('value', (string)$version);
                if (!$setting->save() || !$modx->commit()) throw new RuntimeException('bundle_version');
            } catch (Throwable $e) {
                $modx->rollBack();
                if ($previous !== null) self::atomic($file, $previous);
                else @unlink($file);
                throw $e;
            }
            $modx->setOption(self::VERSION_KEY, $version);
            // Native APIs, not the clearcache processor: neither invokes OnSiteRefresh.
            $modx->cacheManager->refresh(['system_settings' => []]);
            $modx->cacheManager->clean(['cache_key' => $modx->getOption('cache_resource_key', null, 'resource'),
                'cache_handler' => $modx->getOption('cache_resource_handler', null, $modx->getOption('cache_handler'))]);
            if (is_file($dir . 'cookie-consent.last-error.json')) @unlink($dir . 'cookie-consent.last-error.json');
            return self::status($modx) + ['rebuilt' => true];
        } catch (Throwable $e) {
            try { self::atomic($dir . 'cookie-consent.last-error.json', json_encode(['failed_at' => gmdate('c')], JSON_THROW_ON_ERROR)); } catch (Throwable $ignored) {}
            throw $e;
        } finally { flock($lock, LOCK_UN); fclose($lock); if ($held) $modx->setOption('cookie_consent.install_lock', null); }
    }

    /** Shared atomic publication; an expected hash/absence also guards adapter writes. */
    public static function atomic(string $file, string $bytes, string|false|null $expected = null): bool
    {
        $tmp = tempnam(dirname($file), '.cc-');
        if (!$tmp || dirname($tmp) !== dirname($file)) { if ($tmp) @unlink($tmp); throw new RuntimeException('bundle_write'); }
        try {
            if (file_put_contents($tmp, $bytes) !== strlen($bytes) || !chmod($tmp, 0644)) throw new RuntimeException('bundle_write');
            clearstatcache(true, $file);
            if ($expected === false && (file_exists($file) || is_link($file))) return false;
            if (is_string($expected) && (is_link($file) || !is_file($file) || (stat($file)['nlink'] ?? 0) !== 1 || hash_file('sha256', $file) !== $expected)) return false;
            if (!rename($tmp, $file)) throw new RuntimeException('bundle_write');
            return true;
        } finally { if (is_file($tmp)) @unlink($tmp); }
    }
}
