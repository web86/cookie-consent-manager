<?php
// Contract: [[!CookieConsentAssets]] exactly once in head. No banner or suppression flags.
try {
    require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentSettings.php';
    try {
        $data=CookieConsentSettings::read($modx);
        $registry=CookieConsentTexts::safeJson(CookieConsentServiceRegistry::publicRegistry($data['registry']));
    }catch(Throwable $e){$modx->log(modX::LOG_LEVEL_ERROR,'[CookieConsent] Invalid public configuration');$registry='{"schema":1,"services":[]}';}
    $configuration='<script type="application/json" id="cc-service-registry">'.$registry.'</script>';
    $assets=(string)$modx->getOption('assets_url');$css='css/cookie-consent.min.css';$js='js/cookie-consent/cookie-consent.min.js';
    if(!is_file(MODX_ASSETS_PATH.$css)||!is_file(MODX_ASSETS_PATH.$js))throw new RuntimeException('Frontend bundle missing');
    $url=static fn($path)=>htmlspecialchars($assets.$path.'?v='.substr(hash_file('sha256',MODX_ASSETS_PATH.$path),0,20),ENT_QUOTES,'UTF-8');
    // Insert JSON after resource parsing: structural braces are valid JSON but Fenom syntax.
    // Legacy CookieConsent registers only the returned CSS/JS, so it cannot duplicate this block.
    $modx->regClientStartupHTMLBlock($configuration);
    return '<link rel="stylesheet" href="'.$url($css).'"><script src="'.$url($js).'" defer></script>';
}catch(Throwable $e){$modx->log(modX::LOG_LEVEL_ERROR,'[CookieConsent] Frontend assets unavailable');return '';}
