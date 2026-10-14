<?php
// Separate legacy integration. Do not mix with CookieConsentAssets/CookieConsentBanner.
if(!empty($modx->cookieConsentLegacyRendered))return '';
$modx->cookieConsentLegacyRendered=true;
$assets=$modx->runSnippet('CookieConsentAssets',$scriptProperties);if($assets!=='')$modx->regClientStartupHTMLBlock($assets);
$banner=$modx->runSnippet('CookieConsentBanner',$scriptProperties);if($banner!=='')$modx->regClientHTMLBlock($banner);
return '';
