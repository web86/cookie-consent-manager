<?php
declare(strict_types=1);
require_once __DIR__.'/../../server/src/CookieConsentBannerRenderer.php';
require_once __DIR__.'/../../server/src/CookieConsentEventValidator.php';
$n=0;
function eq($a,$b,$message){global $n;$n++;if($a!==$b)throw new RuntimeException($message);}
function reject($fn){global $n;try{$fn();}catch(InvalidArgumentException $e){$n++;return;}throw new RuntimeException('Expected rejection');}
function validate($service){return CookieConsentServiceRegistry::validateJson(json_encode(['schema'=>1,'services'=>[$service]]))['services'][0];}
$stock=json_decode(json_encode(CookieConsentServiceRegistry::defaults()),true);
foreach($stock['services'] as $s)foreach(CookieConsentSettings::CATEGORIES as $category){$s['category']=$category;eq(validate($s)['category'],$category,'Adapter accepts any optional category');$s['category']='necessary';reject(fn()=>validate($s));}
$custom=['key'=>'bitrix24','loader'=>'custom_js','name'=>'Bitrix24','purpose'=>'Chat and CRM','purpose_id'=>'crm.chat','category'=>'marketing','enabled'=>true,'config'=>['path'=>'/custom-assets/js/integrations/bitrix24.js']];
foreach(CookieConsentSettings::CATEGORIES as $category){$s=$custom;$s['category']=$category;eq(validate($s),$s,'Custom JS any category');}
$bad=['//evil.test/x.js','https://evil.test/x.js','http://localhost/a.js','javascript:alert(1)','data:text/javascript,1','blob:abc','/assets/../x.js','/assets/./x.js','/assets/%2e%2e/x.js','/assets/%252e/x.js','/assets/a%2f.js','/assets//x.js','/assets\\x.js','/assets/x.js?x=1','/assets/x.js#x','/assets/x.js\n','<script>1</script>','x.js','/assets/a.php','/assets/x.js/','/assets/x.js'.chr(0)];
foreach($bad as $path){$s=$custom;$s['config']['path']=$path;reject(fn()=>validate($s));}
$s=$custom;$s['config']['inline']='alert(1)';reject(fn()=>validate($s));
$s=$custom;$s['key']='second';reject(fn()=>CookieConsentServiceRegistry::validateJson(json_encode(['schema'=>1,'services'=>[$custom,$s]])));
$public=CookieConsentServiceRegistry::publicRegistry(['schema'=>1,'services'=>[$custom]]);eq($public['services'][0]['purpose'],$custom['purpose'],'Custom purpose participates in public fingerprint input');
$texts=CookieConsentTexts::defaults();$texts['locales']['en']=['map_notice'=>'General {provider}','service.google_maps.map_notice'=>'Specific {provider}'];$texts['locales']['ru']['map_notice']='Общий {provider}';$texts=CookieConsentTexts::validate($texts);
$maps=array_values(array_filter($stock['services'],fn($s)=>str_ends_with($s['loader'],'_maps')));
eq(CookieConsentTexts::resolve($texts,'en',$maps)['service.google_maps.map_notice'],'Specific {provider}','Specific requested language first');
eq(CookieConsentTexts::resolve($texts,'en',$maps)['service.yandex_maps.map_notice'],'General {provider}','General requested language next');
eq(CookieConsentTexts::resolve($texts,'ru',$maps)['service.google_maps.map_notice'],'Общий {provider}','No foreign service override');
eq(CookieConsentTexts::resolve($texts,'de',$maps)['service.google_maps.map_notice'],'Общий {provider}','Unsupported language base fallback');
foreach(CookieConsentSettings::CATEGORIES as $category)foreach($maps as $map){$map['enabled']=true;$map['category']=$category;$o=CookieConsentSettings::defaults();$o['categories'][$category]=true;$strings=CookieConsentTexts::resolve($texts,'en',[$map]);$html=CookieConsentBannerRenderer::render(file_get_contents(__DIR__.'/../../CookiesPopup.html'),$strings,$o,'/custom-assets/','mock',[$map]);eq(str_contains($html,'data-cc-map-template="'.$map['key'].'"'),true,'Templates follow loader, not category');eq(str_contains($html,'{provider}'),false,'Provider interpolation');eq(str_contains($html,'<iframe'),false,'SSR contains no active iframe');}
$empty=$texts;$empty['locales']['en']['service.google_maps.map_notice']='';eq(CookieConsentTexts::resolve($empty,'en',$maps)['service.google_maps.map_notice'],'General {provider}','Cleared override falls back consistently');
$invalid=$texts;$invalid['locales']['en']['map_notice']='<script>alert(1)</script>';reject(fn()=>CookieConsentTexts::validate($invalid));
eq($stock,json_decode(json_encode(CookieConsentServiceRegistry::validateJson(json_encode($stock))),true),'Unchanged legacy registry roundtrip');
$legacyDuplicate=$stock['services'][0];$legacyDuplicate['enabled']=true;$copy=$legacyDuplicate;$copy['key']='historic_copy';eq(count(CookieConsentServiceRegistry::validateJson(json_encode(['schema'=>1,'services'=>[$legacyDuplicate,$copy]]))['services']),2,'Previously valid duplicate SDK instances retained');
$categoryEvent=['schema'=>3,'event_id'=>'00000000-0000-4000-8000-000000000001','consent_id'=>'00000000-0000-4000-8000-000000000002','event'=>'save_settings','stage'=>'committed','analytics'=>true,'marketing'=>false,'external_content'=>true,'policy_version'=>'1','page'=>'/fixture','timestamp'=>'2026-10-15T11:25:30.000Z'];
eq(CookieConsentEventValidator::validate($categoryEvent),$categoryEvent,'Category-only audit accepts no individual permissions');
$bad=$categoryEvent;$bad['providers']=['bitrix24'=>true];reject(fn()=>CookieConsentEventValidator::validate($bad));
foreach(['map_allow','provider_allow'] as $event){$bad=$categoryEvent;$bad['event']=$event;reject(fn()=>CookieConsentEventValidator::validate($bad));}
reject(fn()=>CookieConsentEventValidator::validate($categoryEvent,null,['analytics'=>false,'marketing'=>false,'external_content'=>true]));
$a=['schema'=>1,'services'=>[$custom]];$b=$a;$b['services'][0]['name']='New display name';eq(CookieConsentSettings::categoryProcessing($a,'marketing'),CookieConsentSettings::categoryProcessing($b,'marketing'),'Display name excluded from category composition');$b['services'][0]['purpose']='New processing';eq(CookieConsentSettings::categoryProcessing($a,'marketing')===CookieConsentSettings::categoryProcessing($b,'marketing'),false,'Purpose affects category version');
echo json_encode(['suite'=>'Universal service category/path/text contract','tests'=>1,'assertions'=>$n,'failed'=>0,'result'=>'PASS'])."\n";
