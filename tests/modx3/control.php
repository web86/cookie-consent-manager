<?php
declare(strict_types=1);
require __DIR__.'/guard.php';
$action=$argv[1]??'';
if($action==='credentials'){echo file_get_contents('/opt/cc-private/manager.json');exit;}
require __DIR__.'/guard.php';
$canonical=['CookiesPopup'=>MODX\Revolution\modChunk::class,'CookieConsent'=>MODX\Revolution\modSnippet::class,'CookieConsentAssets'=>MODX\Revolution\modSnippet::class,'CookieConsentBanner'=>MODX\Revolution\modSnippet::class,'CookieConsentMap'=>MODX\Revolution\modSnippet::class];
function snapshot($modx,array $canonical):array{
    $result=['elements'=>[],'settings'=>[],'relations'=>[],'data'=>[],'runtime'=>[]];
    foreach($canonical as $name=>$class){$row=$modx->getObject($class,['name'=>$name]);if(!$row)continue;$fields=$row->toArray('',true);$code=$fields['snippet'];unset($fields['snippet'],$fields['content'],$fields['static']);$result['elements'][$name]=['id'=>$row->get('id'),'count'=>$modx->getCount($class,['name'=>$name]),'metadata'=>$fields,'code_sha256'=>hash('sha256',$code),'static'=>(bool)$row->get('static')];}
    foreach($modx->getCollection(MODX\Revolution\modSystemSetting::class,['namespace'=>'cookie_consent']) as $r)$result['settings'][$r->get('key')]=hash('sha256',json_encode($r->toArray()));
    foreach([MODX\Revolution\modElementPropertySet::class,MODX\Revolution\modPropertySet::class,MODX\Revolution\modCategory::class,MODX\Revolution\modMenu::class,MODX\Revolution\modAccessPolicy::class] as $class)foreach($modx->getCollection($class) as $r)$result['relations'][$class.':'.json_encode($r->getPrimaryKey())]=hash('sha256',json_encode($r->toArray()));
    $queue=$modx->getObject(MODX\Revolution\Registry\Db\modDbRegisterQueue::class,['name'=>'cookieconsent-audit-private']);if($queue)$result['data']['audit_queue_sha256']=hash('sha256',json_encode($queue->toArray()));
    foreach(array_merge(glob('/opt/cc-private/logs/*'),glob('/opt/cc-private/configs/*.json')) as $f)if(is_file($f))$result['data'][basename($f)]=hash_file('sha256',$f);
    foreach([MODX_CORE_PATH.'components/cookieconsent',MODX_ASSETS_PATH.'components/cookieconsent',MODX_ASSETS_PATH.'js/cookie-consent',MODX_ASSETS_PATH.'css'] as $dir)if(is_dir($dir))foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir,FilesystemIterator::SKIP_DOTS)) as $f)if($f->isFile())$result['runtime'][$f->getPathname()]=hash_file('sha256',$f->getPathname());
    foreach($result as &$rows)ksort($rows);unset($rows);return $result;
}
if($action==='seed'||$action==='customize'){
    $invalid=$modx->getObject(MODX\Revolution\modElementPropertySet::class,['element'=>0,'element_class'=>'','property_set'=>0]);if($invalid)$invalid->remove();
    $parent=$modx->getObject(MODX\Revolution\modCategory::class,['category'=>'Owner parent'])?:$modx->newObject(MODX\Revolution\modCategory::class);$parent->set('category','Owner parent');$parent->save();
    $cat=$modx->getObject(MODX\Revolution\modCategory::class,['category'=>'Owner category'])?:$modx->newObject(MODX\Revolution\modCategory::class);$cat->fromArray(['category'=>'Owner category','parent'=>$parent->get('id')]);$cat->save();
    $set=$modx->getObject(MODX\Revolution\modPropertySet::class,['name'=>'Owner property set'])?:$modx->newObject(MODX\Revolution\modPropertySet::class);$set->fromArray(['name'=>'Owner property set','description'=>'Retain relation']);$set->setProperties(['owner'=>['name'=>'owner','type'=>'textfield','value'=>'owner-value']]);$set->save();
    foreach($canonical as $name=>$class){$row=$modx->getObject($class,['name'=>$name])?:$modx->newObject($class);$row->fromArray(['name'=>$name,'category'=>$cat->get('id'),'description'=>'Owner metadata '.$name,'snippet'=>$name==='CookiesPopup'?'<!-- Owner source -->':'return "owner-source";'],'',true,true);$row->setProperties(['owner'=>['name'=>'owner','type'=>'textfield','value'=>'owner-'.$name]]);if(!$row->save())throw new RuntimeException('Seed canonical');
        $link=$modx->getObject(MODX\Revolution\modElementPropertySet::class,['element'=>$row->get('id'),'element_class'=>$class,'property_set'=>$set->get('id')])?:$modx->newObject(MODX\Revolution\modElementPropertySet::class);$link->fromArray(['element'=>$row->get('id'),'element_class'=>$class,'property_set'=>$set->get('id')],'',true,true);if(!$link->save())throw new RuntimeException('Seed property relation');
        if($name==='CookieConsentMap'&&($argv[2]??'')!=='db-backed'){$file='/opt/cc-private/owner-static-map.php';file_put_contents($file,'<?php return "static-owner";');$row->set('static_file',$file);$row->set('source',0);$row->set('static',true);$row->save();}
    }
    $other=$modx->getObject(MODX\Revolution\modChunk::class,['name'=>'Owner unrelated'])?:$modx->newObject(MODX\Revolution\modChunk::class);$other->fromArray(['name'=>'Owner unrelated','snippet'=>'retain-owner-data','category'=>$cat->get('id')]);$other->save();
    $modx->cacheManager->refresh();echo json_encode(snapshot($modx,$canonical));exit;
}
if($action==='artifact-hash'){
    $signature=$argv[2]??'';if(!preg_match('/^cookieconsent3-0\.1\.0-beta[1-9][0-9]*$/D',$signature))throw new RuntimeException('Signature');$path=MODX_CORE_PATH.'packages/'.$signature.'.transport.zip';echo json_encode(is_file($path)?hash_file('sha256',$path):null);exit;
}
if($action==='external-config'){
    $queue=$modx->getObject(MODX\Revolution\Registry\Db\modDbRegisterQueue::class,['name'=>'cookieconsent-audit-private']);$key=$queue->get('options')['rate_limit_key'];$file='/opt/cc-private/configs/external.json';file_put_contents($file,json_encode(['site_origin'=>$modx->getOption('site_url')?rtrim($modx->getOption('site_url'),'/'):'http://127.0.0.1:18889','rate_limit_key'=>$key,'rate_limit_per_minute'=>10000]));chown($file,'www-data');chmod($file,0600);$s=$modx->getObject(MODX\Revolution\modSystemSetting::class,['key'=>'cookie_consent.audit_config_file']);$s->set('value',$file);$s->save();$modx->cacheManager->refresh();echo json_encode(['config_sha256'=>hash_file('sha256',$file)]);exit;
}
if($action==='duplicate'){
    $row=$modx->newObject(MODX\Revolution\modChunk::class);$row->fromArray(['name'=>'CookiesPopup','snippet'=>'Duplicate fixture']);$saved=$row->save();if($saved)throw new RuntimeException('Unexpected duplicate accepted by MODX 3 schema');echo json_encode(['saved'=>false,'count'=>$modx->getCount(MODX\Revolution\modChunk::class,['name'=>'CookiesPopup'])]);exit;
}
if($action==='rate'){
    $limit=(int)($argv[2]??0);if(!in_array($limit,[1,60,10000],true))throw new RuntimeException('Synthetic rate limit');$r=$modx->getObject(MODX\Revolution\modSystemSetting::class,['key'=>'cookie_consent.audit']);$v=json_decode($r->get('value'),true);$v['rate_limit_per_minute']=$limit;$r->set('value',json_encode($v));$r->save();$modx->cacheManager->refresh();echo json_encode(['limit'=>$limit]);exit;
}
if($action==='logs'){
    require '/opt/cc-source/server/src/CookieConsentAuditFormat.php';$records=[];foreach(glob('/opt/cc-private/logs/*-cookie-consent.log') as $file)foreach(CookieConsentAuditFormat::records($file) as $r)$records[]=$r;echo json_encode($records);exit;
}
if($action==='snapshot'){echo json_encode(snapshot($modx,$canonical));exit;}
if($action==='provision'){
    require '/opt/cc-source/server/src/CookieConsentSettings.php';
    $registry=CookieConsentServiceRegistry::defaults();$registry['services']=array_values(array_filter($registry['services'],fn($s)=>!in_array($s['loader'],['vk_ads','meta_pixel'],true)));
    foreach($registry['services'] as &$service){$service['enabled']=true;if(in_array($service['loader'],['google_ga4','google_gtm','google_ads'],true))$service['config']=['id'=>match($service['loader']){'google_ga4'=>'G-MOCK1234','google_gtm'=>'GTM-MOCK1234','google_ads'=>'AW-12345678'}];}unset($service);
    $registry['services'][]=['key'=>'mock_marketing','loader'=>'mock_marketing','category'=>'marketing','name'=>'Mock marketing','purpose'=>'Local mock only','enabled'=>true,'config'=>new stdClass()];
    $registry=CookieConsentServiceRegistry::validateJson(json_encode($registry));file_put_contents('/opt/cc-private/base-registry.json',json_encode($registry));
    $data=CookieConsentSettings::read($modx);$revision=$data['revision'];unset($data['revision']);$data['registry']=$registry;$data['options']['categories']=array_fill_keys(CookieConsentSettings::CATEGORIES,true);$data['options']['category_versions']=array_fill_keys(CookieConsentSettings::CATEGORIES,0);$data['log_dir']='/opt/cc-private/logs';CookieConsentSettings::save($modx,$data,$revision);
    // A fresh fixture baseline uses version 0 for category tests, after production Save validation.
    $row=$modx->getObject(MODX\Revolution\modSystemSetting::class,['key'=>'cookie_consent.options']);$opts=json_decode($row->get('value'),true);$opts['category_versions']=array_fill_keys(CookieConsentSettings::CATEGORIES,0);$row->set('value',json_encode($opts));$row->save();
    $row=$modx->getObject(MODX\Revolution\modSystemSetting::class,['key'=>'cookie_consent.audit']);$cfg=json_decode($row->get('value'),true);$cfg['rate_limit_per_minute']=10000;$row->set('value',json_encode($cfg));$row->save();
    $t=$modx->getObject(MODX\Revolution\modTemplate::class,['templatename'=>'MODX 3 native mock'])?:$modx->newObject(MODX\Revolution\modTemplate::class);
    $t->fromArray(['templatename'=>'MODX 3 native mock','content'=>'<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">[[!CookieConsentAssets]]</head><body><button data-cookie-settings-open>Settings</button><form id="optional-client-form"><input id="clientid" data-clientid=""><button type="submit">Submit</button></form><span id="form-result"></span><script>document.getElementById("optional-client-form").onsubmit=function(e){e.preventDefault();document.getElementById("form-result").textContent="Отправлено";};</script><div data-cc-map-provider="google_maps" data-cc-map-src="/assets/js/cookie-consent/mock/google_maps.html"></div><div data-cc-map-provider="yandex_maps" data-cc-map-src="/assets/js/cookie-consent/mock/yandex_maps.html"></div><button id="open-map-modal" onclick="document.getElementById(&quot;map-modal&quot;).showModal()">Open map</button><dialog id="map-modal"><button onclick="this.parentNode.close()">Close map</button><div data-cc-map-provider="google_maps" data-cc-map-src="/assets/js/cookie-consent/mock/google_maps.html"></div></dialog>[[!CookieConsentBanner? &mode=`mock`]]</body></html>']);$t->save();
    $r=$modx->getObject(MODX\Revolution\modResource::class,1);$r->fromArray(['pagetitle'=>'MODX 3 native consent fixture','template'=>$t->get('id'),'published'=>1,'cacheable'=>0]);$r->save();
    $setting=$modx->getObject(MODX\Revolution\modContextSetting::class,['context_key'=>'web','key'=>'cultureKey'])?:$modx->newObject(MODX\Revolution\modContextSetting::class);$setting->fromArray(['context_key'=>'web','key'=>'cultureKey','value'=>'ru']);$setting->save();
    $modx->cacheManager->refresh();echo json_encode(['fixture'=>true,'aliases'=>class_exists('modX',false),'registry_services'=>count($registry['services'])]);exit;
}
throw new RuntimeException('Unknown disposable control action');
