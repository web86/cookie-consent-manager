<?php
declare(strict_types=1);
require_once __DIR__.'/../../server/src/CookieConsentSettings.php';
$n=0;
function eq($a,$b,$m=''){global $n;$n++;if($a!==$b)throw new RuntimeException($m?:'Mismatch');}
function rejects(callable $fn){global $n;$n++;try{$fn();}catch(InvalidArgumentException|JsonException $e){return;}throw new RuntimeException('Expected validation rejection');}
function registry($attributes=null,bool $include=true):array{
 $config=['path'=>'/fixture.js'];if($include)$config['attributes']=$attributes;
 return ['schema'=>1,'services'=>[['key'=>'custom','loader'=>'custom_js','name'=>'Custom','purpose'=>'Site statistics','category'=>'analytics','enabled'=>true,'config'=>$config]]];
}
function validate($attributes=null,bool $include=true):array{return CookieConsentServiceRegistry::validateJson(json_encode(registry($attributes,$include),JSON_THROW_ON_ERROR));}
$old=validate(null,false);eq(validate(new stdClass()),$old,'Empty is omitted exactly like legacy config');
$value='Ключ 日本語 😀 " \' & </script><script>window.__bad=1</script> [[!Snippet]] {php}';
$attributes=(object)['data-mode'=>'production','data-empty'=>'','data-key'=>$value];
$valid=validate($attributes);eq(array_keys((array)$valid['services'][0]['config']['attributes']),['data-empty','data-key','data-mode'],'Deterministic name order');
$same=validate((object)['data-key'=>$attributes->{'data-key'},'data-empty'=>'','data-mode'=>'production']);
eq(CookieConsentSettings::categoryProcessing($valid,'analytics'),CookieConsentSettings::categoryProcessing($same,'analytics'),'Reloaded / reordered attributes compare by value');
eq(CookieConsentSettings::categoryProcessing($old,'analytics'),CookieConsentSettings::categoryProcessing(validate(new stdClass()),'analytics'),'Empty attributes preserve category composition');
eq(CookieConsentSettings::categoryProcessing($valid,'marketing'),CookieConsentSettings::categoryProcessing($old,'marketing'),'Unrelated category unchanged');
eq(CookieConsentSettings::categoryProcessing($valid,'analytics')===CookieConsentSettings::categoryProcessing($old,'analytics'),false,'Nonempty attributes affect category consent');
$public=CookieConsentServiceRegistry::publicJson(json_encode(registry($attributes)));
eq(json_decode($public)->services[0]->config->attributes->{'data-key'},$value,'Unicode / HTML roundtrip');
eq(str_contains($public,'</script>'),false,'Cannot close JSON script element');
eq(str_contains($public,'<'),false,'HTML encoded');
foreach(['src','async','defer','type','onload','onerror','onclick','nonce','integrity','crossorigin','id','class','style','aria-label','DATA-key','data-Key','data-','data-_key','data-ключ',"data-key\n",'data-'.str_repeat('x',60)] as $name)rejects(fn()=>validate((object)[$name=>'x']));
foreach([null,1,1.5,true,false,[],['x'],(object)['x'=>1],"a\n", "a\r", "a\t", "a\0", "a\x7f", "a\u{0085}",str_repeat('x',2049),str_repeat('😀',513)] as $value)rejects(fn()=>validate((object)['data-key'=>$value]));
foreach([null,[],['value'],'value',1,true] as $bad)rejects(fn()=>validate($bad));
eq(validate((object)['data-'.str_repeat('x',59)=>str_repeat('😀',512)])['schema'],1,'Byte boundaries');
$many=[];for($i=0;$i<20;$i++)$many['data-'.$i]='';eq(count((array)validate((object)$many)['services'][0]['config']['attributes']),20);$many['data-extra']='';rejects(fn()=>validate((object)$many));
$large=[];for($i=0;$i<20;$i++)$large['data-'.$i]=str_repeat('x',2048);rejects(fn()=>validate((object)$large));
$expanded=[];for($i=0;$i<10;$i++)$expanded['data-'.$i]=str_repeat('<',2048);
eq(validate((object)$expanded)['schema'],1,'Valid payload remains below the registry limit');
eq(strlen(CookieConsentServiceRegistry::publicJson(json_encode(registry((object)$expanded))))>32768,true,'HTML-safe wire JSON may be larger than the validated registry');
$raw=json_encode(registry((object)['data-key'=>'x']));
foreach(['"data-key":"x","data-key":"y"','"data-key":"x","data-\\u006bey":"y"','"data-key":"x","DATA-key":"y"'] as $duplicate)rejects(fn()=>CookieConsentServiceRegistry::validateJson(str_replace('"data-key":"x"',$duplicate,$raw)));
rejects(fn()=>CookieConsentServiceRegistry::validateJson(str_replace('"path":"\\/fixture.js"','"path":"/fixture.js","path":"/second.js"',$raw)));
$bad=registry((object)['data-key'=>'x']);$bad['services'][0]['loader']='yandex';$bad['services'][0]['config']=['id'=>'123','attributes'=>(object)['data-key'=>'x']];rejects(fn()=>CookieConsentServiceRegistry::validateJson(json_encode($bad)));
foreach(['/../bad.js','//example.test/bad.js','javascript:alert(1)','https://user:pass@example.test/a.js','https://example.test/a.js#bad','http://example.test/a.js'] as $path){$bad=registry(new stdClass());$bad['services'][0]['config']['path']=$path;rejects(fn()=>CookieConsentServiceRegistry::validateJson(json_encode($bad)));}
$bad=registry(new stdClass());$bad['services'][]=$bad['services'][0];$bad['services'][1]['key']='another';rejects(fn()=>CookieConsentServiceRegistry::validateJson(json_encode($bad)));
rejects(fn()=>CookieConsentServiceRegistry::decodeJson('{"long":"'.str_repeat('x',30000).'","data-key":"a","data-key":"b"}'));
eq(CookieConsentServiceRegistry::decodeJson('{"long":"'.str_repeat('x',300000).'"}')->long,str_repeat('x',300000),'Large valid draft does not exhaust regex stack');
// Exercise the actual processor draft entry point without a CMS or an authenticated write.
class modProcessor {public string $raw;public function getProperty($key,$default=''){return $this->raw;}}
class_alias('modProcessor','MODX\\Revolution\\Processors\\Processor');
require_once __DIR__.'/../../server/processors/base.php';
$processor=new class extends CookieConsentManagerProcessor {protected function execute():array{return [];}};
$draft=['options'=>CookieConsentSettings::defaults(),'registry'=>registry((object)['data-key'=>'public']),'texts'=>CookieConsentTexts::defaults(),'log_dir'=>''];
$processor->raw=json_encode($draft);$parsed=$processor->draft();eq($parsed['registry']['services'][0]['config']['attributes'] instanceof stdClass,true,'API retains objects');
$validated=CookieConsentSettings::validate($parsed,__DIR__,false);eq($validated['registry']['services'][0]['config']['attributes']->{'data-key'},'public');
foreach(['[]','null','1','"value"'] as $shape){$processor->raw=str_replace('{"data-key":"public"}',$shape,json_encode($draft));rejects(fn()=>CookieConsentSettings::validate($processor->draft(),__DIR__,false));}
$processor->raw=str_replace('"data-key":"public"','"data-key":"public","data-key":"duplicate"',json_encode($draft));rejects(fn()=>$processor->draft());
echo json_encode(['suite'=>'Custom JS attributes PHP / processor','result'=>'PASS','assertions'=>$n,'failed'=>0,'php'=>PHP_VERSION])."\n";
