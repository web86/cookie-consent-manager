<?php
// Disposable fixtures only. Component installation MUST use authenticated native PM HTTP processors.
if(PHP_SAPI!=='cli'||!is_dir('/opt/cc-source/tests/transport'))exit(1);
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();
if(!getenv('CC_DB_PASSWORD')||!in_array((string)$modx->query('SELECT DATABASE()')->fetchColumn(),['cookie_consent_test','cookie_consent_transport_clean','cookie_consent_transport_publiccore'],true))throw new RuntimeException('Disposable database/environment required');
$op=$argv[1]??'';$private=$argv[2]??'/opt/cc-clean';
if($op==='reset-pristine'){
 if($private!=='/opt/cc-clean')throw new RuntimeException('Pristine clean fixture only');
 $r=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.services']);$v=json_decode($r->get('value'),true);foreach($v['services'] as $service)if($service['enabled'])throw new RuntimeException('Not pristine');
 $r=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.package_state_dir']);$dir=$r->get('value');
 $st=json_decode(file_get_contents($dir.'/state.json'),true);if($st['active']||$st['mode']!=='install')throw new RuntimeException('Uninstall pristine first');
 foreach(['modSnippet'=>['name'=>'CookieConsentRegistry'],'modChunk'=>['name'=>'CookiesPopup'],'modNamespace'=>['name'=>'cookie_consent']] as $class=>$criteria){$row=$modx->getObject($class,$criteria);if($row)$row->remove();}
 foreach($modx->getCollection('modSystemSetting',['namespace'=>'cookie_consent']) as $row)$row->remove();
 rename($dir,$dir.'.pristine-evidence-'.time());$modx->cacheManager->refresh();echo 'Pristine fixture reset; prior state archived';exit;
}
if($op==='drop-extracted'){
 $sig=$argv[3];if(!preg_match('/^cookieconsent-0\.1\.0-beta[0-9]+$/D',$sig))throw new RuntimeException('Fixture signature');
 $path=MODX_CORE_PATH.'packages/'.$sig;
 if(is_dir($path)){foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($path,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::CHILD_FIRST) as $f){if($f->isDir())rmdir($f->getPathname());else unlink($f->getPathname());}rmdir($path);}echo 'Extracted package cache removed; installed runtime and ledger preserved';exit;
}
if($op==='reset-manual-baseline'){
 if($private!=='/opt/cc-private')throw new RuntimeException('Manual local fixture only');
 $r=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.package_state_dir']);$dir=$r->get('value');$state=json_decode(file_get_contents($dir.'/state.json'),true);if($state['active'])throw new RuntimeException('Native uninstall first');
 $alt=$modx->getObject('modSnippet',['name'=>'CookieConsentRegistry_package_0_1_0_beta1']);$main=$modx->getObject('modSnippet',['name'=>'CookieConsentRegistry']);if($alt){if($alt->get('snippet')!==$main->get('snippet'))throw new RuntimeException('Changed fixture alternative retained');file_put_contents($private.'/generated-stock-alternative.json',json_encode($alt->toArray()));$alt->remove();}
 // Known empty-PK artifact created by the first disposable M4 fixture, before its installer fix.
 $orphan=$modx->getObject('modMenu',['text'=>'']);if($orphan&&$orphan->get('namespace')==='cookie_consent'&&$orphan->get('action')==='index'){file_put_contents($private.'/fixture-empty-menu.json',json_encode($orphan->toArray()));$orphan->remove();}
 foreach(['cookie_consent.package_state_dir','cookie_consent.package_version'] as $key){$row=$modx->getObject('modSystemSetting',['key'=>$key]);if($row)$row->remove();}
 rename($dir,$dir.'.development-archive-'.time());$modx->cacheManager->refresh();echo 'Manual fixture restored; development state archived';exit;
}
if($op==='test-engine'){
 if($private!=='/opt/cc-clean'||!in_array($argv[3],['MyISAM','InnoDB'],true))throw new RuntimeException('Disposable engine test only');
 $modx->exec('ALTER TABLE '.$modx->getTableName('modChunk').' ENGINE='.$argv[3]);echo 'Fixture chunk engine changed';exit;
}
if($op==='backup-gap'){
 if($private!=='/opt/cc-private')throw new RuntimeException('Disposable manual fixture only');
 $s=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.package_state_dir']);$dir=$s->get('value');$state=json_decode(file_get_contents($dir.'/state.json'),true);
 foreach($state['files'] as $relative=>$entry)if(!empty($entry['original'])){$path=$dir.'/'.$entry['original'];if($argv[3]==='hide'){if(!is_file($path))throw new RuntimeException('Backup unavailable');rename($path,$path.'.fixture-hidden');}else{if(!is_file($path.'.fixture-hidden'))throw new RuntimeException('Hidden backup unavailable');rename($path.'.fixture-hidden',$path);}echo 'Fixture backup visibility changed';exit;}
 throw new RuntimeException('No manual backup');
}
if($op==='snapshot'){
 $result=['modx'=>$modx->getVersionData()['full_version'],'settings'=>[],'elements'=>[],'templates'=>[],'resources'=>[],'policies'=>[],'menus'=>[]];
 foreach($modx->getCollection('modSystemSetting',['namespace'=>'cookie_consent']) as $r)$result['settings'][$r->get('key')]=hash('sha256',(string)$r->get('value'));
 foreach(['modSnippet','modChunk'] as $class)foreach($modx->getCollection($class) as $r)if(strpos($r->get('name'),'Cookie')===0)$result['elements'][$class.':'.$r->get('name')]=['id'=>$r->get('id'),'sha256'=>hash('sha256',$r->get('snippet'))];
 foreach(['modTemplate'=>'templates','modResource'=>'resources','modAccessPolicy'=>'policies'] as $class=>$key)foreach($modx->getCollection($class) as $r)$result[$key][$r->getPrimaryKey()]=hash('sha256',json_encode($r->toArray()));
 foreach($modx->getCollection('modMenu',['namespace'=>'cookie_consent']) as $r)$result['menus'][]=$r->get('text');
 $state=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.package_state_dir']);$path=$state?$state->get('value'):'';
 $result['state']=$path&&is_file($path.'/state.json')?json_decode(file_get_contents($path.'/state.json'),true):null;
 if($result['state']){unset($result['state']['files'],$result['state']['objects']);}
 echo json_encode($result);exit;
}
if($op==='get'){echo $modx->getObject('modSystemSetting',['key'=>$argv[3]])->get('value');exit;}
if($op==='set'){$r=$modx->getObject('modSystemSetting',['key'=>$argv[3]]);$r->set('value',stream_get_contents(STDIN));$r->save();$modx->cacheManager->refresh();echo 'saved';exit;}
if($op==='customize'){
 $r=$modx->getObject('modChunk',['name'=>'CookiesPopup']);$r->set('snippet',$r->get('snippet').'<!-- Customer custom chunk -->');$r->save();
 $r=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.texts']);$texts=json_decode($r->get('value'),true);$texts['locales']['tr']['reject']='Reddet preserved';$texts['locales']['ru']['notice_html']='<p>Customer notice <a href="/privacy">link</a></p>';$r->set('value',json_encode($texts));$r->save();
 $r=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.options']);$v=json_decode($r->get('value'),true);$v['ttl_days']=123;$r->set('value',json_encode($v));$r->save();
 $r=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.services']);$v=json_decode($r->get('value'),true);$v['services'][0]['purpose_id']='customer.analytics';$r->set('value',json_encode($v));$r->save();$modx->cacheManager->refresh();echo 'customized';exit;
}
if($op==='credentials'){echo file_get_contents($private.'/manager.json');exit;}
if($op==='runtime-hashes'){$result=[];foreach(['/var/www/html/assets/components/cookieconsent',MODX_CORE_PATH.'components/cookieconsent'] as $path)if(is_dir($path))foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($path,FilesystemIterator::SKIP_DOTS)) as $f)if($f->isFile()&&strpos($f->getPathname(),'/.stage/')===false)$result[$f->getPathname()]=hash_file('sha256',$f->getPathname());echo json_encode($result);exit;}
if($op==='audit-status'){require MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentAuditConfiguration.php';echo json_encode(CookieConsentAuditConfiguration::status($modx));exit;}
throw new RuntimeException('Unknown fixture command');
