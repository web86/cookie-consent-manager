<?php
// Compatibility data snippet. No translation dictionary; static text belongs to PHP markup.
try {
    require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentBannerRenderer.php';
    $data=CookieConsentSettings::read($modx);
    $language=CookieConsentBannerRenderer::language($modx);
    $json=CookieConsentTexts::safeJson(CookieConsentServiceRegistry::publicRegistry($data['registry']));
    $public=CookieConsentTexts::safeJson(['locale'=>$language]);
} catch (Throwable $e) {
    $modx->log(modX::LOG_LEVEL_ERROR,'[CookieConsent] Invalid public configuration');
    $json='{"schema":1,"services":[]}';$public='{}';
}
return '<script type="application/json" id="cc-service-registry">'.$json.'</script><script type="application/json" id="cc-public-config">'.$public.'</script>';
