<?php
// Read-only real renderer/snippet fixture; no database or network.
require_once __DIR__.'/../../server/src/CookieConsentBannerRenderer.php';
$language=$argv[1]??'en';$legacy=($argv[2]??'strict')==='legacy';$category=$argv[3]??'external_content';$custom=($argv[4]??'default')==='custom';
$services=array_values(array_filter(CookieConsentServiceRegistry::defaults()['services'],fn($s)=>in_array($s['loader'],['google_maps','yandex_maps','youtube','rutube','vk_video'],true)));
foreach($services as &$service){$service['enabled']=true;$service['category']=$category;}unset($service);
$generic=array_values(array_filter($services,fn($s)=>$s['key']==='youtube'))[0];$generic['key']='company_player';$generic['name']='Company & Partners [[!Never]] {$value}';$services[]=$generic;$disabled=$generic;$disabled['key']='disabled_player';$disabled['name']='Disabled player';$disabled['enabled']=false;$services[]=$disabled;
$texts=CookieConsentTexts::defaults();if($custom)$texts['locales'][$language]=['map_notice'=>'Shared {provider} / {provider}','map_load'=>'My cookie settings','service.google_maps.map_notice'=>'Google override {provider}','service.yandex_maps.map_notice'=>'Yandex override {provider}','service.company_player.name'=>'Player & Partners [[!Never]] {$value}'];
$options=CookieConsentSettings::defaults();$options['buttons']['accept']=$legacy;foreach(CookieConsentSettings::CATEGORIES as $c)$options['categories'][$c]=true;
$strings=CookieConsentTexts::resolve($texts,$language,$services);
$banner=CookieConsentBannerRenderer::render(file_get_contents(__DIR__.'/../../CookiesPopup.html'),$strings,$options,'/assets/','live',$services);
$dir=sys_get_temp_dir().'/cc-text-fixture-'.getmypid().'/';mkdir($dir.'components/cookieconsent',0700,true);symlink(realpath(__DIR__.'/../../server/src'),$dir.'components/cookieconsent/src');define('MODX_CORE_PATH',$dir);
class PlaceholderSetting{function __construct(private string $key,private string $value){}function get($key){return $key==='key'?$this->key:$this->value;}}
$modx=new class($language,$services,$texts,$options){
 function __construct(private string $language,private array $services,private array $texts,private array $options){}
 function getOption($key,$props=null,$fallback=null){return $props[$key]??($key==='cultureKey'?$this->language:$fallback);}
 function getCollection($class,$where){$values=['cookie_consent.services'=>json_encode(['schema'=>1,'services'=>$this->services]),'cookie_consent.options'=>json_encode($this->options),'cookie_consent.texts'=>json_encode($this->texts)];return array_map(fn($k)=>new PlaceholderSetting($k,$values[$k]??''),CookieConsentSettings::KEYS);}
};
try{
 $html='<div id="google_maps" data-cc-map-provider="google_maps" data-cc-map-src="https://www.google.com/maps/embed?pb=fixture"></div><div id="yandex_maps" data-cc-map-provider="yandex_maps" data-cc-map-src="https://yandex.ru/map-widget/v1/?um=fixture"></div>';
 foreach(['youtube'=>'https://youtu.be/M7lc1UVf-VE','rutube'=>'https://rutube.ru/video/7716bd3e665725c3c008ae7ab4ff02e2/','vk_video'=>'https://vkvideo.ru/video_ext.php?oid=-1&id=2'] as $provider=>$url){$scriptProperties=['provider'=>$provider,'url'=>$url];$video=include __DIR__.'/../../server/modx3-video-snippet.php';if(!$video)throw new RuntimeException('Video fixture failed');$html.='<section id="'.$provider.'">'.$video.'</section>';}
 $html.='<div id="company_player" data-cc-embed="company_player"><template><iframe src="https://player.example.test/company" title="Company"></iframe></template></div>';
 echo json_encode(['banner'=>$banner,'html'=>$html,'registry'=>CookieConsentServiceRegistry::publicRegistry(['schema'=>1,'services'=>$services]),'names'=>array_column(array_map(fn($s)=>['key'=>$s['key'],'name'=>$strings['service.'.$s['key'].'.name']],array_filter($services,fn($s)=>$s['enabled'])),'name','key'),'notice'=>$strings['map_notice'],'button'=>$strings['map_load'],'mapNotices'=>['google_maps'=>$strings['service.google_maps.map_notice'],'yandex_maps'=>$strings['service.yandex_maps.map_notice']]],JSON_THROW_ON_ERROR);
}finally{unlink($dir.'components/cookieconsent/src');rmdir($dir.'components/cookieconsent');rmdir($dir.'components');rmdir($dir);}
