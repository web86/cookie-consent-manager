<?php
// Use uncached [[!CookieConsent]] once. Installation never edits templates/resources.
if (!empty($modx->cookieConsentRendered)) return '';
$modx->cookieConsentRendered=true;
try {
    require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentBannerRenderer.php';
    $data=CookieConsentSettings::read($modx);$language=CookieConsentBannerRenderer::language($modx);
    $assets=$modx->getOption('assets_url');$mode=$modx->getOption('mode',$scriptProperties,'live');
    $strings=CookieConsentTexts::resolve($data['texts'],$language,$data['registry']['services']);
    $banner=CookieConsentBannerRenderer::render($modx->getChunk('CookiesPopup'),$strings,$data['options'],$assets,$mode);
    $modx->regClientCSS($assets.'css/cookie-consent.css');
    $modx->regClientStartupHTMLBlock($modx->runSnippet('CookieConsentRegistry'));
    $modx->regClientHTMLBlock($banner);
    foreach(['i18n','provider-registry','consent-manager'] as $script){$url=htmlspecialchars($assets.'js/cookie-consent/'.$script.'.js',ENT_QUOTES,'UTF-8');$modx->regClientScript('<script src="'.$url.'" defer></script>',true);}
} catch(Throwable $e){$modx->log(modX::LOG_LEVEL_ERROR,'[CookieConsent] Invalid banner configuration');}
return '';
