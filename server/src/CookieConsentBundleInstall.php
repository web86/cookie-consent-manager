<?php
declare(strict_types=1);

/** One idempotent install hook shared by native PM and the CLI installer. */
final class CookieConsentBundleInstall
{
    public static function run($modx): void
    {
        $name = 'CookieConsentCacheBuild';
        if ($modx->getCount('modPlugin', ['name' => $name]) > 1) throw new RuntimeException('Duplicate cache plugin');
        $plugin = $modx->getObject('modPlugin', ['name' => $name]) ?: $modx->newObject('modPlugin');
        $source = file_get_contents(dirname(__DIR__) . '/plugins/cache-build.php');
        if ($source === false) throw new RuntimeException('Cache plugin source missing');
        $plugin->fromArray(['name' => $name, 'plugincode' => preg_replace('/^<\?php\s*/', '', $source), 'disabled' => false, 'static' => false]);
        if (!$plugin->save()) throw new RuntimeException('Cache plugin save failed');
        $criteria = ['pluginid' => $plugin->get('id'), 'event' => 'OnSiteRefresh'];
        if (!$modx->getObject('modPluginEvent', $criteria)) {
            $event = $modx->newObject('modPluginEvent');
            $event->fromArray($criteria, '', true, true);
            if (!$event->save()) throw new RuntimeException('Cache event save failed');
        }
        // Native preflight captured the old manifest before any file vehicles ran.
        // Synchronization and building share the same existing bundle lock.
        $synchronized = false;
        try {
            require_once __DIR__ . '/CookieConsentBundleManager.php';
            require_once __DIR__ . '/CookieConsentAdapterInstall.php';
            CookieConsentBundleManager::install($modx, static function () use ($modx, &$synchronized): void {
                CookieConsentAdapterInstall::synchronize($modx);
                $synchronized = true;
            });
        } catch (Throwable $e) {
            $reason = preg_match('/^[a-z_]{1,40}$/D', $e->getMessage()) ? $e->getMessage() : 'js_parse';
            $modx->log(modX::LOG_LEVEL_ERROR, '[CookieConsent] Install build failed; inspect component build status. reason=' . $reason);
            // A failed fresh installation cannot succeed without executable JS.
            // Native transport may already have copied files: no rollback claim.
            if (!$synchronized || !CookieConsentBundleManager::hasWorking($modx)) throw $e;
        }
    }
}
