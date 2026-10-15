<?php
declare(strict_types=1);
require_once __DIR__.'/../../server/src/CookieConsentServiceRegistry.php';
$n=0;function eq($a,$b){global$n;$n++;if($a!==$b)throw new RuntimeException(json_encode([$a,$b]));}
$valid=['/assets/js/a.js','/nonstandard-assets/integrations/chat.js','https://cdn.example.com/chat.js','https://CDN.EXAMPLE.COM:443/chat.js?v=2&site=demo','https://cdn.example.com:8443/sdk/widget.js?source=https%3A%2F%2Fexample.test','https://127.0.0.1/a.js'];
$invalid=['//cdn.example.com/a.js','http://cdn.example.com/a.js','javascript:alert(1)','data:text/javascript,1','blob:https://x/a','https://user:pass@example.com/a.js','https://@example.com/a.js','https://example.com/a.js#','https://example.com/a.js#fragment','https://example.com/../a.js','https://example.com/%2e%2e/a.js','https://example.com/a%2f.js','https://example.com/a.php','https://example.com/a.js?x=%ZZ','https://example.com/a.js?x=<script>','https://example.com/a.js'."\n",'https://example.com:0/a.js','https://example.com:65536/a.js','https://127.1/a.js','https://a.123/a.js','https://%65xample.com/a.js','/assets//a.js','/assets/../a.js','https://-host.example/a.js'];
foreach($valid as $url)eq(CookieConsentServiceRegistry::validScriptPath($url),true);
foreach($invalid as $url)eq(CookieConsentServiceRegistry::validScriptPath($url),false);
$s=['key'=>'remote','loader'=>'custom_js','name'=>'Remote','purpose'=>'Chat','enabled'=>true,'category'=>'analytics','config'=>['path'=>$valid[3]]];$r=CookieConsentServiceRegistry::validateJson(json_encode(['schema'=>1,'services'=>[$s]]));eq($r['services'][0]['config']['path'],$valid[3]);
$copy=$s;$copy['key']='copy';$copy['config']['path']='https://cdn.example.com/chat.js?v=2&site=demo';try{CookieConsentServiceRegistry::validateJson(json_encode(['schema'=>1,'services'=>[$s,$copy]]));throw new RuntimeException('Duplicate accepted');}catch(InvalidArgumentException $e){eq($e->getMessage(),'Duplicate script path');}
echo json_encode(['suite'=>'HTTPS custom JS URL validation and normalized duplicate identity','tests'=>1,'assertions'=>$n,'failed'=>0,'result'=>'PASS','vectors'=>['valid'=>$valid,'invalid'=>$invalid]])."\n";
