<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'||!getenv('CC_DB_PASSWORD'))exit(1);
$case=$argv[1]??'';$op=$argv[2]??'';
if(!preg_match('/^[a-z0-9-]+$/D',$case)||!is_file('/opt/cc-updates/cases/'.$case.'/private/manager.json'))exit(1);
$base='/opt/cc-updates/cases/'.$case.'/';
if($op==='credentials'){echo file_get_contents($base.'private/manager.json');exit;}
define('MODX_API_MODE',true);ob_start();require $base.'site/index.php';while(ob_get_level())ob_end_clean();
if(!str_starts_with((string)$modx->getOption('dbname'),'cc_adapter_'))exit(1);
$modx->setLogTarget('FILE');$modx->setLogLevel(modX::LOG_LEVEL_INFO);
$core=MODX_CORE_PATH.'components/cookieconsent/';$services=MODX_ASSETS_PATH.'components/cookieconsentmanager/js/cookie-consent/services/';$bundle=MODX_ASSETS_PATH.'components/cookieconsentmanager/js/cookie-consent/cached-cookie-consent.min.js';
if($op==='install'||$op==='uninstall'){
    $archive=$argv[3]??'';
    if(!str_starts_with($archive,'/opt/cc-updates/artifacts/')&&!str_starts_with($archive,'/opt/cc-reference/.local/artifacts/'))throw new RuntimeException('Local artifact required');
    $signature=basename($archive,'.transport.zip');if(!preg_match('/^cookieconsent-1\.0\.[0-9]+(?:-(?:beta|pl)[0-9]+)?$/D',$signature))throw new RuntimeException('Signature');
    $target=MODX_CORE_PATH.'packages/'.$signature.'.transport.zip';
    if(is_file($target)&&hash_file('sha256',$target)!==hash_file('sha256',$archive))throw new RuntimeException('Immutable archive collision');
    if(!is_file($target)&&!copy($archive,$target))throw new RuntimeException('Native archive copy');
    $package=$modx->getObject('transport.modTransportPackage',['signature'=>$signature]);
    if(!$package){$package=$modx->newObject('transport.modTransportPackage');$package->fromArray(['package_name'=>'cookieconsent','state'=>1,'workspace'=>1],'',true,true);$package->set('signature',$signature);$package->setPackageVersionData();if(!$package->save())throw new RuntimeException('Native package registration');}
    $ok=$op==='install'?$package->install():$package->uninstall();
    $modx->cacheManager->refresh();echo json_encode(['success'=>$ok,'signature'=>$signature,'installed'=>(bool)$package->get('installed')]);exit;
}
if($op==='edit'){
    $name=$argv[3]??'';$kind=$argv[4]??'comment';if(!preg_match('/^[a-z0-9-]+\.js$/D',$name))exit(1);
    $file=$services.$name;if(!is_dir($services))mkdir($services,0755,true);
    if($kind==='delete'){if(!unlink($file))throw new RuntimeException('Delete fixture input');}
    else file_put_contents($file,$kind==='syntax'?"\nfunction { invalid\n":"\nwindow.__adapterCustomerEdit=(window.__adapterCustomerEdit||0)+1;\n",FILE_APPEND);
    echo json_encode(['path'=>$name,'sha256'=>is_file($file)?hash_file('sha256',$file):null]);exit;
}
if($op==='state'){
    $result=['version'=>$modx->getVersionData()['full_version'],'files'=>[],'bundle'=>is_file($bundle)?hash_file('sha256',$bundle):null,'timestamp'=>(int)$modx->getOption('cookie_consent.bundle_version',null,0),'prebuilt'=>is_file(MODX_ASSETS_PATH.'components/cookieconsentmanager/js/cookie-consent/cookie-consent.min.js'),'elements'=>[],'installed'=>[]];
    foreach(glob($services.'*.js')?:[] as $f)$result['files'][basename($f)]=hash_file('sha256',$f);
    if(is_file($core.'adapter-checksums.json'))$result['checksums']=json_decode(file_get_contents($core.'adapter-checksums.json'),true);
    if(is_file($core.'src/CookieConsentBundleManager.php')){require_once $core.'src/CookieConsentBundleManager.php';$result['build']=CookieConsentBundleManager::status($modx);$result['asset']=CookieConsentBundleManager::asset($modx);require_once $core.'src/CookieConsentVersion.php';$result['packageVersion']=CookieConsentVersion::VERSION;}
    foreach(['modChunk'=>['CookiesPopup'],'modSnippet'=>['CookieConsent','CookieConsentMap','CookieConsentVideo','CookieConsentAssets','CookieConsentBanner']] as $class=>$names)foreach($names as $name){$row=$modx->getObject($class,['name'=>$name]);if($row){$data=$row->toArray();unset($data['snippet'],$data['content'],$data['editedon']);$result['elements'][$name]=['id'=>$row->get('id'),'metadata'=>hash('sha256',json_encode($data))];}}
    foreach($modx->getCollection('transport.modTransportPackage') as $p)$result['installed'][$p->get('signature')]=(bool)$p->get('installed');
    echo json_encode($result);exit;
}
if($op==='language'){
    $lang=$argv[3]??'';if(!in_array($lang,['ru','en'],true))exit(1);$row=$modx->getObject('modSystemSetting',['key'=>'manager_language']);$row->set('value',$lang);$row->save();$modx->cacheManager->refresh();echo json_encode(['language'=>$lang]);exit;
}
if($op==='probe'||$op==='probe-count'){
    $file=$base.'private/refresh-events';
    if($op==='probe'){
        $p=$modx->getObject('modPlugin',['name'=>'AdapterUpdateRefreshProbe'])?:$modx->newObject('modPlugin');$p->fromArray(['name'=>'AdapterUpdateRefreshProbe','disabled'=>false,'plugincode'=>'file_put_contents('.var_export($file,true).', "event\\n", FILE_APPEND);']);$p->save();
        $criteria=['pluginid'=>$p->get('id'),'event'=>'OnSiteRefresh'];if(!$modx->getObject('modPluginEvent',$criteria)){$e=$modx->newObject('modPluginEvent');$e->fromArray($criteria,'',true,true);$e->save();}$modx->cacheManager->refresh();
    }
    echo json_encode(['count'=>is_file($file)?count(file($file)):0]);exit;
}
if($op==='production'){
    require_once $core.'src/CookieConsentSettings.php';$mode=$argv[3]??'strict';
    $options=CookieConsentSettings::defaults();$options['categories']=['analytics'=>true,'marketing'=>true,'external_content'=>true];$options['buttons']=['reject'=>true,'configure'=>true,'accept_all'=>$mode==='strict','accept'=>$mode==='legacy'];
    $registry=CookieConsentServiceRegistry::defaults();$ids=['google_ga4'=>'G-TEST1234','google_gtm'=>'GTM-ABC1234','google_ads'=>'AW-1234567','vk_ads'=>'112233','meta_pixel'=>'123456789012'];foreach($registry['services'] as &$service){$service['enabled']=true;if(isset($ids[$service['loader']]))$service['config']=['id'=>$ids[$service['loader']]];}unset($service);
    foreach(['cookie_consent.options'=>$options,'cookie_consent.services'=>$registry] as $key=>$value){$row=$modx->getObject('modSystemSetting',['key'=>$key]);$row->set('value',json_encode($value));$row->save();}
    $html='<!doctype html><html><head>[[!CookieConsentAssets]]</head><body>[[!CookieConsentMap? &provider=`google_maps` &src=`https://www.google.com/maps/embed?pb=fixture`]][[!CookieConsentMap? &provider=`yandex_maps` &src=`https://yandex.ru/map-widget/v1/?ll=37.62%2C55.75&z=10`]][[!CookieConsentVideo? &provider=`youtube` &url=`https://youtu.be/M7lc1UVf-VE`]][[!CookieConsentVideo? &provider=`rutube` &url=`https://rutube.ru/video/7716bd3e665725c3c008ae7ab4ff02e2/`]][[!CookieConsentVideo? &provider=`vk_video` &url=`https://vkvideo.ru/video_ext.php?oid=-1&id=2&hash=0123456789abcdef`]][[!CookieConsentBanner]]</body></html>';
    $html=str_replace('<head>','<head><meta name="cc-adapter-case" content="'.htmlspecialchars($case,ENT_QUOTES,'UTF-8').'">',$html);
    $r=$modx->getObject('modResource',['alias'=>'adapter-update-acceptance'])?:$modx->newObject('modResource');$r->fromArray(['pagetitle'=>'Adapter update acceptance','alias'=>'adapter-update-acceptance','published'=>1,'template'=>0,'cacheable'=>1,'content'=>$html],'',true,true);$r->save();$modx->cacheManager->refresh();echo json_encode(['id'=>$r->get('id')]);exit;
}
throw new RuntimeException('Unknown fixture operation');
