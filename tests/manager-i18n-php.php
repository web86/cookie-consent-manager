<?php
require_once __DIR__.'/../server/src/CookieConsentSettings.php';
$n=0;
function verify($actual,$expected,$message){global $n;$n++;if($actual!==$expected)throw new RuntimeException($message);}
function rejects($fn){global $n;try{$fn();}catch(Throwable $e){$n++;return;}throw new RuntimeException('Expected rejection');}
$defaults=json_decode(json_encode(CookieConsentServiceRegistry::defaults()),true);verify(count(array_filter($defaults['services'],fn($s)=>$s['enabled'])),0,'Fresh install all off');
verify($defaults['services'][0]['config']['webvisor'],true,'Historical Webvisor');
$options=CookieConsentSettings::defaults();$options['buttons']['accept']=true;
verify(CookieConsentSettings::effectiveButtons($options),['reject'=>true,'configure'=>false,'accept_all'=>false,'accept'=>true],'Server legacy dependencies');
verify($options['buttons']['configure'],true,'Raw choice preserved');$options['buttons']['accept']=false;verify(CookieConsentSettings::effectiveButtons($options)['configure'],true,'Restore');
foreach([0,3651,1.5,'90'] as $ttl){$bad=$options;$bad['ttl_days']=$ttl;rejects(fn()=>CookieConsentSettings::options($bad));}
foreach(['../ru','ru/../../','<script>','x','en_US_abc_extra'] as $lang)rejects(fn()=>CookieConsentTexts::language($lang));
verify(CookieConsentTexts::language('pt_BR'),'pt-br','Safe custom culture');verify(CookieConsentTexts::language('custom-site'),'custom-site','Nonstandard culture');verify(CookieConsentTexts::language('x-private'),'x-private','Private culture');
$html='<p>Hello <strong>world</strong><a href="/privacy" target="_blank" onclick="evil()">policy</a></p><script>evil()</script><img src="https://evil.test/x"><span style="background:url(https://evil.test)">safe</span>';
$clean=CookieConsentHtmlSanitizer::clean($html);verify(str_contains($clean,'onclick'),false,'Handlers removed');verify(str_contains($clean,'script'),false,'Scripts removed');verify(str_contains($clean,'src='),false,'Assets removed');verify(str_contains($clean,'style='),false,'Style removed');verify(str_contains($clean,'href="/privacy"'),true,'Internal anchor');verify(str_contains($clean,'rel="noopener noreferrer"'),true,'Safe rel');
foreach(['javascript:alert(1)','jav&#x61;script:alert(1)','//evil.test','https://user@evil.test','data:text/html,bad','https://user:pass@evil.test','\\evil.test'] as $url){$c=CookieConsentHtmlSanitizer::clean('<a href="'.$url.'">test</a>');verify(str_contains($c,'href='),false,'Dangerous URL');}
foreach(['https://example.test/p?q=1&amp;x=2','http://example.test','/privacy','policy','../policy','#section'] as $url)verify(str_contains(CookieConsentHtmlSanitizer::clean('<a href="'.$url.'">test</a>'),'href='),true,'Safe URL');
$tag='[[!FakeSnippet]] {php}danger{/php}';$clean=CookieConsentHtmlSanitizer::clean($tag);verify($clean,$tag,'Tags remain literal');$json=CookieConsentTexts::safeJson(['text'=>$clean]);verify(str_contains($json,'[['),false,'MODX tag delimiters encoded');verify(str_contains($json,'{php}'),false,'Fenom delimiters encoded');verify(json_decode($json,true)['text'],$tag,'Literal roundtrip');
$texts=CookieConsentTexts::defaults();$texts['locales']['fr']=['reject'=>'Refuser'];$texts=CookieConsentTexts::validate($texts);$resolved=CookieConsentTexts::resolve($texts,'fr');verify($resolved['reject'],'Refuser','Local override');verify($resolved['accept_all'],CookieConsentTexts::lexicon('ru')['accept_all'],'Package base fallback');$resolved=CookieConsentTexts::resolve($texts,'en');verify($resolved['accept_all'],'Accept all','Requested bundled lexicon before base');
$texts['locales']['en']=['reject'=>'Custom'];verify(CookieConsentTexts::resolve($texts,'en')['reject'],'Custom','Override before stock');
$bad=$defaults;$bad['services'][0]['config']['webvisor']='true';rejects(fn()=>CookieConsentServiceRegistry::validateJson(json_encode($bad)));
$bad=$defaults;$bad['services'][0]['config']['callback']='evil';rejects(fn()=>CookieConsentServiceRegistry::validateJson(json_encode($bad)));
$bad=$defaults;$bad['services'][2]['config']['webvisor']=true;rejects(fn()=>CookieConsentServiceRegistry::validateJson(json_encode($bad)));
$bad=$defaults;$bad['services'][2]['config']['send_page_view']=false;verify(CookieConsentServiceRegistry::validateJson(json_encode($bad))['services'][2]['config']['send_page_view'],false,'GA parameter');
$bad=$defaults;$bad['services'][0]['purpose_id']='statistics.v2';verify(CookieConsentServiceRegistry::validateJson(json_encode($bad))['services'][0]['purpose_id'],'statistics.v2','Stable purpose');
$empty=CookieConsentTexts::defaults();$empty['locales']['tr']=[];$empty=CookieConsentTexts::validate($empty);verify(json_decode(json_encode($empty))->locales->tr instanceof stdClass,true,'Empty locale remains object');verify(CookieConsentTexts::resolve($empty,'tr')['reject'],CookieConsentTexts::lexicon('ru')['reject'],'Empty locale fallback');
$registry=json_decode(json_encode(CookieConsentServiceRegistry::defaults()),true);$registry['services'][0]['enabled']=true;
$preview=CookieConsentSettings::validate(['options'=>CookieConsentSettings::defaults(),'registry'=>$registry,'texts'=>CookieConsentTexts::defaults(),'log_dir'=>''],__DIR__,false);verify($preview['registry']['services'][0]['enabled'],true,'Preview preserves enabled state');verify($preview['registry']['services'][1]['enabled'],false,'Preview preserves disabled state');
echo json_encode(['suite'=>'Manager settings/HTML/i18n PHP','assertions'=>$n,'failed'=>0,'result'=>'PASS'])."\n";
