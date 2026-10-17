<?php
/** Read-only real PHP banner fixture, with controlled external video in browser tests. */
declare(strict_types=1);
require_once __DIR__.'/../../server/src/CookieConsentBannerRenderer.php';
[$language,$mode,$position,$profile]=array_slice($argv+['','en','strict','bottom','short'],1,4);
$options=CookieConsentSettings::defaults();$options['banner_position']=$position;$options['buttons']['accept']=$mode==='legacy';$options['categories']['external_content']=true;
$services=CookieConsentServiceRegistry::defaults()['services'];foreach($services as &$s)$s['enabled']=$s['loader']==='youtube';unset($s);
$texts=CookieConsentTexts::defaults();$title=$language==='ru'?'Мы используем файлы cookie':'We use cookies';
if($profile==='empty')$title='';
if($profile==='long')$title=str_repeat($title.' ',6).'UnbrokenTitle'.str_repeat('x',120);
$texts['locales'][$language]=['banner_title'=>$title];
if($profile==='long')$texts['locales'][$language]['notice_html']='<p>'.str_repeat($language==='ru'?'Длинное переведённое уведомление о файлах cookie. ':'A long translated notice about cookies. ',12).'</p>';
$strings=CookieConsentTexts::resolve(CookieConsentTexts::validate($texts),$language,$services);
$banner=CookieConsentBannerRenderer::render(file_get_contents(__DIR__.'/../../CookiesPopup.html'),$strings,$options,'/assets/','live',$services);
echo json_encode(['banner'=>$banner,'title'=>$title,'registry'=>CookieConsentServiceRegistry::publicRegistry(['schema'=>1,'services'=>$services]),'html'=>'<div id="video" data-cc-embed="youtube"><template><iframe src="https://player.example.test/video" title="Controlled video"></iframe></template></div>'],JSON_THROW_ON_ERROR);
