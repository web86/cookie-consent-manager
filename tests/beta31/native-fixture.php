<?php
// Named disposable MODX databases only; no production data.
if(PHP_SAPI!=='cli'||!getenv('CC_DB_PASSWORD'))exit(1);
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();
if(!in_array($modx->query('SELECT DATABASE()')->fetchColumn(),['cookie_consent_transport_clean','cookie_consent_transport_publiccore'],true))exit(1);
$elements=['modChunk'=>['CookiesPopup'],'modSnippet'=>['CookieConsent','CookieConsentAssets','CookieConsentBanner','CookieConsentRegistry','CookieConsentMap']];
$action=$argv[1]??'';
function category($name,$parent=0){global $modx;$c=$modx->getObject('modCategory',['category'=>$name])?:$modx->newObject('modCategory');$c->fromArray(['category'=>$name,'parent'=>$parent],'',true,true);if(!$c->save())throw new RuntimeException('Fixture category save');return $c->get('id');}
if($action==='existing'){
 $parent=category('Customer parent');category('CookieConsent',$parent);
 foreach(['modChunk','modSnippet'] as$class){$e=$modx->newObject($class);$e->fromArray(['name'=>'Unrelated customer '.$class,'category'=>$parent,'description'=>'Unrelated metadata','snippet'=>$class==='modChunk'?'<p>Customer</p>':'return "Customer";'],'',true,true);if(!$e->save())throw new RuntimeException('Fixture element save');}
}elseif($action==='customize'){
 $custom=category('Customer elements');$i=0;
 foreach($elements as$class=>$names)foreach($names as$name){$e=$modx->getObject($class,['name'=>$name]);if(!$e){if($name==='CookieConsentRegistry')continue;throw new RuntimeException('Missing canonical');}$e->set('category',$i++%2?$custom:0);$e->set('description','Preserve '.$name);$e->setProperties(['customer_parameter'=>['name'=>'customer_parameter','value'=>'keep-'.$name,'type'=>'textfield']]);$e->set('snippet',$e->get('snippet').($class==='modChunk'?'<!-- Previous custom source -->':"\n// Previous custom source"));if(!$e->save())throw new RuntimeException('Fixture custom save');}
 $registry=$modx->getObject('modSnippet',['name'=>'CookieConsentRegistry']);
 if($registry){$registry->set('snippet','file_put_contents("/opt/cc-publiccore/registry-called","called"); throw new RuntimeException("Retired Registry called");');$registry->save();}
 $texts=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.texts']);$v=json_decode($texts->get('value'),true);$v['locales']['ru']['notice_html']='<p>Customer notice <a href="/policy">Policy</a></p>';$texts->set('value',json_encode($v));$texts->save();
 $services=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.services']);$v=json_decode($services->get('value'),true);$v['services'][0]['purpose_id']='customer.analytics';$services->set('value',json_encode($v));$services->save();
 $private='/opt/cc-publiccore';$logs=$private.'/logs';if(!is_dir($logs))mkdir($logs,0700);$path=$logs.'/'.gmdate('Y-m').'-cookie-consent.log';if(!is_file($path)){require_once '/opt/cc-source/server/src/CookieConsentAuditFormat.php';$r=['schema'=>1,'server_time'=>gmdate('Y-m-d\TH:i:s\Z'),'event_id'=>'aaaaaaaa-aaaa-4aaa-8aaa-000000000001','consent_id'=>'bbbbbbbb-bbbb-4bbb-8bbb-000000000001','ip'=>'2001:db8::1','user_agent'=>'Preserved fixture UA','event'=>'reject','stage'=>'committed','categories'=>['necessary'=>true,'analytics'=>false,'marketing'=>false],'policy_version'=>'1','page'=>'/fixture','client_time'=>gmdate('Y-m-d\TH:i:s\Z')];file_put_contents($path,CookieConsentAuditFormat::HEADER."\n".json_encode($r)."\n");}
 $setting=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.log_dir']);$setting->set('value',$logs);$setting->save();
 $modx->cacheManager->refresh();
 }elseif($action==='pages'){
 $t=$modx->newObject('modTemplate');$t->fromArray(['templatename'=>'Retired registry proof','content'=>'<!doctype html><html><head><meta charset="UTF-8">[[*introtext]]</head><body>[[*content]]</body></html>'],'',true,true);$t->save();$ids=[];
 foreach(['split','legacy'] as$mode){$r=$modx->newObject('modResource');$r->fromArray(['pagetitle'=>'Registry proof '.$mode,'alias'=>'registry-proof-'.$mode,'template'=>$t->get('id'),'published'=>1,'cacheable'=>1,'introtext'=>$mode==='split'?'[[!CookieConsentAssets]]':'','content'=>$mode==='split'?'[[!CookieConsentBanner]]':'[[!CookieConsent]]'],'',true,true);$r->save();$ids[$mode]=$r->get('id');}$modx->cacheManager->refresh();echo json_encode($ids);exit;
}elseif($action==='probe') {echo json_encode(['called'=>is_file('/opt/cc-publiccore/registry-called')]);exit;
}elseif($action!=='snapshot')throw new RuntimeException('Unknown fixture action');
$out=['version'=>$modx->getVersionData()['full_version'],'categories'=>[],'elements'=>[],'unrelated'=>[]];
foreach($modx->getCollection('modCategory') as$c)$out['categories'][$c->get('category')]=['count'=>$modx->getCount('modCategory',['category'=>$c->get('category')]),'id'=>$c->get('id'),'parent'=>$c->get('parent'),'hash'=>hash('sha256',json_encode($c->toArray()))];
foreach($elements as$class=>$names)foreach($names as$name){$rows=$modx->getCollection($class,['name'=>$name]);if(!$rows)continue;$e=reset($rows);$metadata=$e->toArray();unset($metadata['snippet'],$metadata['content']);$out['elements'][$name]=['count'=>count($rows),'id'=>$e->get('id'),'category'=>$e->get('category'),'metadata_sha256'=>hash('sha256',json_encode($metadata)),'code_sha256'=>hash('sha256',$e->get('snippet'))];}
foreach(['modChunk','modSnippet'] as$class)foreach($modx->getCollection($class) as$e)if(!in_array($e->get('name'),$elements[$class],true))$out['unrelated'][$class.':'.$e->get('name')]=hash('sha256',json_encode($e->toArray()));
foreach(['categories','elements','unrelated'] as$k)ksort($out[$k]);echo json_encode($out);
