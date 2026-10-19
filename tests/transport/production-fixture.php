<?php
// Production-mode acceptance without test assets; named clean fixture only.
if(PHP_SAPI!=='cli'||!getenv('CC_DB_PASSWORD'))exit(1);
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();
if($modx->getOption('dbname')!=='cookie_consent_transport_clean')exit(1);
require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentSettings.php';
$state='/tmp/cc-beta2-production-settings.json';$op=$argv[1]??'';
if($op==='prepare'){
 if(is_dir(MODX_ASSETS_PATH.'components/cookieconsentmanager/js/cookie-consent/mock'))throw new RuntimeException('Clean installation contains mock directory');
 $saved=[];foreach(['cookie_consent.options','cookie_consent.services'] as $key)$saved[$key]=$modx->getObject('modSystemSetting',['key'=>$key])->get('value');
 $markup='<!doctype html><html><head>[[!CookieConsentAssets]]</head><body>'.
 '<script>document.addEventListener("DOMContentLoaded",()=>{window.__allowed=0;web86CookieConsent.onAllowed("marketing",()=>window.__allowed++);});</script>'.
 '[[!CookieConsentMap? &provider=`google_maps` &src=`https://www.google.com/maps/embed?pb=fixture`]]'.
 '[[!CookieConsentMap? &provider=`yandex_maps` &src=`https://yandex.ru/map-widget/v1/?ll=37.62%2C55.75&z=10`]]'.
 '[[!CookieConsentVideo? &provider=`youtube` &url=`https://youtu.be/M7lc1UVf-VE`]]'.
 '[[!CookieConsentVideo? &provider=`rutube` &url=`https://rutube.ru/video/7716bd3e665725c3c008ae7ab4ff02e2/`]]'.
 '[[!CookieConsentVideo? &provider=`vk_video` &url=`https://vkvideo.ru/video_ext.php?oid=-1&id=2&hash=0123456789abcdef`]]'.
 '[[!CookieConsentBanner]]</body></html>';
 $t=$modx->newObject('modTemplate');$t->fromArray(['templatename'=>'Beta2 production acceptance','content'=>$markup],'',true,true);$t->save();
 $r=$modx->newObject('modResource');$r->fromArray(['pagetitle'=>'Beta2 production acceptance','alias'=>'beta2-production-test','template'=>$t->get('id'),'published'=>1,'cacheable'=>1],'',true,true);$r->save();
 file_put_contents($state,json_encode(['settings'=>$saved,'resource'=>$r->get('id'),'template'=>$t->get('id')]));echo $r->get('id');
}elseif($op==='strict'||$op==='legacy'){
 $options=CookieConsentSettings::defaults();$options['categories']=['analytics'=>true,'marketing'=>true,'external_content'=>true];
 $options['buttons']=['reject'=>true,'configure'=>true,'accept_all'=>$op==='strict','accept'=>$op==='legacy'];
 $registry=CookieConsentServiceRegistry::defaults();$ids=['google_ga4'=>'G-TEST1234','google_gtm'=>'GTM-ABC1234','google_ads'=>'AW-1234567','vk_ads'=>'112233','meta_pixel'=>'123456789012'];
 foreach($registry['services'] as &$service){$service['enabled']=true;if(isset($ids[$service['loader']]))$service['config']=['id'=>$ids[$service['loader']]];}unset($service);
 $registry['services'][]=['key'=>'customer_script','loader'=>'custom_js','name'=>'Customer script','purpose'=>'Acceptance','category'=>'marketing','enabled'=>true,'config'=>['path'=>'/assets/js/customer-fixture.js']];
 $registry=CookieConsentServiceRegistry::validateJson(json_encode($registry));
 foreach(['cookie_consent.options'=>$options,'cookie_consent.services'=>$registry] as $key=>$value){$row=$modx->getObject('modSystemSetting',['key'=>$key]);$row->set('value',json_encode($value));if(!$row->save())throw new RuntimeException('Fixture save');}
}elseif($op==='restore'){
 $saved=json_decode(file_get_contents($state),true);foreach($saved['settings'] as $key=>$value){$row=$modx->getObject('modSystemSetting',['key'=>$key]);$row->set('value',$value);$row->save();}
 foreach(['modResource'=>'resource','modTemplate'=>'template'] as $class=>$key){$row=$modx->getObject($class,$saved[$key]);if($row)$row->remove();}@unlink($state);
}else throw new RuntimeException('Unknown fixture action');
$modx->cacheManager->refresh(['system_settings'=>[]]);$modx->cacheManager->clean(['cache_key'=>'resource']);
