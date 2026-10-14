<?php
// Disposable database only; never installs component files or DB objects.
if(PHP_SAPI!=='cli'||!getenv('CC_DB_PASSWORD'))exit(1);
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();
if(!in_array($modx->query('SELECT DATABASE()')->fetchColumn(),['cookie_consent_modx3_test','cookie_consent_modx3_clean','cookie_consent_modx3_transport_clean','cookie_consent_modx3_transport_publiccore'],true))exit(1);
$private=$argv[2];$action=$argv[1];
if($action==='credentials'){echo file_get_contents($private.'/manager.json');exit;}
if($action==='archive-extracted'){
 $signature=$argv[3];if(!preg_match('/^cookieconsent-(?:0\.1\.0-beta[0-9]+|1\.0\.[0-9]{1,4})$/D',$signature))exit(1);$path=MODX_CORE_PATH.'packages/'.$signature;
 if(is_dir($path)){rename($path,MODX_CORE_PATH.'packages/'.$signature.'.development-archive-'.time());}echo 'Extracted development package archived';exit;
}
if($action==='get'){echo $modx->getObject('MODX\Revolution\modSystemSetting',['key'=>$argv[3]])->get('value');exit;}
if($action==='set'){$r=$modx->getObject('MODX\Revolution\modSystemSetting',['key'=>$argv[3]]);$r->set('value',stream_get_contents(STDIN));$r->save();$modx->cacheManager->refresh();exit;}
if($action==='customize'){
 foreach(['MODX\Revolution\modChunk'=>'CookiesPopup','MODX\Revolution\modSnippet'=>'CookieConsentRegistry'] as $class=>$name){$r=$modx->getObject($class,['name'=>$name]);$r->set('snippet',$r->get('snippet').($class==='MODX\Revolution\modChunk'?'<!-- User customization retained -->':"\n// User customization retained"));$r->setProperties(['user_parameter'=>'retained']);$r->save();}
 $r=$modx->getObject('MODX\Revolution\modSystemSetting',['key'=>'cookie_consent.options']);$v=json_decode($r->get('value'),true);$v['ttl_days']=123;$r->set('value',json_encode($v));$r->save();
 $r=$modx->getObject('MODX\Revolution\modSystemSetting',['key'=>'cookie_consent.services']);$v=json_decode($r->get('value'),true);$v['services'][0]['purpose_id']='customer.analytics';$v['services'][0]['config']['webvisor']=false;$r->set('value',json_encode($v));$r->save();
 $r=$modx->getObject('MODX\Revolution\modSystemSetting',['key'=>'cookie_consent.texts']);$v=json_decode($r->get('value'),true);$v['locales']['tr']['reject']='User translation';$v['locales']['ru']['notice_html']='<p>User HTML retained</p>';$r->set('value',json_encode($v));$r->save();$modx->cacheManager->refresh();exit;
}
if($action==='snapshot'){
 $out=['version'=>$modx->getVersionData()['full_version'],'settings'=>[],'auditRegistry'=>[],'elements'=>[],'menus'=>[],'resources'=>[],'templates'=>[],'policies'=>[],'data'=>[],'runtime'=>[],'legacyStateExists'=>is_dir(MODX_CORE_PATH.'.cookieconsent-package')];
 $q=$modx->getObject('MODX\Revolution\Registry\Db\modDbRegisterQueue',['name'=>'cookieconsent-audit-private']);
 if($q){$out['auditRegistry']['queue']=hash('sha256',json_encode($q->toArray()));foreach($modx->getCollection('MODX\Revolution\Registry\Db\modDbRegisterTopic',['queue'=>$q->get('id')]) as $t){$out['auditRegistry']['topic:'.$t->get('id')]=hash('sha256',json_encode($t->toArray()));foreach($modx->getCollection('MODX\Revolution\Registry\Db\modDbRegisterMessage',['topic'=>$t->get('id')]) as $m)$out['auditRegistry']['message:'.$m->get('id')]=hash('sha256',json_encode($m->toArray()));}}
 foreach($modx->getCollection('MODX\Revolution\modSystemSetting',['namespace'=>'cookie_consent']) as $r)$out['settings'][$r->get('key')]=hash('sha256',$r->get('value'));
 foreach(['MODX\Revolution\modSnippet','MODX\Revolution\modChunk'] as $class)foreach($modx->getCollection($class) as $r)if(strpos($r->get('name'),'Cookie')===0){$fields=$r->toArray();unset($fields['snippet'],$fields['content'],$fields['static']);$out['elements'][$class.':'.$r->get('name')]=['id'=>$r->get('id'),'hash'=>hash('sha256',json_encode($r->toArray())),'code_sha256'=>hash('sha256',$r->get('snippet')),'metadata_sha256'=>hash('sha256',json_encode($fields))];}
 foreach(['MODX\Revolution\modMenu'=>'menus','MODX\Revolution\modResource'=>'resources','MODX\Revolution\modTemplate'=>'templates','MODX\Revolution\modAccessPolicy'=>'policies'] as $class=>$key)foreach($modx->getCollection($class) as $r)$out[$key][(string)$r->getPrimaryKey()]=hash('sha256',json_encode($r->toArray()));
 foreach(array_merge(glob($private.'/logs/*-cookie-consent.log'),glob($private.'/configs/*.json'),glob($private.'/config.php')) as $f)$out['data'][basename($f)]=hash_file('sha256',$f);
 foreach(array_merge(glob('/var/www/html/logs/cookies/*-cookie-consent.log')?:[],is_file('/var/www/html/logs/cookies/.rate/state.json')?['/var/www/html/logs/cookies/.rate/state.json']:[]) as $f)$out['data']['public:'.basename($f)]=hash_file('sha256',$f);
 foreach(['/var/www/html/assets/components/cookieconsent','/var/www/html/assets/js/cookie-consent','/var/www/html/assets/css',MODX_CORE_PATH.'components/cookieconsent'] as $dir)if(is_dir($dir))foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir,FilesystemIterator::SKIP_DOTS)) as $f)if($f->isFile()&&strpos($f->getPathname(),'/.stage/')===false)$out['runtime'][$f->getPathname()]=hash_file('sha256',$f->getPathname());
 foreach($out as &$value)if(is_array($value))ksort($value);unset($value);echo json_encode($out);exit;
}
throw new RuntimeException('Unknown control action');
