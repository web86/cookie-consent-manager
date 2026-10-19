<?php
// Mutates ONLY the named disposable MODX 3 fixture and this component's adapter.
require __DIR__.'/../modx3/guard.php';
require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentBundleManager.php';
$source=MODX_ASSETS_PATH.'components/cookieconsentmanager3/js/cookie-consent/embeds/youtube.js';
$file=MODX_ASSETS_PATH.'components/cookieconsentmanager3/js/cookie-consent/cached-cookie-consent.min.js';
$op=$argv[1]??'';
if($op==='deactivate'){
 $row=$modx->getObject('MODX\Revolution\modSystemSetting',['key'=>'cookie_consent.bundle_version']);if($row&&!$row->remove())exit(1);
 $modx->setOption('cookie_consent.bundle_version',0);$modx->cacheManager->refresh(['system_settings'=>[]]);exit;
}
$probeName='CookieConsentBundleRefreshProbe';$probeFile='/tmp/cc-bundle-refresh-events';
if($op==='probe-install'){
 @unlink($probeFile);
 $p=$modx->getObject('MODX\Revolution\modPlugin',['name'=>$probeName])?:$modx->newObject('MODX\Revolution\modPlugin');
 $p->fromArray(['name'=>$probeName,'plugincode'=>"file_put_contents('/tmp/cc-bundle-refresh-events', \"event\\n\", FILE_APPEND);",'disabled'=>false]);
 if(!$p->save())exit(1);
 $criteria=['pluginid'=>$p->get('id'),'event'=>'OnSiteRefresh'];
 if(!$modx->getObject('MODX\Revolution\modPluginEvent',$criteria)){$e=$modx->newObject('MODX\Revolution\modPluginEvent');$e->fromArray($criteria,'',true,true);if(!$e->save())exit(1);}
 $modx->cacheManager->refresh(['scripts'=>[],'context_settings'=>['contexts'=>['mgr']]]);exit;
}
if($op==='probe-count'){echo is_file($probeFile)?count(file($probeFile)):0;exit;}
if($op==='probe-remove'){
 $p=$modx->getObject('MODX\Revolution\modPlugin',['name'=>$probeName]);if($p){foreach($modx->getCollection('MODX\Revolution\modPluginEvent',['pluginid'=>$p->get('id')]) as $e)$e->remove();$p->remove();}
 @unlink($probeFile);$modx->cacheManager->refresh(['scripts'=>[],'context_settings'=>['contexts'=>['mgr']]]);exit;
}
if($op==='resource-cache'){
 $id=$argv[2]??'';if(!ctype_digit($id))exit(1);
 echo is_file(MODX_CORE_PATH.'cache/resource/web/resources/'.$id.'.cache.php')?'1':'0';exit;
}
if($op==='state'){
 $plugin=$modx->getObject('MODX\Revolution\modPlugin',['name'=>'CookieConsentCacheBuild']);$settings=[];
 foreach($modx->getCollection('MODX\Revolution\modSystemSetting',['namespace'=>'cookie_consent']) as $row)if($row->get('key')!=='cookie_consent.bundle_version')$settings[$row->get('key')]=hash('sha256',$row->get('value'));
 ksort($settings);clearstatcache(true,$file);
 echo json_encode(['build'=>CookieConsentBundleManager::status($modx),'asset'=>CookieConsentBundleManager::asset($modx),'hash'=>is_file($file)?hash_file('sha256',$file):null,'inode'=>is_file($file)?fileinode($file):null,'plugins'=>$modx->getCount('MODX\Revolution\modPlugin',['name'=>'CookieConsentCacheBuild']),'events'=>$plugin?$modx->getCount('MODX\Revolution\modPluginEvent',['pluginid'=>$plugin->get('id'),'event'=>'OnSiteRefresh']):0,'settings'=>$settings,'timestamp'=>(int)$modx->getOption('cookie_consent.bundle_version',null,0)]);exit;
}
if($op==='edit'||$op==='break'){file_put_contents($source,$op==='edit'?"\nwindow.__adapterBuildEdited=true;\n":"\nfunction { broken",FILE_APPEND);exit;}
if($op==='restore'){copy(dirname(__DIR__,2).'/assets/components/cookieconsentmanager3/js/cookie-consent/embeds/youtube.js',$source);exit;}
if($op==='deny'||$op==='allow'){chmod(dirname($file),$op==='deny'?0555:0755);exit;}
if($op==='public-refresh'){$modx->initialize('web');$modx->invokeEvent('OnSiteRefresh');exit;}
if($op==='remove-cache'){if(is_file($file))unlink($file);exit;}
throw new RuntimeException('Unknown adapter fixture operation');
