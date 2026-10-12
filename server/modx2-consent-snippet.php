<?php
// Use uncached [[!CookieConsent]] once in the shared template. No template edits on install.
if (!empty($modx->cookieConsentRendered)) return '';
$modx->cookieConsentRendered=true;
$assets=$modx->getOption('assets_url');
$registry=$modx->runSnippet('CookieConsentRegistry');
$modx->regClientCSS($assets.'css/cookie-consent.css');
$modx->regClientStartupHTMLBlock($registry);
$mode=$modx->getOption('mode',$scriptProperties,'live');$mode=$mode==='mock'?'mock':'live';
$banner=preg_replace('/data-cc-mode="(?:mock|live)"/', 'data-cc-mode="'.$mode.'"',$modx->getChunk('CookiesPopup'));
$banner=str_replace('data-cc-audit-url="/assets/components/cookieconsent/audit.php"','data-cc-audit-url="'.htmlspecialchars($assets.'components/cookieconsent/audit.php',ENT_QUOTES,'UTF-8').'"',$banner);
// Native parser revisits identical uncached tags. Register the banner once,
// instead of returning first/empty outputs that can replace one another.
$modx->regClientHTMLBlock($banner);
foreach(['i18n','provider-registry','consent-manager'] as $script) {
    $url=htmlspecialchars($assets.'js/cookie-consent/'.$script.'.js',ENT_QUOTES,'UTF-8');
    $modx->regClientScript('<script src="'.$url.'" defer></script>',true);
}
return '';
