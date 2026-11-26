<?php
declare(strict_types=1);
$work=str_replace('\\','/',(string)getenv('CC_NATIVE_WORK'));
if(PHP_SAPI!=='cli'||getenv('GITHUB_ACTIONS')!=='true'||$work===''||!is_file($work.'/private/config.json'))throw new RuntimeException('Disposable Actions fixture required');
$config=json_decode(file_get_contents($work.'/private/config.json'),true,32,JSON_THROW_ON_ERROR);$major=$config['major'];$site=$config['site'];$task=$argv[1]??'';
function check($v,string $message):void{if(!$v)throw new RuntimeException($message);}
function ccClass(string $class):string{global $major;return $major===2?($class==='modTransportPackage'?'transport.modTransportPackage':$class):'MODX\\Revolution\\'.($class==='modTransportPackage'?'Transport\\':'').$class;}
if($task==='prepare-db'){
 $pdo=new PDO('mysql:host=127.0.0.1;port=3307','root','');$pdo->exec('CREATE DATABASE `cc_windows_native` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');echo "Created disposable database\n";exit;
}
if($task==='relocate'){
 check(is_file($site.'core/config/config.inc.php'),'Native CMS setup did not create config');
 $old=$site.'core/';$core=$work.'/private/core/';check(rename(rtrim($old,'/'),rtrim($core,'/')),'Relocate core');
 if(is_dir($site.'assets'))check(rename($site.'assets',$work.'/external-assets'),'Relocate assets');else mkdir($work.'/external-assets');
 foreach([$site.'config.core.php',$site.'manager/config.core.php',$site.'connectors/config.core.php'] as $file)file_put_contents($file,"<?php\ndefine('MODX_CORE_PATH', ".var_export($core,true).");\ndefine('MODX_CONFIG_KEY', 'config');\n");
 $file=$core.'config/config.inc.php';$bytes=file_get_contents($file);
 $paths=['core_path'=>$core,'assets_path'=>$work.'/external-assets/','assets_url'=>'/files/','base_path'=>$site,'connectors_path'=>$site.'connectors/','manager_path'=>$site.'manager/','processors_path'=>$core.($major===3?'src/Revolution/Processors/':'model/modx/processors/')];
 foreach($paths as $name=>$value)$bytes=preg_replace_callback('~(\\$modx_'.preg_quote($name,'~').'\\s*=)[^;]*;~',static fn($m)=>$m[1].' '.var_export($value,true).';',$bytes);
 file_put_contents($file,$bytes);
 if($major===3)file_put_contents($core.'config/config.inc.php',"\n\$config_options['load_deprecated_global_class_aliases']=false;\n",FILE_APPEND);
 echo "Relocated core/assets outside public_html\n";exit;
}
$destination=(static function($file){require $file;return [$database_server??null,$dbase??null];})($work.'/private/core/config/config.inc.php');check($destination===['127.0.0.1;port=3307','cc_windows_native'],'Foreign database refused');
define('MODX_API_MODE',true);ob_start();require $site.'index.php';while(ob_get_level())ob_end_clean();
check($modx->query('SELECT DATABASE()')->fetchColumn()==='cc_windows_native','Wrong DB');check($modx->getVersionData()['full_version']===$config['modx'],'Wrong MODX');
$modx->setLogTarget('FILE');$modx->setLogLevel(2);
$core=$work.'/private/core/';$assets=$work.'/external-assets/';$component=$core.'components/'.$config['product'].'/';$js=$assets.'components/'.$config['product'].'/js/cookie-consent/';
if($task==='configure-cms'){
 foreach($modx->getCollection(ccClass('modSystemSetting'),['namespace'=>'core']) as $row){$v=$row->get('value');if(is_string($v)){$next=str_replace([$site.'core/',$site.'assets/','/assets/'],[$core,$assets,'/files/'],$v);if($next!==$v){$row->set('value',$next);check($row->save(),'CMS path save');}}}
 $language=$modx->getObject(ccClass('modSystemSetting'),['key'=>'manager_language'])?:$modx->newObject(ccClass('modSystemSetting'));$language->fromArray(['key'=>'manager_language','namespace'=>'core','xtype'=>'textfield','area'=>'language','value'=>'en'],'',true,true);check($language->save(),'Manager language');
 mkdir($work.'/private/logs',0700);
 $modx->cacheManager->refresh();echo json_encode(['modx'=>$config['modx'],'php'=>PHP_VERSION,'os'=>PHP_OS_FAMILY,'core'=>$modx->getOption('core_path'),'assets'=>$modx->getOption('assets_path')]);exit;
}
if($task==='snapshot'){
 $out=['settings'=>[],'element_ids'=>[]];foreach($modx->getCollection(ccClass('modSystemSetting'),['namespace'=>'cookie_consent']) as $row)if($row->get('key')!=='cookie_consent.bundle_version')$out['settings'][$row->get('key')]=$row->get('value');
 foreach(['modSnippet'=>['CookieConsent','CookieConsentAssets','CookieConsentBanner','CookieConsentMap','CookieConsentVideo'],'modChunk'=>['CookiesPopup']] as $class=>$names)foreach($names as $name){$row=$modx->getObject(ccClass($class),['name'=>$name]);$out['element_ids'][$name]=$row?$row->get('id'):null;}
 ksort($out['settings']);echo json_encode($out);exit;
}
if($task==='working'){
 check(is_file($js.'cached-cookie-consent.min.js'),'No JS build');check(is_file($component.'adapter-checksums.json'),'No adapter state');
 $state=json_decode(file_get_contents($component.'adapter-checksums.json'),true);echo json_encode(['bundle_sha256'=>hash_file('sha256',$js.'cached-cookie-consent.min.js'),'adapter_history'=>array_keys($state['versions']),'bundle_version'=>$modx->getOption('cookie_consent.bundle_version')]);exit;
}
if($task==='edit-adapter'){file_put_contents($js.'services/yandex.js',"\n// native Windows customer edit\n",FILE_APPEND);echo json_encode(['sha256'=>hash_file('sha256',$js.'services/yandex.js')]);exit;}
if($task==='snapshot-uninstall'){
 $files=glob($work.'/private/logs/*-cookie-consent.log')?:[];check(count($files)>0,'Audit log missing');
 foreach([$component.'customer-note.txt',$assets.'components/'.$config['product'].'/customer-note.txt'] as $file){file_put_contents($file,'native Windows customer marker');$files[]=$file;}
 $files[]=$js.'services/yandex.js';$hashes=[];foreach($files as $file)$hashes[$file]=hash_file('sha256',$file);file_put_contents($work.'/private/retained.json',json_encode($hashes));echo "Retained file snapshot created\n";exit;
}
if($task==='native-uninstall'){
 $p=$modx->getObject(ccClass('modTransportPackage'),['signature'=>$config['product'].'-1.0.9-beta126']);check($p,'Test package unavailable');check($p->uninstall(),'Native CLI uninstall failed');echo json_encode(['result'=>'PASS','phase'=>'native CLI uninstall']);exit;
}
if($task==='verify-uninstall'){
 foreach(json_decode(file_get_contents($work.'/private/retained.json'),true) as $file=>$hash)check(is_file($file)&&hash_file('sha256',$file)===$hash,'User data/log changed');
 check(!$modx->getObject(ccClass('modNamespace'),['name'=>'cookie_consent']),'Namespace retained');check(!is_file($js.'cached-cookie-consent.min.js'),'Generated bundle retained');check(!is_file($assets.'components/'.$config['product'].'/audit.php'),'Public endpoint retained');check(!is_file($assets.'components/'.$config['product'].'/bootstrap.php'),'Bootstrap retained');
 echo json_encode(['result'=>'PASS','checks'=>['native uninstall','owned runtime removed','custom adapter/files and audit log retained']]);exit;
}
throw new RuntimeException('Unknown fixture phase');
