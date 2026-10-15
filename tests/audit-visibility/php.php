<?php
declare(strict_types=1);
require_once __DIR__.'/../../server/src/CookieConsentEventValidator.php';
require_once __DIR__.'/../../server/src/CookieConsentSettings.php';
$n=0;
function eq($a,$b,$why){global $n;$n++;if($a!==$b)throw new RuntimeException($why);}
function rejected($fn,$class=InvalidArgumentException::class){try{$fn();}catch(Throwable $e){eq(get_class($e),$class,'Expected strict rejection: '.$e->getMessage());return;}throw new RuntimeException('Forged event accepted');}
function event(): array{return ['schema'=>2,'event_id'=>'aaaaaaaa-aaaa-4aaa-8aaa-111111111111','consent_id'=>'bbbbbbbb-bbbb-4bbb-8bbb-111111111111','event'=>'accept_all','stage'=>'committed','analytics'=>true,'marketing'=>false,'external_content'=>true,'providers'=>['yandex'=>true,'mailru'=>true,'yandex_maps'=>true],'provider'=>null,'policy_version'=>'1','page'=>'/','timestamp'=>'2026-10-15T07:00:00.000Z'];}
function registry(bool $marketing=false): array {
    $r=CookieConsentServiceRegistry::defaults();foreach($r['services'] as &$s){$s['enabled']=in_array($s['key'],['yandex','mailru','yandex_maps'],true)||($marketing&&$s['key']==='google_ads');if($s['key']==='google_ads')$s['config']=['id'=>'AW-12345678'];}unset($s);return CookieConsentServiceRegistry::validateJson(json_encode($r));
}
$categories=['analytics','marketing','external_content'];$r=registry(true);$enabled=array_values(array_filter($r['services'],fn($s)=>$s['enabled']));
foreach(['accept_all','accept','save_settings'] as $action)for($mask=0;$mask<8;$mask++){
    $visible=[];foreach($categories as $i=>$c)$visible[$c]=(bool)($mask&(1<<$i));
    for($grants=0;$grants<8;$grants++)for($permissions=0;$permissions<16;$permissions++){
        $e=event();$e['event']=$action;$e['providers']=[];
        $valid=true;
        foreach($categories as $i=>$c){$e[$c]=(bool)($grants&(1<<$i));if(($e[$c]&&!$visible[$c])||($action!=='save_settings'&&$e[$c]!==$visible[$c]))$valid=false;}
        foreach($enabled as $i=>$s){$yes=(bool)($permissions&(1<<$i));$e['providers'][$s['key']]=$yes;if(($yes&&!$e[$s['category']])||($action!=='save_settings'&&$yes!==$visible[$s['category']]))$valid=false;}
        if($valid)eq(CookieConsentEventValidator::validate($e,$r,$visible),$e,'Valid visibility/category/provider combination');
        else rejected(fn()=>CookieConsentEventValidator::validate($e,$r,$visible));
    }
}
$r=registry();$visible=['analytics'=>true,'marketing'=>false,'external_content'=>true];$production=event();
eq(CookieConsentEventValidator::validate($production,$r,$visible),$production,'Exact reported production selection accepted');
rejected(fn()=>CookieConsentEventValidator::validate($production,$r)); // Unconfigured callers keep strict historical all-visible contract.
foreach(['schema'=>3,'stage'=>'draft','event_id'=>'forged','policy_version'=>'bad version','page'=>'//evil.test','timestamp'=>'2026-99-99T07:00:00.000Z','marketing'=>'false','provider'=>'yandex'] as $k=>$value){$bad=$production;$bad[$k]=$value;rejected(fn()=>CookieConsentEventValidator::validate($bad,$r,$visible));}
foreach(['categories'=>$visible,'categoryVisibility'=>$visible,'ip'=>'127.0.0.1','config'=>['marketing'=>false]] as $k=>$value){$bad=$production;$bad[$k]=$value;rejected(fn()=>CookieConsentEventValidator::validate($bad,$r,$visible));}
foreach(['unknown','google_ga4'] as $key){$bad=$production;$bad['providers'][$key]=false;rejected(fn()=>CookieConsentEventValidator::validate($bad,$r,$visible));}
foreach([false,'true',1] as $value){$bad=$production;$bad['providers']['mailru']=$value;rejected(fn()=>CookieConsentEventValidator::validate($bad,$r,$visible));}
$bad=$production;unset($bad['providers']['yandex']);rejected(fn()=>CookieConsentEventValidator::validate($bad,$r,$visible));
foreach([[],['analytics'=>true],['analytics'=>true,'marketing'=>0,'external_content'=>true],$visible+['necessary'=>true]] as $badVisibility)rejected(fn()=>CookieConsentEventValidator::validate($production,$r,$badVisibility),RuntimeException::class);
// Visible category without a provider still requires an explicit category grant.
$none=['schema'=>1,'services'=>[]];$e=$production;$e['providers']=[];
eq(CookieConsentEventValidator::validate($e,$none,$visible),$e,'Empty visible categories can be granted');$e['analytics']=false;rejected(fn()=>CookieConsentEventValidator::validate($e,$none,$visible));
// Hidden services may be explicitly false or omitted, but never granted.
$r=registry(true);$e=$production;$e['providers']['google_ads']=false;
eq(CookieConsentEventValidator::validate($e,$r,$visible),$e,'Enabled hidden provider remains false');
$e['providers']['google_ads']=true;rejected(fn()=>CookieConsentEventValidator::validate($e,$r,$visible));
$e['marketing']=true;rejected(fn()=>CookieConsentEventValidator::validate($e,$r,$visible));
// Existing action/target consistency and legacy schema rules remain strict.
foreach(['map_allow','map_deny','provider_allow','provider_deny'] as $action){$e=$production;$e['event']=$action;$e['stage']=str_starts_with($action,'provider_')?'draft':'committed';$e['provider']='yandex_maps';$e['providers']['yandex_maps']=str_ends_with($action,'_allow');eq(CookieConsentEventValidator::validate($e,$r,$visible),$e,'Legacy schema 2 provider action');$e['providers']['yandex_maps']=!$e['providers']['yandex_maps'];rejected(fn()=>CookieConsentEventValidator::validate($e,$r,$visible));}
$legacy=$production;unset($legacy['schema'],$legacy['external_content'],$legacy['providers'],$legacy['provider']);
foreach(['accept_all','accept','save_settings','reject'] as $action){$legacy['event']=$action;$legacy['analytics']=$legacy['marketing']=$action!=='reject';eq(CookieConsentEventValidator::validate($legacy,$r,$visible),$legacy,'Schema 1 behavior retained');if(in_array($action,['accept_all','accept'],true)){$legacy['marketing']=false;rejected(fn()=>CookieConsentEventValidator::validate($legacy,$r,$visible));}}
echo json_encode(['suite'=>'Visibility-aware consent audit validation, exhaustive categories/providers','assertions'=>$n,'result'=>'PASS'])."\n";
