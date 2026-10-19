<?php
// Compatibility data snippet. No translation dictionary; static text belongs to PHP markup.
try {
    require_once MODX_CORE_PATH.'components/cookieconsentmanager/src/CookieConsentSettings.php';
    $data=CookieConsentSettings::read($modx);
    $json=CookieConsentTexts::safeJson(CookieConsentServiceRegistry::publicRegistry($data['registry']));
} catch (Throwable $e) {
    $modx->log(modX::LOG_LEVEL_ERROR,'[CookieConsent] Invalid public configuration');
    $json='{"schema":1,"services":[]}';
}
return '<script type="application/json" id="cc-service-registry">'.$json.'</script>';
