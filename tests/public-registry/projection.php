<?php
if(PHP_SAPI!=='cli'||!getenv('CC_DB_PASSWORD'))exit(1);
define('MODX_API_MODE',true);ob_start();require '/var/www/html/index.php';while(ob_get_level())ob_end_clean();
if($modx->getOption('dbname')!=='cookie_consent_modx3_test')exit(1);
require_once MODX_CORE_PATH.'components/cookieconsent/src/CookieConsentSettings.php';
$n=0;function eq($a,$b,$m){global$n;$n++;if($a!==$b)throw new RuntimeException($m);}
$full=CookieConsentServiceRegistry::validateJson(json_encode(CookieConsentServiceRegistry::defaults()));
$full['services'][0]['purpose_id']='owner.analytics';$before=serialize($full);
$public=CookieConsentServiceRegistry::publicRegistry($full);
eq(serialize($full),$before,'Projection never mutates internal registry');
eq($public['schema'],1,'Schema retained');
foreach($full['services'] as$i=>$service){
    foreach(['name','purpose']as$field)eq(array_key_exists($field,$public['services'][$i]),false,'Display field omitted');
    foreach(['key','category','enabled','loader','config']as$field)eq($public['services'][$i][$field],$service[$field],'Technical field retained');
    eq(array_key_exists('purpose_id',$public['services'][$i]),array_key_exists('purpose_id',$service),'Optional stable purpose presence');
}
eq($public['services'][0]['purpose_id'],'owner.analytics','Stable purpose retained');
eq(json_decode(CookieConsentServiceRegistry::publicJson(json_encode($full)),true),json_decode(json_encode($public),true),'Public JSON helper uses projection');
$data=CookieConsentSettings::read($modx);$public=CookieConsentServiceRegistry::publicRegistry($data['registry']);
eq(str_contains($modx->runSnippet('CookieConsentAssets'),CookieConsentTexts::safeJson($public)),true,'Native Assets snippet uses projection');
foreach($data['registry']['services']as$service){eq(isset($service['name'],$service['purpose']),true,'Settings read remains full');}
echo json_encode(['suite'=>'Native PHP public registry projection and full internal settings','tests'=>1,'assertions'=>$n,'failed'=>0,'result'=>'PASS'])."\n";
