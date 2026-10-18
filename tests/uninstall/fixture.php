<?php
$task=$argv[1]??'';$argv[1]='boot';require __DIR__.'/../public-install/fixture.php';
$core=MODX_CORE_PATH.'components/cookieconsentmanager3/';$js=MODX_ASSETS_PATH.'js/cookie-consent/';$marker='uninstall-owned-fixture';
function requireNew(string $file,string $bytes):void{if(file_exists($file)||is_link($file))throw new RuntimeException('Existing fixture file preserved');if(!is_dir(dirname($file)))mkdir(dirname($file),0755,true);file_put_contents($file,$bytes);}
if($task==='state'){
 $db=[];foreach(['MODX\Revolution\modNamespace'=>['name'=>'cookie_consent'],'MODX\Revolution\modMenu'=>['namespace'=>'cookie_consent'],'MODX\Revolution\modSnippet'=>['name:IN'=>['CookieConsent','CookieConsentAssets','CookieConsentBanner','CookieConsentMap','CookieConsentVideo','UninstallForeignFixture']],'MODX\Revolution\modChunk'=>['name'=>'CookiesPopup'],'MODX\Revolution\modPlugin'=>['name'=>'CookieConsentCacheBuild'],'MODX\Revolution\modCategory'=>['category'=>'CookieConsentManager'],'MODX\Revolution\modSystemSetting'=>['namespace'=>'cookie_consent','OR:key:IN'=>['cookie_consent.options','cookie_consent.services','cookie_consent.texts','cookie_consent.log_dir','cookie_consent.audit_config_file','cookie_consent.audit','cookie_consent.bundle_version']],'MODX\Revolution\modAccessPermission'=>['name:IN'=>['cookie_consent_manage','cookie_consent_view_logs']],'MODX\Revolution\Registry\Db\modDbRegisterQueue'=>['name'=>'cookieconsent-audit-private']] as $class=>$criteria){$db[$class]=[];foreach($modx->getCollection($class,$criteria) as $row){$a=$row->toArray();if($class==='MODX\Revolution\Registry\Db\modDbRegisterQueue')unset($a['options']);$db[$class][]=$a;}}
 $files=[];foreach([$core,MODX_ASSETS_PATH.'components/cookieconsentmanager3/',$js] as $dir)if(is_dir($dir))foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir,FilesystemIterator::SKIP_DOTS)) as $file)if($file->isFile()&&!$file->isLink())$files[str_replace(MODX_BASE_PATH,'',$file->getPathname())]=hash_file('sha256',$file->getPathname());$css=MODX_ASSETS_PATH.'css/cookie-consent.min.css';if(is_file($css))$files['assets/css/cookie-consent.min.css']=hash_file('sha256',$css);ksort($files);
 $logs=[];foreach(['/opt/cc-private/logs',MODX_CORE_PATH.'cache/logs'] as $dir)if(is_dir($dir))foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir,FilesystemIterator::SKIP_DOTS)) as $file)if($file->isFile()&&$file->getBasename()!=='error.log')$logs[$file->getPathname()]=hash_file('sha256',$file->getPathname());ksort($logs);
 $packs=[];foreach($modx->getCollection('MODX\Revolution\Transport\modTransportPackage') as $row)$packs[$row->get('signature')]=(bool)$row->get('installed');
 echo json_encode(['db'=>$db,'files'=>$files,'logs'=>$logs,'packages'=>$packs]);exit;
}
if($task==='settings'){
 $row=$modx->getObject('MODX\Revolution\modSystemSetting',['key'=>'cookie_consent.options']);$v=json_decode($row->get('value'),true);unset($v['position']);$v['banner_position']='bottom-right';$row->set('value',json_encode($v));if(!$row->save())throw new RuntimeException('Setting');$modx->cacheManager->refresh();echo '{}';exit;
}
if($task==='adapter'){file_put_contents($js.'services/yandex.js',"\n// $marker user adapter\n",FILE_APPEND);echo '{}';exit;}
if($task==='extra'){
 foreach([$core.'user/custom.php',MODX_ASSETS_PATH.'components/cookieconsentmanager3/user.txt',$js.'user.txt'] as $file)requireNew($file,$marker);mkdir($core.'user/empty-user-directory');echo '{}';exit;
}
if($task==='clear-preserved-fixtures'){
 foreach([$core.'user/custom.php',MODX_ASSETS_PATH.'components/cookieconsentmanager3/user.txt',$js.'user.txt',$js.'services/yandex.js'] as $file)if(is_file($file)){if(!str_contains(file_get_contents($file),$marker))throw new RuntimeException('Foreign file must remain');unlink($file);}if(is_dir($core.'user/empty-user-directory'))rmdir($core.'user/empty-user-directory');echo '{}';exit;
}
if($task==='audit'){
 require_once $core.'src/CookieConsentEventValidator.php';require_once $core.'src/CookieConsentRateLimiter.php';require_once $core.'src/CookieConsentAuditLogger.php';require_once $core.'src/CookieConsentAuditConfiguration.php';CookieConsentAuditConfiguration::setup($modx);
 $event=['event_id'=>sprintf('%08x-1234-4123-8123-123456789abc',random_int(1,2147483647)),'consent_id'=>'12345678-1234-4123-8123-123456789abc','event'=>'accept_all','stage'=>'committed','analytics'=>true,'marketing'=>true,'policy_version'=>'1','page'=>'/','timestamp'=>gmdate('Y-m-d\TH:i:s').'.000Z'];
 foreach(['/opt/cc-private/logs',MODX_CORE_PATH.'cache/logs'] as $dir)(new CookieConsentAuditLogger($dir,str_repeat('test-fixture-',4)))->append($event,'127.0.0.1','uninstall fixture');echo '{}';exit;
}
if($task==='deny-file-dir'||$task==='allow-file-dir'){$dir=$core.'src';if(!is_dir($dir))throw new RuntimeException('Missing test directory');chmod($dir,$task==='deny-file-dir'?0555:0755);echo '{}';exit;}
if($task==='partial-file'){$f=$core.'templates/home.tpl';if(!is_file($f))throw new RuntimeException('Missing test file');unlink($f);echo '{}';exit;}
if($task==='foreign'){
 $cat=$modx->getObject('MODX\Revolution\modCategory',['category'=>'CookieConsentManager']);if(!$cat)throw new RuntimeException('Installed category required');$row=$modx->newObject('MODX\Revolution\modSnippet');$row->fromArray(['name'=>'UninstallForeignFixture','description'=>$marker,'snippet'=>'return "foreign";','category'=>$cat->get('id')]);if(!$row->save())throw new RuntimeException('Foreign element');
 $own=$modx->getObject('MODX\Revolution\modSnippet',['name'=>'CookieConsentMap']);if(!$own||!$own->remove())throw new RuntimeException('Own element replacement fixture');$row=$modx->newObject('MODX\Revolution\modSnippet');$row->fromArray(['name'=>'CookieConsentMap','description'=>$marker,'snippet'=>'return "foreign replacement";']);if(!$row->save())throw new RuntimeException('Foreign replacement');
 file_put_contents(MODX_ASSETS_PATH.'components/cookieconsentmanager3/manager.js',$marker);
 $own=$modx->getObject('MODX\Revolution\modPlugin',['name'=>'CookieConsentCacheBuild']);if(!$own||!$own->remove())throw new RuntimeException('Plugin replacement fixture');$foreign=$modx->newObject('MODX\Revolution\modPlugin');$foreign->fromArray(['name'=>'CookieConsentCacheBuild','description'=>$marker,'plugincode'=>'return;']);if(!$foreign->save())throw new RuntimeException('Foreign plugin');
 $own=$modx->getObject('MODX\Revolution\modSystemSetting',['key'=>'cookie_consent.audit']);if(!$own||!$own->remove())throw new RuntimeException('Setting replacement fixture');$foreign=$modx->newObject('MODX\Revolution\modSystemSetting');$foreign->fromArray(['key'=>'cookie_consent.audit','namespace'=>'core','value'=>$marker],'',true,true);if(!$foreign->save())throw new RuntimeException('Foreign setting');
 $ns=$modx->getObject('MODX\Revolution\modNamespace',['name'=>'cookie_consent']);$ns->set('assets_path','{assets_path}components/uninstall-foreign-fixture/');if(!$ns->save())throw new RuntimeException('Foreign namespace fixture');
 requireNew(MODX_CORE_PATH.'components/cookieconsent/foreign.txt',$marker);requireNew(MODX_ASSETS_PATH.'components/cookieconsent/foreign.txt',$marker);requireNew($core.'user.txt',$marker);echo '{}';exit;
}
if($task==='preexisting-permission'){
 $t=$modx->getObject('MODX\Revolution\modAccessPolicyTemplate',['name'=>'Administrator']);if(!$t)$t=$modx->getObject('MODX\Revolution\modAccessPolicyTemplate',[]);
 $r=$modx->newObject('MODX\Revolution\modAccessPermission');$r->fromArray(['template'=>$t->get('id'),'name'=>'cookie_consent_manage','description'=>$marker,'value'=>true]);if(!$r->save())throw new RuntimeException('Foreign permission');echo json_encode(['id'=>$r->get('id')]);exit;
}
throw new RuntimeException('Unknown uninstall fixture task');
