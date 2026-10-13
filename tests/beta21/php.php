<?php
require_once __DIR__.'/../../server/src/CookieConsentBannerRenderer.php';
require_once __DIR__.'/../../server/src/CookieConsentAuditHttp.php';
$n=0;function eq($a,$b,$why=''){global $n;$n++;if($a!==$b)throw new RuntimeException($why);}
$categories=['analytics','marketing','external_content'];$markup=file_get_contents(__DIR__.'/../../CookiesPopup.html');
for($mask=0;$mask<8;$mask++){
 $services=[];foreach($categories as $i=>$cat){$services[]=['enabled'=>(bool)($mask&(1<<$i)),'category'=>$cat,'key'=>$cat,'name'=>$cat,'config'=>[]];$services[]=['enabled'=>false,'category'=>$cat];}
 $html=CookieConsentBannerRenderer::render($markup,CookieConsentTexts::resolve(CookieConsentTexts::defaults(),'en'),CookieConsentSettings::defaults(),'/assets/','live',$services);
 $doc=new DOMDocument();libxml_use_internal_errors(true);$doc->loadHTML($html);$xp=new DOMXPath($doc);
 eq($xp->query('//*[@data-cc-category-row="necessary"]')->item(0)->hasAttribute('hidden'),false,'necessary SSR');
 foreach($categories as $i=>$cat)eq($xp->query('//*[@data-cc-category-row="'.$cat.'"]')->item(0)->hasAttribute('hidden'),!($mask&(1<<$i)),'mask SSR '.$mask);
}
$id='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';$valid=['status'=>200,'content_type'=>'application/json','body'=>json_encode(['ok'=>true,'event_id'=>$id,'server_time'=>'2026-10-13T10:00:00Z']),'incomplete'=>false,'failure'=>'network'];
eq(CookieConsentAuditHttp::acknowledgement($valid,$id)['event_id'],$id);
foreach([0=>'audit_network_failed',301=>'audit_http_redirect',302=>'audit_http_redirect',307=>'audit_http_redirect',400=>'audit_http_bad_request',403=>'audit_http_forbidden',404=>'audit_http_not_found',409=>'audit_http_duplicate',429=>'audit_http_rate_limited',503=>'audit_http_unavailable',500=>'audit_http_unexpected'] as $status=>$reason){try{CookieConsentAuditHttp::acknowledgement(array_replace($valid,['status'=>$status,'body'=>'<html>secret 10.0.0.1</html>']),$id);throw new LogicException('not rejected');}catch(CookieConsentAuditCheckException $e){eq($e->getMessage(),$reason);eq($e->receiverStatus,$status);eq($e->receiverCode,'');}}
foreach([['failure'=>'tls','status'=>0],['content_type'=>'text/html'],['body'=>'bad JSON'],['incomplete'=>true],['body'=>json_encode(['ok'=>true,'event_id'=>$id,'server_time'=>'2026-02-31T10:00:00Z'])],['body'=>json_encode(['ok'=>true,'event_id'=>$id,'server_time'=>'2026-10-13T10:00:00Z','secret'=>'leak'])],['body'=>json_encode(['ok'=>true,'event_id'=>'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb','server_time'=>'2026-10-13T10:00:00Z'])]] as $override){try{CookieConsentAuditHttp::acknowledgement(array_replace($valid,$override),$id);throw new LogicException('not rejected');}catch(CookieConsentAuditCheckException $e){eq($e->getMessage(),isset($override['failure'])?'audit_tls_failed':(str_contains($override['body']??'','bbbbbbbb')?'audit_event_mismatch':'audit_response_malformed'));}}
$_SERVER['HTTP_HOST']='public.test';$_SERVER['HTTP_ORIGIN']='https://public.test';$_SERVER['HTTP_X_FORWARDED_PROTO']='http';eq(CookieConsentAuditConfiguration::managerOrigin('https://public.test'),'https://public.test');
foreach(['http://public.test','https://attacker.test','https://public.test:8443'] as $origin){try{CookieConsentAuditConfiguration::managerOrigin($origin);throw new LogicException('unsafe origin');}catch(RuntimeException $e){eq($e->getMessage(),'audit_origin_request_mismatch');}}
echo json_encode(['suite'=>'Beta21 category SSR and bounded audit diagnostics PHP','tests'=>1,'assertions'=>$n,'failed'=>0,'result'=>'PASS'])."\n";
