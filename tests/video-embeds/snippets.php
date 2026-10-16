<?php
// Native snippets, real settings/texts/validators; small read-only MODX settings double.
require_once __DIR__.'/../../server/src/CookieConsentSettings.php';
$dir=sys_get_temp_dir().'/cc-video-snippets-'.getmypid().'/';mkdir($dir.'components/cookieconsent',0700,true);symlink(realpath(__DIR__.'/../../server/src'),$dir.'components/cookieconsent/src');define('MODX_CORE_PATH',$dir);
class VideoFixtureSetting {function __construct(private string $key,private string $value){}function get($key){return $key==='key'?$this->key:$this->value;}}
class VideoFixtureModx {
 public array $registry;
 function getOption($key,$props=null,$fallback=null){return $props[$key]??($key==='cultureKey'?'en':$fallback);}
 function getCollection($class,$where){$texts=CookieConsentTexts::defaults();$values=['cookie_consent.services'=>json_encode($this->registry),'cookie_consent.options'=>json_encode(CookieConsentSettings::defaults()),'cookie_consent.texts'=>json_encode($texts)];return array_map(fn($k)=>new VideoFixtureSetting($k,$values[$k]??''),CookieConsentSettings::KEYS);}
}
$modx=new VideoFixtureModx();$modx->registry=CookieConsentServiceRegistry::defaults();$n=0;
function eq($a,$b,$label){global $n;$n++;if($a!==$b)throw new RuntimeException($label.' '.var_export([$a,$b],true));}
function snippet($name,$p){global $modx;$scriptProperties=$p;return include __DIR__.'/../../server/modx2-'.$name.'-snippet.php';}
try{
 foreach(['youtube'=>'https://youtu.be/M7lc1UVf-VE','rutube'=>'https://rutube.ru/video/7716bd3e665725c3c008ae7ab4ff02e2/?p=secret','vk_video'=>'https://vkvideo.ru/video_ext.php?oid=-1&id=2&hash=0123456789abcdef'] as $provider=>$url){
  $html=snippet('video',['provider'=>$provider,'url'=>$url,'title'=>'A "title" <tag>','poster'=>'https://images.example.test/poster.webp']);
  eq(str_contains($html,'<template><iframe'),true,'Inert iframe');eq(str_contains($html,'data-cc-embed="'.$provider.'"'),true,'Service default');eq(str_contains($html,'A &quot;title&quot; &lt;tag&gt;'),true,'Attribute escaped');eq(str_contains($html,'<img'),false,'Poster inert on server');
  foreach(['javascript:alert(1)','https://evil.test/video','https://vk.com/video-1_2'] as $bad)eq(str_contains(snippet('video',['provider'=>$provider,'url'=>$bad]),'<iframe'),false,'PHP rejects URL');
 }
 eq(str_contains(snippet('video',['provider'=>'vk_video','url'=>'https://vk.com/video-1_2']),'Share'),true,'VK actionable help');
 $copy=$modx->registry['services'][0];$copy['loader']='youtube';$copy['key']='extra_video';$copy['config']=new stdClass();$modx->registry['services'][]=$copy;
 eq(str_contains(snippet('video',['provider'=>'youtube','service'=>'extra_video','url'=>'https://youtu.be/M7lc1UVf-VE']),'data-cc-embed="extra_video"'),true,'Instance key');
 eq(snippet('video',['provider'=>'rutube','service'=>'extra_video','url'=>'https://rutube.ru/video/7716bd3e665725c3c008ae7ab4ff02e2/']), '','Loader mismatch');
 foreach(['javascript:alert(1)','//evil.test/a.jpg','https://user@evil.test/a.jpg'] as $poster)eq(snippet('video',['provider'=>'youtube','url'=>'https://youtu.be/M7lc1UVf-VE','poster'=>$poster]),'','Unsafe poster rejected');
 if(!in_array('--video-only',$argv,true)){
 $src='https://yandex.ru/map-widget/v1/?um=test';eq(snippet('map',['provider'=>'yandex_maps','src'=>$src]),'<div data-cc-map-provider="yandex_maps" data-cc-map-src="'.$src.'"></div>','Exact beta5 map output');
 $html=snippet('map',['provider'=>'yandex_maps','src'=>$src,'title'=>'Map','cssClass'=>'custom','width'=>'640','height'=>'360','aspectRatio'=>'16:9','loading'=>'lazy','poster'=>'/poster.webp','allowFullscreen'=>'0','referrerPolicy'=>'no-referrer']);
 foreach(['data-cc-title="Map"','class="custom"','data-cc-aspect-ratio="16:9"','data-cc-referrer-policy="no-referrer"','data-cc-allow-fullscreen="0"'] as $part)eq(str_contains($html,$part),true,'Map optional attributes');
 eq(snippet('map',['provider'=>'yandex_maps','src'=>$src,'referrerPolicy'=>'unsafe-url']),'','Unsafe referrer rejected');
 }
 echo json_encode(['result'=>'PASS','assertions'=>$n])."\n";
}finally{unlink($dir.'components/cookieconsent/src');rmdir($dir.'components/cookieconsent');rmdir($dir.'components');rmdir($dir);}
