<?php
if(PHP_SAPI!=='cli'||!getenv('CC_DB_PASSWORD'))exit(1);
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();if($modx->getOption('dbname')!=='cookie_consent_test')exit(1);
$defs=[
 'split'=>['[[!CookieConsentAssets]]','[[!CookieConsentBanner? &mode=`mock`]]'],
 'legacy'=>['','[[!CookieConsent? &mode=`mock`]]'],
 'assets-only'=>['[[!CookieConsentAssets]]',''], 'banner-only'=>['','[[!CookieConsentBanner]]']
];$out=[];
foreach($defs as$name=>[$head,$body]){$t=$modx->getObject('modTemplate',['templatename'=>'Frontend '.$name])?:$modx->newObject('modTemplate');$t->set('templatename','Frontend '.$name);$t->set('content','<!doctype html><html lang="[[++cultureKey]]"><head><meta charset="UTF-8">'.$head.'</head><body><main>Site</main><button type="button" data-cookie-settings-open>Settings</button><footer id="fixture-footer">'.$body.'</footer><div data-cc-map-provider="google_maps" data-cc-map-src="/assets/js/cookie-consent/mock/google_maps.html"></div><div data-cc-map-provider="yandex_maps" data-cc-map-src="/assets/js/cookie-consent/mock/yandex_maps.html"></div></body></html>');$t->save();$r=$modx->getObject('modResource',['alias'=>'frontend-'.$name])?:$modx->newObject('modResource');$r->fromArray(['pagetitle'=>'Frontend '.$name,'alias'=>'frontend-'.$name,'template'=>$t->get('id'),'published'=>1,'cacheable'=>1]);$r->save();$out[$name]=$r->get('id');}$modx->cacheManager->refresh();echo json_encode($out);
