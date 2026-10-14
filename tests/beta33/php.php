<?php
require_once __DIR__.'/../../server/src/CookieConsentBannerRenderer.php';
$n=0;function eq($a,$b,$m){global $n;$n++;if($a!==$b)throw new RuntimeException($m);}function reject($fn){global$n;try{$fn();}catch(InvalidArgumentException$e){$n++;return;}throw new RuntimeException('Expected rejection');}
$defaults=CookieConsentSettings::defaults();eq($defaults['categories'],['analytics'=>false,'marketing'=>false,'external_content'=>false],'Explicit fresh hidden flags');
foreach([null,1,'true',[],['analytics'=>true,'marketing'=>false],['analytics'=>true,'marketing'=>false,'external_content'=>true,'necessary'=>true]]as$v){$o=$defaults;$o['categories']=$v;reject(fn()=>CookieConsentSettings::options($o));}
foreach(CookieConsentSettings::CATEGORIES as$c){$o=$defaults;$o['categories'][$c]=1;reject(fn()=>CookieConsentSettings::options($o));$o=$defaults;$o['category_versions'][$c]=-1;reject(fn()=>CookieConsentSettings::options($o));}
$stock=CookieConsentServiceRegistry::defaults();$legacy=$defaults;unset($legacy['categories'],$legacy['category_versions']);
for($mask=0;$mask<8;$mask++){
 $services=$stock['services'];foreach($services as&$s)$s['enabled']=(bool)($mask&(1<<array_search($s['category'],CookieConsentSettings::CATEGORIES)));unset($s);
 $o=CookieConsentSettings::categoryOptions($legacy,$services);foreach(CookieConsentSettings::CATEGORIES as$i=>$c)eq($o['categories'][$c],(bool)($mask&(1<<$i)),'Legacy rule preserved');eq($o['category_versions'],array_fill_keys(CookieConsentSettings::CATEGORIES,0),'Legacy epochs zero');
 foreach(CookieConsentSettings::CATEGORIES as$c)foreach([0,1,2]as$count)foreach([false,true]as$visible){
  $list=[];for($i=0;$i<$count;$i++)$list[]=['key'=>'test_'.$i,'loader'=>$c==='external_content'?'yandex_maps':'mailru','category'=>$c,'enabled'=>true,'config'=>[],'name'=>'Test','purpose'=>'Test'];
  $o=$defaults;$o['categories'][$c]=$visible;$html=CookieConsentBannerRenderer::render(file_get_contents(__DIR__.'/../../CookiesPopup.html'),CookieConsentTexts::resolve(CookieConsentTexts::defaults(),'en',$list),$o,'/assets/','mock',$list);
  $d=new DOMDocument();@$d->loadHTML($html);$x=new DOMXPath($d);$row=$x->query('//*[@data-cc-category-row="'.$c.'"]')->item(0);eq(!$row->hasAttribute('hidden'),$visible,'SSR independent of service count');
 }
}
foreach([true,false] as $old){$r=$stock;$r['services'][0]['config']['clientId']=$old;$v=CookieConsentServiceRegistry::validateJson(json_encode($r));eq(array_key_exists('clientId',(array)$v['services'][0]['config']),false,'Retired boolean stripped');eq(array_key_exists('clientId',CookieConsentServiceRegistry::BOOL_OPTIONS['yandex']),false,'No Manager field');}
foreach([null,1,'true',[],['bad']]as$bad){$r=$stock;$r['services'][0]['config']['clientId']=$bad;reject(fn()=>CookieConsentServiceRegistry::validateJson(json_encode($r)));}
echo json_encode(['tests'=>1,'assertions'=>$n,'failed'=>0,'result'=>'PASS','suite'=>'Explicit category flags/legacy migration/SSR 0,1,2 providers/boolean validation'])."\n";
