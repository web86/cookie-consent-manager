<?php
if(PHP_SAPI!=='cli'||!getenv('CC_DB_PASSWORD'))exit(1);
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();
if(!in_array($modx->query('SELECT DATABASE()')->fetchColumn(),['cookie_consent_modx3_test','cookie_consent_modx3_transport_clean'],true))exit(1);
if(($argv[1]??'')==='activate-unified') {
 // Explicitly adopt stock in this development fixture; never update customer elements on install.
 foreach(['CookieConsent','CookieConsentMap'] as $name){$file=$name==='CookieConsent'?'modx3-consent-snippet.php':'modx3-map-snippet.php';$source=preg_replace('/^<\?php\s*/','',file_get_contents('/opt/cc-source/server/'.$file));$r=$modx->getObject('MODX\Revolution\modSnippet',['name'=>$name]);$r->set('snippet',trim($source));$r->save();}
 $modx->cacheManager->refresh();exit;
}
if(($argv[1]??'')==='resource') {
 $r=$modx->getObject('MODX\Revolution\modResource',['alias'=>'cc-ux-fixture']);
 if(($argv[2]??'')==='remove'){if($r)$r->remove();}
 else {$r=$r?:$modx->newObject('MODX\Revolution\modResource');$r->fromArray(['pagetitle'=>'CookieConsent UX fixture','alias'=>'cc-ux-fixture','published'=>1,'context_key'=>'web','template'=>0,'cacheable'=>1,'content'=>stream_get_contents(STDIN)],'',true,true);$r->save();echo $r->get('id');}
 $modx->cacheManager->refresh();exit;
}
if(($argv[1]??'')==='context'){$r=$modx->getObject('MODX\Revolution\modContextSetting',['context_key'=>'web','key'=>'cultureKey']);if(($argv[2]??'')==='get'){echo json_encode($r?['value'=>$r->get('value')]:[]);exit;}$v=stream_get_contents(STDIN);if($v==='__REMOVE__'){if($r)$r->remove();}else{$r=$r?:$modx->newObject('MODX\Revolution\modContextSetting');$r->fromArray(['context_key'=>'web','key'=>'cultureKey','value'=>$v],'',true,true);$r->save();}$modx->cacheManager->refresh();exit;}
if(($argv[1]??'')==='audit-state') {
 $q=$modx->getObject('MODX\Revolution\Registry\Db\modDbRegisterQueue',['name'=>'cookieconsent-audit-private']);
 $s=$modx->getObject('MODX\Revolution\modSystemSetting',['key'=>'cookie_consent.audit']);$d=$modx->getObject('MODX\Revolution\modSystemSetting',['key'=>'cookie_consent.log_dir'])->get('value');$logs=[];
 foreach(array_merge(glob($d.'/*-cookie-consent.log')?:[],is_file($d.'/.rate/state.json')?[$d.'/.rate/state.json']:[]) as $f)$logs[basename($f)]=hash_file('sha256',$f);
 echo json_encode(['key_hash'=>hash('sha256',json_encode($q->get('options'))),'config_hash'=>hash('sha256',$s->get('value')),'logs'=>$logs]);exit;
}
if(($argv[1]??'')==='managed-check') {
 require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentAuditConfiguration.php';
 $v=CookieConsentAuditConfiguration::forModx($modx);echo json_encode(['origin'=>$v['site_origin'],'limit'=>$v['rate_limit_per_minute'],'key_length'=>strlen($v['rate_limit_key']),'key_hash'=>hash('sha256',$v['rate_limit_key'])]);exit;
}
throw new RuntimeException('Unknown fixture operation');
