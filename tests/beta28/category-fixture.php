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
 foreach($elements as$class=>$names)foreach($names as$name){$e=$modx->getObject($class,['name'=>$name]);if(!$e)throw new RuntimeException('Missing canonical');$e->set('category',$i++%2?$custom:0);$e->set('description','Preserve '.$name);$e->setProperties(['customer_parameter'=>['name'=>'customer_parameter','value'=>'keep-'.$name,'type'=>'textfield']]);$e->set('snippet',$e->get('snippet').($class==='modChunk'?'<!-- Previous custom source -->':"\n// Previous custom source"));if(!$e->save())throw new RuntimeException('Fixture custom save');}
 $modx->cacheManager->refresh();
}elseif($action!=='snapshot')throw new RuntimeException('Unknown fixture action');
$out=['version'=>$modx->getVersionData()['full_version'],'categories'=>[],'elements'=>[],'unrelated'=>[]];
foreach($modx->getCollection('modCategory') as$c)$out['categories'][$c->get('category')]=['id'=>$c->get('id'),'parent'=>$c->get('parent'),'hash'=>hash('sha256',json_encode($c->toArray()))];
foreach($elements as$class=>$names)foreach($names as$name){$rows=$modx->getCollection($class,['name'=>$name]);if(!$rows)continue;$e=reset($rows);$metadata=$e->toArray();unset($metadata['snippet'],$metadata['content']);$out['elements'][$name]=['count'=>count($rows),'id'=>$e->get('id'),'category'=>$e->get('category'),'metadata_sha256'=>hash('sha256',json_encode($metadata)),'code_sha256'=>hash('sha256',$e->get('snippet'))];}
foreach(['modChunk','modSnippet'] as$class)foreach($modx->getCollection($class) as$e)if(!in_array($e->get('name'),$elements[$class],true))$out['unrelated'][$class.':'.$e->get('name')]=hash('sha256',json_encode($e->toArray()));
foreach(['categories','elements','unrelated'] as$k)ksort($out[$k]);echo json_encode($out);
