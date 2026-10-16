<?php
// CLI-only, named disposable databases. Never copies component runtime or canonical sources.
if(PHP_SAPI!=='cli'||!getenv('CC_DB_PASSWORD'))exit(1);
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();
$db=$modx->query('SELECT DATABASE()')->fetchColumn();
if(!in_array($db,['cookie_consent_test','cookie_consent_transport_clean','cookie_consent_transport_publiccore','cookie_consent_audit_visibility'],true)||$modx->getVersionData()['full_version']!=='2.8.8-pl')exit(1);
$private=dirname(rtrim(MODX_CORE_PATH,'/'));if($db==='cookie_consent_transport_publiccore')$private='/opt/cc-publiccore';
$action=$argv[1]??'';$names=['CookiesPopup'=>'modChunk','CookieConsent'=>'modSnippet','CookieConsentMap'=>'modSnippet','CookieConsentVideo'=>'modSnippet','CookieConsentAssets'=>'modSnippet','CookieConsentBanner'=>'modSnippet'];
function setValue($key,$value){global $modx;$s=$modx->getObject('modSystemSetting',['key'=>$key])?:$modx->newObject('modSystemSetting');$s->fromArray(['key'=>$key,'value'=>is_string($value)?$value:json_encode($value)],'',true,true);if(!$s->save())throw new RuntimeException('Setting save');}
if($action==='credentials'){echo file_get_contents($private.'/manager.json');exit;}
if($action==='snapshot'||$action==='installed'){
 $out=['modx'=>$modx->getVersionData()['full_version'],'php'=>PHP_VERSION,'settings'=>[],'elements'=>[],'other'=>[],'files'=>[],'logs'=>[],'audit'=>null];
 foreach($modx->getCollection('modSystemSetting',['namespace'=>'cookie_consent']) as $s)$out['settings'][$s->get('key')]=hash('sha256',$s->get('value'));
 foreach($names as $name=>$class){$s=$modx->getObject($class,['name'=>$name]);if(!$s)continue;$a=$s->toArray();unset($a['snippet'],$a['content']);$out['elements'][$name]=['id'=>$s->get('id'),'metadata'=>hash('sha256',json_encode($a)),'source'=>hash('sha256',$s->get('snippet')),'count'=>$modx->getCount($class,['name'=>$name])];}
 foreach(['modChunk','modSnippet','modTemplate','modResource','modCategory'] as $class)foreach($modx->getCollection($class) as $s)if(!isset($names[$s->get('name')??'']))$out['other'][$class.':'.$s->getPrimaryKey()]=hash('sha256',json_encode($s->toArray()));
 $s=$modx->getObject('modSystemSetting',['key'=>'beta102.sentinel']);$out['other']['setting']= $s?hash('sha256',json_encode($s->toArray())):null;
 $s=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.log_dir']);$dir=$s?(string)$s->get('value'):'';
 if($dir!=='')foreach(glob(rtrim($dir,'/').'/*-cookie-consent.log')?:[] as $p)$out['logs'][basename($p)]=hash_file('sha256',$p);
 try{if(!is_file(MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentAuditConfiguration.php'))throw new RuntimeException('Not installed');require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentAuditConfiguration.php';$cfg=CookieConsentAuditConfiguration::forModx($modx);$out['audit']=['key'=>hash('sha256',$cfg['rate_limit_key']),'config'=>hash('sha256',json_encode($cfg))];}catch(Throwable $e){}
 if($action==='installed'){$spec=json_decode(file_get_contents($argv[2]),true);foreach($spec['files'] as $file){[$kind,$path]=explode('/',$file['target'],2);$p=$modx->getOption($kind.'_path').$path;$out['files'][$file['target']]=is_file($p)?hash_file('sha256',$p):null;}}
 foreach($out as &$v)if(is_array($v))ksort($v);unset($v);echo json_encode($out);exit;
}
if($action==='configure'){
 require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentSettings.php';
 $r=CookieConsentServiceRegistry::defaults();foreach($r['services'] as &$s){$s['enabled']=in_array($s['key'],['yandex','mailru','yandex_maps'],true);if($s['key']==='yandex'){$s['config']['id']='12345678';$s['purpose_id']='owner.statistics';}if($s['key']==='mailru')$s['config']['id']='87654321';}unset($s);setValue('cookie_consent.services',$r);
 $o=CookieConsentSettings::defaults();$o['ttl_days']=123;$o['categories']=['analytics'=>true,'marketing'=>false,'external_content'=>true];setValue('cookie_consent.options',$o);
 $t=CookieConsentTexts::defaults();$t['locales']['ru']['notice_html']='<p>Текст владельца RU <a href="/privacy">Политика</a></p>';$t['locales']['en']=['notice_html'=>'<p>Owner EN notice <a href="/privacy">Policy</a></p>','analytics_name'=>'Owner statistics'];setValue('cookie_consent.texts',$t);
 $dir=$private.'/beta102-logs';if(!is_dir($dir))mkdir($dir,0700);chown($dir,'www-data');chmod($dir,0700);setValue('cookie_consent.log_dir',$dir);
 require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentAuditConfiguration.php';
 setValue('cookie_consent.audit_config_file','');setValue('cookie_consent.audit','');CookieConsentAuditConfiguration::setup($modx,10000,'http://127.0.0.1:'.$argv[2]);
 require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentAuditFormat.php';
 $historical=['schema'=>1,'server_time'=>'2020-01-01T00:00:00Z','event_id'=>'aaaaaaaa-aaaa-4aaa-8aaa-000000000001','consent_id'=>'bbbbbbbb-bbbb-4bbb-8bbb-000000000001','ip'=>'127.0.0.1','user_agent'=>'Synthetic historical sentinel','event'=>'reject','stage'=>'committed','categories'=>['necessary'=>true,'analytics'=>false,'marketing'=>false],'policy_version'=>'1','page'=>'/sentinel','client_time'=>'2020-01-01T00:00:00.000Z'];
 if(!is_file($dir.'/2020-01-cookie-consent.log'))file_put_contents($dir.'/2020-01-cookie-consent.log',CookieConsentAuditFormat::HEADER."\n".json_encode($historical)."\n");
 foreach($names as $name=>$class){$s=$modx->getObject($class,['name'=>$name]);if(!$s){if($name==='CookieConsentVideo')continue;throw new RuntimeException('Missing canonical');}$s->set('description','Keep metadata '.$name);$s->setProperties(['owner'=>['name'=>'owner','value'=>'keep-'.$name,'type'=>'textfield']]);$s->save();}
 $s=$modx->getObject('modChunk',['name'=>'Beta102 unrelated'])?:$modx->newObject('modChunk');$s->fromArray(['name'=>'Beta102 unrelated','snippet'=>'<p>Unrelated owner content</p>'],'',true,true);$s->save();setValue('beta102.sentinel','Keep this setting');
 $modx->cacheManager->refresh();echo json_encode(['configured'=>true]);exit;
}
if($action==='pages'){
 $out=[];$lang=$argv[2]??'en';if(!in_array($lang,['ru','en'],true))exit(1);$key='beta102-'.$lang;
 $c=$modx->getObject('modContext',['key'=>$key])?:$modx->newObject('modContext');$c->set('key',$key);$c->save();
 foreach(['cultureKey'=>$lang,'site_url'=>'http://127.0.0.1:'.$argv[3].'/','base_url'=>'/'] as $k=>$v){$s=$modx->getObject('modContextSetting',['context_key'=>$key,'key'=>$k])?:$modx->newObject('modContextSetting');$s->fromArray(['context_key'=>$key,'key'=>$k,'value'=>$v],'',true,true);$s->save();}
 foreach(['standard-split','fenom-split','fenom-legacy'] as $mode){$head=$mode==='standard-split'?'[[!CookieConsentAssets]]':($mode==='fenom-split'?"{'!CookieConsentAssets' | snippet}":'');$body=$mode==='standard-split'?'[[!CookieConsentBanner]]':"{'!".($mode==='fenom-legacy'?'CookieConsent':'CookieConsentBanner')."' | snippet}";
 $name='Beta102 '.$lang.' '.$mode;$t=$modx->getObject('modTemplate',['templatename'=>$name])?:$modx->newObject('modTemplate');$t->fromArray(['templatename'=>$name,'content'=>'<!doctype html><html lang="'.$lang.'"><head><meta charset="UTF-8">'.$head.'</head><body><span id="cache-source">[^s^]</span><button data-cookie-settings-open>Settings</button><div data-cc-map-provider="yandex_maps" data-cc-map-src="https://yandex.ru/map-widget/v1/?ll=37.62%2C55.75&amp;z=10"></div>'.$body.'</body></html>'],'',true,true);$t->save();
 $r=$modx->getObject('modResource',['alias'=>$lang.'-'.$mode,'context_key'=>$key])?:$modx->newObject('modResource');$r->fromArray(['pagetitle'=>$name,'alias'=>$lang.'-'.$mode,'context_key'=>$key,'template'=>$t->get('id'),'published'=>1,'cacheable'=>1],'',true,true);$r->save();$out[$mode]=(int)$r->get('id');}
 file_put_contents('/var/www/html/beta102.php',"<?php require __DIR__.'/config.core.php';require MODX_CORE_PATH.'model/modx/modx.class.php';\$c=\$_GET['ctx']??'beta102-en';if(!in_array(\$c,['beta102-en','beta102-ru'],true))exit;\$modx=new modX();\$modx->initialize(\$c);\$modx->handleRequest();");$modx->cacheManager->refresh();echo json_encode($out);exit;
}
if($action==='parser'){setValue('parser_class',$argv[2]==='standard'?'modParser':'pdoParser');setValue('parser_class_path',MODX_CORE_PATH.'components/pdotools/model/pdotools/');setValue('pdotools_fenom_default','1');setValue('pdotools_fenom_parser','1');setValue('pdotools_fenom_cache','1');setValue('pdotools_fenom_syntax',($argv[3]??'')==='all'?'#\\{#':'');$modx->cacheManager->refresh();exit;}
if($action==='visibility'){require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentSettings.php';$s=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.options']);$o=json_decode($s->get('value'),true);foreach(CookieConsentSettings::CATEGORIES as $i=>$c)$o['categories'][$c]=(bool)((int)$argv[2]&(1<<$i));setValue('cookie_consent.options',$o);$modx->cacheManager->refresh();exit;}
if($action==='record'){require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentAuditFormat.php';$dir=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.log_dir'])->get('value');$file=rtrim($dir,'/').'/'.gmdate('Y-m').'-cookie-consent.log';$out=[];if(is_file($file))foreach(CookieConsentAuditFormat::records($file) as $r)if($r['event_id']===$argv[2])$out[]=$r;echo json_encode(['records'=>$out,'file'=>basename($file),'bytes'=>is_file($file)?filesize($file):0]);exit;}
if($action==='log-size'){echo is_file(MODX_CORE_PATH.'cache/logs/error.log')?filesize(MODX_CORE_PATH.'cache/logs/error.log'):0;exit;}
if($action==='log'){echo is_file(MODX_CORE_PATH.'cache/logs/error.log')?substr(file_get_contents(MODX_CORE_PATH.'cache/logs/error.log'),(int)$argv[2]):'';exit;}
throw new RuntimeException('Unknown beta102 action');
