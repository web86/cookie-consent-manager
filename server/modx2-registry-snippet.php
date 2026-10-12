<?php
// MODX snippet CookieConsentRegistry. Install without the opening PHP tag.
// Run uncached: [[!CookieConsentRegistry]]. No public configuration writer.
try {
    require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentServiceRegistry.php';
    $setting=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.services']);
    $json=CookieConsentServiceRegistry::publicJson($setting ? (string)$setting->get('value') : '');
} catch (Throwable $e) {
    $modx->log(modX::LOG_LEVEL_ERROR,'[CookieConsent] Invalid service registry');
    $json='{"schema":1,"services":[]}'; // Fail closed; do not fall back to live defaults.
}
return '<script type="application/json" id="cc-service-registry">'.$json.'</script>';
