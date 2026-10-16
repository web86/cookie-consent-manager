<?php
// OnSiteRefresh may also fire from web/API processes: never build in those.
if ($modx->event->name !== 'OnSiteRefresh' || $modx->context->get('key') !== 'mgr' || !$modx->user->isAuthenticated('mgr')) return;
try {
    require_once MODX_CORE_PATH . 'components/cookieconsent/src/CookieConsentBundleManager.php';
    CookieConsentBundleManager::rebuild($modx);
} catch (Throwable $e) {
    $modx->log(\MODX\Revolution\modX::LOG_LEVEL_ERROR, '[CookieConsent] Adapter build failed; previous bundle retained (' . get_class($e) . '). Rebuild in component settings.');
}
