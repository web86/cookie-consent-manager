<?php
if(PHP_SAPI!=='cli'||!getenv('CC_DB_PASSWORD'))exit(1);
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();
if($modx->getOption('dbname')!=='cookie_consent_modx3_test')exit(1);
$t=$modx->getObject('MODX\Revolution\modTemplate',['templatename'=>'Beta23 category acceptance'])?:$modx->newObject('MODX\Revolution\modTemplate');
$t->set('templatename','Beta23 category acceptance');$t->set('content','<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Category acceptance</title></head><body>[[!CookieConsent? &mode=`mock`]]<button type="button" data-cookie-settings-open>Settings</button><div data-cc-map-provider="google_maps" data-cc-map-src="/assets/components/cookieconsentmanager3/js/cookie-consent/mock/google_maps.html"></div><div data-cc-map-provider="yandex_maps" data-cc-map-src="/assets/components/cookieconsentmanager3/js/cookie-consent/mock/yandex_maps.html"></div></body></html>');if(!$t->save())exit(2);
$r=$modx->getObject('MODX\Revolution\modResource',['pagetitle'=>'Beta23 category acceptance'])?:$modx->newObject('MODX\Revolution\modResource');$r->fromArray(['pagetitle'=>'Beta23 category acceptance','alias'=>'beta23-categories','published'=>1,'template'=>$t->get('id'),'cacheable'=>0]);if(!$r->save())exit(2);$modx->cacheManager->refresh();echo $r->get('id');
