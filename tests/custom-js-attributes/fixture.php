<?php
declare(strict_types=1);
// The existing fixture enforces the disposable database, CMS version and loopback origin.
$operation=$argv[1]??'';$argv[1]='boot';require __DIR__.'/../modstore/fixture.php';
require_once $component.'src/CookieConsentSettings.php';
if($operation==='seed'||$operation==='seed-legacy'){
 $registry=CookieConsentServiceRegistry::defaults();
 if($operation==='seed-legacy')foreach(['custom'=>'analytics','other'=>'marketing'] as $key=>$category)
  $registry['services'][]=['key'=>$key,'loader'=>'custom_js','name'=>$key,'purpose'=>'Site statistics','category'=>$category,'enabled'=>true,'config'=>['path'=>'/'.$key.'.js']];
 foreach(['cookie_consent.services'=>json_encode($registry),'cookie_consent.options'=>json_encode(array_replace(CookieConsentSettings::defaults(),['categories'=>['analytics'=>true,'marketing'=>true,'external_content'=>true]]))] as $key=>$value){$row=$modx->getObject(ccClass('modSystemSetting'),['key'=>$key]);$row->set('value',$value);check($row->save(),'Fixture setting');}
 foreach(['custom.js','other.js'] as $name)check(copy(__DIR__.'/../fixtures/custom-js-attributes.js',$site.$name),'Local fixture script');
 $modx->cacheManager->refresh();echo '{}';exit;
}
if($operation==='read'){echo json_encode(CookieConsentSettings::read($modx),JSON_THROW_ON_ERROR);exit;}
if($operation==='snapshot'){
 $result=[];foreach(['cookie_consent.services','cookie_consent.options','cookie_consent.texts'] as $key)$result[$key]=$modx->getObject(ccClass('modSystemSetting'),['key'=>$key])->get('value');echo json_encode($result,JSON_THROW_ON_ERROR);exit;
}
if($operation==='installed'){
 $spec=json_decode(file_get_contents($argv[2]),true,64,JSON_THROW_ON_ERROR);$count=0;
 foreach($spec['files'] as $entry){$target=$site.$entry['target'];check(is_file($target)&&hash_file('sha256',$target)===$entry['sha256'],'Installed source mismatch: '.$entry['target']);$count++;}
 check(str_contains(file_get_contents($js.'cached-cookie-consent.min.js'),'web86CustomJs'),'Installed MODX generated bundle includes attribute validator');
 echo json_encode(['result'=>'PASS','files'=>$count,'php'=>PHP_VERSION,'modx'=>$modx->getVersionData()['full_version']]);exit;
}
throw new RuntimeException('Unknown attributes fixture operation');
