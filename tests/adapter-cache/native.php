<?php
// Mutates ONLY the named disposable MODX 2 fixture and this component's adapter.
if(PHP_SAPI!=='cli'||!getenv('CC_DB_PASSWORD'))exit(1);
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();
if($modx->getOption('dbname')!=='cookie_consent_test')exit(1);
require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentBundleManager.php';
$source=MODX_ASSETS_PATH.'js/cookie-consent/embeds/youtube.js';
$file=MODX_ASSETS_PATH.'js/cookie-consent/cached-cookie-consent.min.js';
$op=$argv[1]??'';
if($op==='sync'){
 $root=dirname(__DIR__,2);
 copy($root.'/server/src/CookieConsentBundleManager.php',MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentBundleManager.php');
 $snippet=$modx->getObject('modSnippet',['name'=>'CookieConsentAssets']);
 $snippet->set('snippet',trim(preg_replace('/^<\?php\s*/','',file_get_contents($root.'/server/modx2-assets-snippet.php'))));
 if(!$snippet->save())throw new RuntimeException('Fixture snippet save');
 $modx->cacheManager->refresh(['scripts'=>[],'context_settings'=>['contexts'=>['mgr']]]);exit;
}
if($op==='deactivate'){
 $row=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.bundle_version']);if($row&&!$row->remove())exit(1);
 $modx->setOption('cookie_consent.bundle_version',0);$modx->cacheManager->refresh(['system_settings'=>[]]);exit;
}
$probeName='CookieConsentBundleRefreshProbe';$probeFile='/tmp/cc-bundle-refresh-events';
if($op==='probe-install'){
 @unlink($probeFile);
 $p=$modx->getObject('modPlugin',['name'=>$probeName])?:$modx->newObject('modPlugin');
 $p->fromArray(['name'=>$probeName,'plugincode'=>"file_put_contents('/tmp/cc-bundle-refresh-events', \"event\\n\", FILE_APPEND);",'disabled'=>false]);
 if(!$p->save())exit(1);
 $criteria=['pluginid'=>$p->get('id'),'event'=>'OnSiteRefresh'];
 if(!$modx->getObject('modPluginEvent',$criteria)){$e=$modx->newObject('modPluginEvent');$e->fromArray($criteria,'',true,true);if(!$e->save())exit(1);}
 $modx->cacheManager->refresh(['scripts'=>[],'context_settings'=>['contexts'=>['mgr']]]);exit;
}
if($op==='probe-count'){echo is_file($probeFile)?count(file($probeFile)):0;exit;}
if($op==='probe-remove'){
 $p=$modx->getObject('modPlugin',['name'=>$probeName]);if($p){foreach($modx->getCollection('modPluginEvent',['pluginid'=>$p->get('id')]) as $e)$e->remove();$p->remove();}
 @unlink($probeFile);$modx->cacheManager->refresh(['scripts'=>[],'context_settings'=>['contexts'=>['mgr']]]);exit;
}
if($op==='resource-cache'){
 $id=$argv[2]??'';if(!ctype_digit($id))exit(1);
 echo is_file(MODX_CORE_PATH.'cache/resource/web/resources/'.$id.'.cache.php')?'1':'0';exit;
}
if($op==='state'){
 $plugin=$modx->getObject('modPlugin',['name'=>'CookieConsentCacheBuild']);$settings=[];
 foreach($modx->getCollection('modSystemSetting',['namespace'=>'cookie_consent']) as $row)if($row->get('key')!=='cookie_consent.bundle_version')$settings[$row->get('key')]=hash('sha256',$row->get('value'));
 ksort($settings);clearstatcache(true,$file);
 echo json_encode(['build'=>CookieConsentBundleManager::status($modx),'asset'=>CookieConsentBundleManager::asset($modx),'hash'=>is_file($file)?hash_file('sha256',$file):null,'inode'=>is_file($file)?fileinode($file):null,'plugins'=>$modx->getCount('modPlugin',['name'=>'CookieConsentCacheBuild']),'events'=>$plugin?$modx->getCount('modPluginEvent',['pluginid'=>$plugin->get('id'),'event'=>'OnSiteRefresh']):0,'settings'=>$settings,'timestamp'=>(int)$modx->getOption('cookie_consent.bundle_version',null,0)]);exit;
}
if($op==='edit'||$op==='break'){file_put_contents($source,$op==='edit'?"\nwindow.__adapterBuildEdited=true;\n":"\nfunction { broken",FILE_APPEND);exit;}
if($op==='restore'){copy(dirname(__DIR__,2).'/assets/js/cookie-consent/embeds/youtube.js',$source);exit;}
if($op==='deny'||$op==='allow'){chmod(dirname($file),$op==='deny'?0555:0755);exit;}
if($op==='public-refresh'){$modx->initialize('web');$modx->invokeEvent('OnSiteRefresh');exit;}
if($op==='remove-cache'){if(is_file($file))unlink($file);exit;}
throw new RuntimeException('Unknown adapter fixture operation');
