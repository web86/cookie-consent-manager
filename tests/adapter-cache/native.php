<?php
// Mutates ONLY the named disposable MODX 2 fixture and this component's adapter.
if(PHP_SAPI!=='cli'||!getenv('CC_DB_PASSWORD'))exit(1);
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();
if($modx->getOption('dbname')!=='cookie_consent_test')exit(1);
require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentBundleManager.php';
$source=MODX_ASSETS_PATH.'js/cookie-consent/embeds/youtube.js';
$file=MODX_ASSETS_PATH.'js/cookie-consent/cached-cookie-consent.min.js';
$op=$argv[1]??'';
if($op==='state'){
 $plugin=$modx->getObject('modPlugin',['name'=>'CookieConsentCacheBuild']);$settings=[];
 foreach($modx->getCollection('modSystemSetting',['namespace'=>'cookie_consent']) as $row)$settings[$row->get('key')]=hash('sha256',$row->get('value'));
 ksort($settings);clearstatcache(true,$file);
 echo json_encode(['build'=>CookieConsentBundleManager::status($modx),'asset'=>CookieConsentBundleManager::asset($modx),'hash'=>is_file($file)?hash_file('sha256',$file):null,'inode'=>is_file($file)?fileinode($file):null,'plugins'=>$modx->getCount('modPlugin',['name'=>'CookieConsentCacheBuild']),'events'=>$plugin?$modx->getCount('modPluginEvent',['pluginid'=>$plugin->get('id'),'event'=>'OnSiteRefresh']):0,'settings'=>$settings]);exit;
}
if($op==='edit'||$op==='break'){file_put_contents($source,$op==='edit'?"\nwindow.__adapterBuildEdited=true;\n":"\nfunction { broken",FILE_APPEND);exit;}
if($op==='restore'){copy(dirname(__DIR__,2).'/assets/js/cookie-consent/embeds/youtube.js',$source);exit;}
if($op==='deny'||$op==='allow'){chmod(dirname($file),$op==='deny'?0555:0755);exit;}
if($op==='public-refresh'){$modx->initialize('web');$modx->invokeEvent('OnSiteRefresh');exit;}
if($op==='remove-cache'){if(is_file($file))unlink($file);exit;}
throw new RuntimeException('Unknown adapter fixture operation');
