<?php
declare(strict_types=1);
$case=getenv('CC_MODSTORE_CASE');$task=$argv[1]??'';
if(PHP_SAPI!=='cli'||!preg_match('/^m(?:284|288|312|324)p8[12]f?$/D',(string)$case)||!is_dir('/opt/cc-case/evidence'))throw new RuntimeException('Disposable fixture required');
$site='/var/www/html/';$database='cc_modstore_'.$case;$major=(int)getenv('CC_MODSTORE_MODX')[0];$product='cookieconsentmanager'.($major===3?'3':'');
function ccClass(string $class):string{global $major;if($major===2)return $class==='modTransportPackage'?'transport.modTransportPackage':$class;return 'MODX\\Revolution\\'.($class==='modTransportPackage'?'Transport\\':'').$class;}
function moveFixture(string $from,string $to):void{check(!file_exists($to),'Existing move target');mkdir($to,0755,true);foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($from,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::SELF_FIRST) as $entry){$target=$to.substr($entry->getPathname(),strlen($from));if($entry->isDir())mkdir($target,0755,true);else check(copy($entry->getPathname(),$target),'Fixture copy');}foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($from,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::CHILD_FIRST) as $entry){if($entry->isDir())rmdir($entry->getPathname());else unlink($entry->getPathname());}rmdir($from);}
function check($ok,string $message):void{if(!$ok)throw new RuntimeException($message);}
if($task==='prepare'){
 check(!is_file($site.'core/config/config.inc.php')||filesize($site.'core/config/config.inc.php')<100,'Existing CMS refused');
 $pdo=new PDO('mysql:host=db','root',getenv('CC_MODSTORE_PASSWORD'));$pdo->exec('CREATE DATABASE `'.$database.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
 $xml=new SimpleXMLElement(file_get_contents($site.'setup/config.dist.new.xml'));
 foreach(['database_server'=>'db','database'=>$database,'database_user'=>'root','database_password'=>getenv('CC_MODSTORE_PASSWORD'),'database_connection_charset'=>'utf8mb4','database_charset'=>'utf8mb4','database_collation'=>'utf8mb4_unicode_ci','http_host'=>'127.0.0.1:'.getenv('CC_MODSTORE_PORT'),'inplace'=>'1','unpacked'=>'0','cmsadmin'=>'acceptance','cmspassword'=>bin2hex(random_bytes(24)),'cmsadminemail'=>'acceptance@example.invalid','core_path'=>$site.'core/','context_mgr_path'=>$site.'manager/','context_mgr_url'=>'/manager/','context_connectors_path'=>$site.'connectors/','context_connectors_url'=>'/connectors/','context_web_path'=>$site,'context_web_url'=>'/','remove_setup_directory'=>'0'] as $key=>$value)$xml->$key=$value;
 $xml->asXML('/opt/cc-case/private/setup.xml');chmod('/opt/cc-case/private/setup.xml',0600);file_put_contents('/opt/cc-case/private/manager.json',json_encode(['username'=>'acceptance','password'=>(string)$xml->cmspassword]));exit;
}
if($task==='finish'){
 check(is_file($site.'core/config/config.inc.php'),'CMS not installed');
 if(is_dir($site.'setup')){check(rename($site.'setup',$site.'setup.completed'),'Archive setup');file_put_contents($site.'setup.completed/.htaccess',"Require all denied\n");}
 if(getenv('CC_MODSTORE_CUSTOM')==='1'){
  $old=$site.'core/';$new='/opt/cc-case/private/core/';moveFixture(rtrim($old,'/'),rtrim($new,'/'));
  foreach([$site.'config.core.php',$site.'manager/config.core.php',$site.'connectors/config.core.php',$new.'config/config.inc.php'] as $file)if(is_file($file)){ $bytes=file_get_contents($file);$bytes=str_replace([$old,$site.'assets/','/assets/'],[$new,'/opt/cc-case/relocated-assets/','/files/'],$bytes);file_put_contents($file,$bytes); }
  if(is_dir($site.'assets'))moveFixture($site.'assets','/opt/cc-case/relocated-assets');else mkdir('/opt/cc-case/relocated-assets');
 }
 if($major===3){$config=getenv('CC_MODSTORE_CUSTOM')==='1'?'/opt/cc-case/private/core/config/config.inc.php':$site.'core/config/config.inc.php';file_put_contents($config,"\n\$config_options['load_deprecated_global_class_aliases']=false;\n",FILE_APPEND);}
 foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator('/opt/cc-case',FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::SELF_FIRST) as $entry)if(!$entry->isLink())chown($entry->getPathname(),'www-data');chown('/opt/cc-case','www-data');chown($site,'www-data');
 echo "CMS configured\n";exit;
}
$core=getenv('CC_MODSTORE_CUSTOM')==='1'?'/opt/cc-case/private/core/':$site.'core/';
$destination=(static function($file){require $file;return [$database_server??null,$dbase??null];})($core.'config/config.inc.php');check($destination===['db',$database],'Foreign database refused');
define('MODX_API_MODE',true);ob_start();require $site.'index.php';while(ob_get_level())ob_end_clean();
check($modx->query('SELECT DATABASE()')->fetchColumn()===$database,'Wrong database');check($modx->getVersionData()['full_version']===getenv('CC_MODSTORE_MODX'),'Wrong CMS');
$modx->setLogTarget('FILE');$modx->setLogLevel(2);
$assets=$modx->getOption('assets_path');$component=$core.'components/'.$product.'/';$js=$assets.'components/'.$product.'/js/cookie-consent/';
if($task==='install'||$task==='uninstall'){
 $archive=$argv[2]??'';check(str_starts_with($archive,'/opt/cc-repo/.local/')||str_starts_with($archive,'/opt/cc-case/')||str_starts_with($archive,'/opt/cc-repo/dist/'),'Local artifact only');$signature=basename($archive,'.transport.zip');check(preg_match('/^'.$product.'-1\.0\.8-pl[0-9]+$/D',$signature),'Signature');
 $target=$core.'packages/'.$signature.'.transport.zip';if(is_file($target))check(hash_file('sha256',$target)===hash_file('sha256',$archive),'Immutable ZIP collision');else check(copy($archive,$target),'Copy archive');
 $package=$modx->getObject(ccClass('modTransportPackage'),['signature'=>$signature]);if(!$package){$package=$modx->newObject(ccClass('modTransportPackage'));$package->fromArray(['package_name'=>$product,'state'=>1,'workspace'=>1],'',true,true);$package->set('signature',$signature);$package->setPackageVersionData();check($package->save(),'Register');}
 $ok=$task==='install'?$package->install():$package->uninstall();check($ok,'Native '.$task.' failed; inspect private CMS log');$modx->cacheManager->refresh();echo json_encode(['result'=>'PASS','action'=>$task,'signature'=>$signature]);exit;
}
if($task==='bootstrap-error-start'){
 $dir='/var/www/html/cc-bootstrap-error';check(!file_exists($dir),'Existing error fixture refused');mkdir($dir,0755);check(copy(dirname(__DIR__,2).'/server/modx'.$major.'-public-endpoint.example.php',$dir.'/audit.php'),'Fixture wrapper');echo '{}';exit;
}
if($task==='bootstrap-error-end'){
 check(unlink('/var/www/html/cc-bootstrap-error/audit.php'),'Remove error fixture');check(rmdir('/var/www/html/cc-bootstrap-error'),'Remove fixture directory');echo '{}';exit;
}
if($task==='cms-paths'){
 if(getenv('CC_MODSTORE_CUSTOM')==='1')foreach($modx->getCollection(ccClass('modSystemSetting'),['namespace'=>'core']) as $row){$value=$row->get('value');if(is_string($value)){$next=str_replace(['/var/www/html/core/','/var/www/html/assets/'],[$core,$assets],$value);if($next!==$value){$row->set('value',$next);check($row->save(),'CMS relocated path');}}}$modx->cacheManager->refresh();echo '{}';exit;
}
if($task==='probe-start'){
 $file=$js.'services/yandex.js';file_put_contents('/opt/cc-case/private/probe-source.js',file_get_contents($file));file_put_contents('/opt/cc-case/private/probe-bundle.sha256',hash_file('sha256',$js.'cached-cookie-consent.min.js'));file_put_contents($file,"\n// real Manager cache event\n",FILE_APPEND);echo '{}';exit;
}
if($task==='probe-end'){
 check(hash_file('sha256',$js.'cached-cookie-consent.min.js')!==trim(file_get_contents('/opt/cc-case/private/probe-bundle.sha256')),'Actual Manager cache clear did not rebuild');file_put_contents($js.'services/yandex.js',file_get_contents('/opt/cc-case/private/probe-source.js'));echo '{}';exit;
}
if($task==='http-check'){
 require_once $component.'src/CookieConsentAuditHttp.php';require_once $component.'src/CookieConsentAuditFormat.php';
 $event=['schema'=>3,'event_id'=>sprintf('%08x-1234-4123-8123-123456789abc',random_int(1,2147483647)),'consent_id'=>'12345678-1234-4123-8123-123456789abc','event'=>'accept_all','stage'=>'committed','analytics'=>true,'marketing'=>true,'external_content'=>true,'policy_version'=>'1','page'=>'/','timestamp'=>gmdate('Y-m-d\TH:i:s').'.000Z'];
 $origin='http://127.0.0.1:'.getenv('CC_MODSTORE_PORT');$path=$modx->getOption('assets_url').'components/'.$product.'/audit.php';
 $response=CookieConsentAuditHttp::post($origin,$path,json_encode($event));CookieConsentAuditHttp::acknowledgement($response,$event['event_id']);
 $found=false;foreach(glob('/opt/cc-case/private/logs/*-cookie-consent.log')?:[] as $file)foreach(CookieConsentAuditFormat::records($file) as $record)if($record['event_id']===$event['event_id'])$found=true;
 check($found,'HTTP acknowledgement without log record');echo json_encode(['result'=>'PASS','event_id'=>$event['event_id'],'recorded'=>true]);exit;
}
if($task==='snapshot-elements'){
 $result=['settings'=>[],'elements'=>[]];foreach($modx->getCollection(ccClass('modSystemSetting'),['namespace'=>'cookie_consent']) as $row)$result['settings'][$row->get('key')]=$row->get('value');
 foreach(['modChunk'=>['CookiesPopup'],'modSnippet'=>['CookieConsent','CookieConsentAssets','CookieConsentBanner','CookieConsentMap','CookieConsentVideo']] as $class=>$names)foreach($names as $name){$row=$modx->getObject(ccClass($class),['name'=>$name]);$result['elements'][$name]=['id'=>$row->get('id'),'sha256'=>hash('sha256',$row->get('snippet'))];}
 echo json_encode($result);exit;
}
if($task==='info'){echo json_encode(['modx'=>$modx->getVersionData()['full_version'],'php'=>PHP_VERSION,'assets_path'=>$assets,'assets_url'=>$modx->getOption('assets_url'),'core_path'=>$core]);exit;}
if($task==='boot')return;
if($task==='configure'){
 require_once $component.'src/CookieConsentSettings.php';require_once $component.'src/CookieConsentAuditConfiguration.php';
 $registry=CookieConsentServiceRegistry::defaults();foreach($registry['services'] as &$service){$service['config']=(array)$service['config'];$id=['google_ga4'=>'G-TEST1234','google_ads'=>'AW-12345678','yandex'=>'12345678','meta_pixel'=>'12345678','mailru'=>'12345678','vk_ads'=>'87654321','google_gtm'=>'GTM-TEST1234'][$service['loader']]??null;if($id!==null)$service['config']['id']=$id;$service['enabled']=true;}unset($service);
 $registry['services'][]=['key'=>'customer','loader'=>'custom_js','category'=>'marketing','enabled'=>true,'name'=>'Customer script','purpose'=>'Customer fixture','config'=>['path'=>$modx->getOption('assets_url').'customer.js']];
 file_put_contents($assets.'customer.js','window.__customerLoaded=(window.__customerLoaded||0)+1;');
 $options=CookieConsentSettings::defaults();$options['buttons']['accept']=false;$options['categories']=['analytics'=>true,'marketing'=>true,'external_content'=>true];
 foreach(['cookie_consent.services'=>json_encode($registry),'cookie_consent.options'=>json_encode($options),'cookie_consent.log_dir'=>'/opt/cc-case/private/logs'] as $key=>$value){$row=$modx->getObject(ccClass('modSystemSetting'),['key'=>$key]);$row->set('value',$value);check($row->save(),'Save config');}
 if(!is_dir('/opt/cc-case/private/logs'))mkdir('/opt/cc-case/private/logs',0700);
 CookieConsentAuditConfiguration::setup($modx,10000,'http://127.0.0.1:'.getenv('CC_MODSTORE_PORT'));
 $template=$modx->getObject(ccClass('modTemplate'),['templatename'=>'Modstore acceptance'])?:$modx->newObject(ccClass('modTemplate'));$template->fromArray(['templatename'=>'Modstore acceptance','content'=>'<!doctype html><html><head>[[!CookieConsentAssets]]</head><body><button data-cookie-settings-open>Settings</button>[[!CookieConsentMap? &provider=`google_maps` &src=`https://www.google.com/maps/embed?pb=fixture`]][[!CookieConsentVideo? &provider=`youtube` &url=`https://youtu.be/M7lc1UVf-VE`]][[!CookieConsentVideo? &provider=`rutube` &url=`https://rutube.ru/video/7716bd3e665725c3c008ae7ab4ff02e2/`]][[!CookieConsentVideo? &provider=`vk_video` &url=`https://vkvideo.ru/video_ext.php?oid=-123&id=456`]][[!CookieConsentBanner]]</body></html>']);check($template->save(),'Template');$resource=$modx->getObject(ccClass('modResource'),1);$resource->fromArray(['template'=>$template->get('id'),'published'=>1,'cacheable'=>0]);check($resource->save(),'Resource');$modx->cacheManager->refresh();echo '{}';exit;
}
if($task==='mode'){
 $row=$modx->getObject(ccClass('modSystemSetting'),['key'=>'cookie_consent.options']);$options=json_decode($row->get('value'),true);$options['buttons']['accept']=($argv[2]??'strict')==='legacy';$options['banner_position']=$argv[3]??'bottom-right';$row->set('value',json_encode($options));check($row->save(),'Mode');$modx->cacheManager->refresh();echo '{}';exit;
}
if($task==='edit-old'){
 $old=$assets.'js/cookie-consent/';check(is_dir($old.'services'),'Old services missing');file_put_contents($old.'services/yandex.js',"\n// customer preserved by SHA256\n",FILE_APPEND);file_put_contents($old.'services/customer-extra.js','window.__extra=1;');file_put_contents($old.'foreign.txt','FOREIGN');file_put_contents($assets.'css/foreign.css','FOREIGN');
 if(($argv[2]??'')==='syntax')file_put_contents($old.'services/yandex.js',"\nfunction { invalid migration\n",FILE_APPEND);
 $snapshot=['invalid'=>($argv[2]??'')==='syntax','adapter'=>hash_file('sha256',$old.'services/yandex.js'),'extra'=>hash_file('sha256',$old.'services/customer-extra.js'),'bundle'=>hash_file('sha256',$old.'cached-cookie-consent.min.js')];file_put_contents('/opt/cc-case/private/before-upgrade.json',json_encode($snapshot));echo json_encode($snapshot);exit;
}
if($task==='verify-upgrade'){
 $before=json_decode(file_get_contents('/opt/cc-case/private/before-upgrade.json'),true);check(hash_file('sha256',$js.'services/yandex.js')===$before['adapter'],'Customer adapter changed');check(hash_file('sha256',$js.'services/customer-extra.js')===$before['extra'],'Extra adapter changed');check(file_get_contents($assets.'js/cookie-consent/foreign.txt')==='FOREIGN','Foreign file deleted');check(file_get_contents($assets.'css/foreign.css')==='FOREIGN','Foreign CSS deleted');check(!is_file($js.'services/mock-marketing.js'),'Mock installed');if(empty($before['invalid']))check(!is_file($assets.'js/cookie-consent/runtime.js'),'Old runtime retained');else{check(hash_file('sha256',$js.'cached-cookie-consent.min.js')===$before['bundle'],'Upgrade build failure lost working bundle');require_once $component.'src/CookieConsentBundleManager.php';check(CookieConsentBundleManager::status($modx)['state']==='error','Upgrade failure not visible');}
 $state=json_decode(file_get_contents($component.'adapter-checksums.json'),true);check(count($state['versions'])>=2,'History lost');echo json_encode(['result'=>'PASS','adapter_sha256'=>$before['adapter'],'extra_sha256'=>$before['extra'],'history'=>array_keys($state['versions'])]);exit;
}
if($task==='repair-upgrade'){
 $before=json_decode(file_get_contents('/opt/cc-case/private/before-upgrade.json'),true);if(!empty($before['invalid'])){ $file=$js.'services/yandex.js';file_put_contents($file,str_replace("\nfunction { invalid migration\n",'',file_get_contents($file)));$before['adapter']=hash_file('sha256',$file);$before['invalid']=false;file_put_contents('/opt/cc-case/private/before-upgrade.json',json_encode($before));}echo '{}';exit;
}
if($task==='rebuild'||$task==='cache'||$task==='failure'){
 require_once $component.'src/CookieConsentBundleManager.php';$modx->context=$modx->getObject(ccClass('modContext'),['key'=>'mgr']);$_SESSION['modx.user.contextTokens']=['mgr'=>1];$modx->user=$modx->getObject(ccClass('modUser'),['username'=>'acceptance']);$modx->user->sessionContexts=['mgr'=>$modx->user->get('id')];
 if($task==='failure'){$file=$js.'services/yandex.js';$bytes=file_get_contents($file);$before=hash_file('sha256',$js.'cached-cookie-consent.min.js');file_put_contents($file,$bytes."\nfunction { invalid");try{CookieConsentBundleManager::rebuild($modx,true);throw new RuntimeException('Expected parse failure');}catch(Throwable $e){check($e->getMessage()!=='Expected parse failure','No parse failure');}finally{file_put_contents($file,$bytes);}check(hash_file('sha256',$js.'cached-cookie-consent.min.js')===$before,'Failure destroyed bundle');check(CookieConsentBundleManager::status($modx)['state']==='error','Failure status');}
 elseif($task==='cache'){file_put_contents($js.'services/yandex.js',"\n// cache refresh probe\n",FILE_APPEND);$before=hash_file('sha256',$js.'cached-cookie-consent.min.js');$modx->invokeEvent('OnSiteRefresh');check(hash_file('sha256',$js.'cached-cookie-consent.min.js')!==$before,'Cache event did not build');file_put_contents($js.'services/yandex.js',substr(file_get_contents($js.'services/yandex.js'),0,-strlen("\n// cache refresh probe\n")));CookieConsentBundleManager::rebuild($modx,true);}
 else CookieConsentBundleManager::rebuild($modx,true);
 echo json_encode(['result'=>'PASS','action'=>$task]);exit;
}
if($task==='snapshot-uninstall'){
 $files=glob('/opt/cc-case/private/logs/*-cookie-consent.log')?:[];check(count($files)>0,'Audit log missing before uninstall');
 foreach([$component.'customer-note.txt',$assets.'components/'.$product.'/customer-note.txt'] as $file){file_put_contents($file,'customer data survives native uninstall');$files[]=$file;}
 if(is_file('/opt/cc-case/private/before-upgrade.json')){$files[]=$js.'services/yandex.js';$files[]=$js.'services/customer-extra.js';$files[]=$assets.'js/cookie-consent/foreign.txt';$files[]=$assets.'css/foreign.css';}
 $snapshot=[];foreach($files as $file)$snapshot[$file]=hash_file('sha256',$file);file_put_contents('/opt/cc-case/private/uninstall-data.json',json_encode($snapshot));echo '{}';exit;
}
if($task==='verify-uninstall'){
 $snapshot=is_file('/opt/cc-case/private/uninstall-data.json')?json_decode(file_get_contents('/opt/cc-case/private/uninstall-data.json'),true):[];foreach($snapshot as $file=>$hash)check(is_file($file)&&hash_file('sha256',$file)===$hash,'User data/log changed on uninstall');
 check(!$modx->getObject(ccClass('modNamespace'),['name'=>'cookie_consent']),'Namespace retained');check(!is_file($assets.'components/'.$product.'/audit.php'),'Public runtime retained');check(!is_file($assets.'components/'.$product.'/bootstrap.php'),'Bootstrap retained');
 if(is_file('/opt/cc-case/private/before-upgrade.json')){check(is_file($js.'services/yandex.js'),'Edited adapter removed');check(is_file($assets.'js/cookie-consent/foreign.txt'),'Foreign removed');}
 echo json_encode(['result'=>'PASS','action'=>'verify-uninstall']);exit;
}
throw new RuntimeException('Unknown action');
