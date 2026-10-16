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
        // A cache directory problem must not make a working prebuilt install fail.
        try {
            require_once __DIR__ . '/CookieConsentBundleManager.php';
            CookieConsentBundleManager::install($modx);
        } catch (Throwable $e) {
            $modx->log(modX::LOG_LEVEL_ERROR, '[CookieConsent] Adapter warmup failed; using previous/prebuilt bundle (' . get_class($e) . ').');
        }
    }
}
