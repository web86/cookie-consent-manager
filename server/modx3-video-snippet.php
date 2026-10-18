<?php
try {
    require_once MODX_CORE_PATH.'components/cookieconsentmanager3/src/CookieConsentSettings.php';
    require_once MODX_CORE_PATH.'components/cookieconsentmanager3/src/CookieConsentVideoUrl.php';
    require_once MODX_CORE_PATH.'components/cookieconsentmanager3/src/CookieConsentEmbedOptions.php';
    $p=$scriptProperties;$provider=$p['provider']??'youtube';$key=$p['service']??$provider;$url=$p['url']??'';
    if(!is_string($provider)||!is_string($key)||!is_string($url))return '';
    $settings=CookieConsentSettings::read($modx);$service=null;
    foreach($settings['registry']['services'] as $row)if($row['key']===$key&&$row['loader']===$provider)$service=$row;
    if(!$service||!in_array($provider,['youtube','rutube','vk_video'],true))return '';
    $language=(string)$modx->getOption('cultureKey',null,'ru');
    $strings=CookieConsentTexts::resolve($settings['texts'],$language,$settings['registry']['services']);
    try{$src=CookieConsentVideoUrl::normalize($provider,$url,$p);}
    catch(InvalidArgumentException $e){return '<p role="status">'.CookieConsentEmbedOptions::escape($strings[$provider==='vk_video'?'video_vk_embed':'video_rejected']).'</p>';}
    $p+=['title'=>$strings['video_title'],'aspectRatio'=>'16:9','allowFullscreen'=>true];
    $attrs=CookieConsentEmbedOptions::attributes($p,true);
    $e=static fn($v)=>CookieConsentEmbedOptions::escape((string)$v);
    $providerName=(string)($strings['service.'.$key.'.name']??$service['name']);
    $notice=str_replace('{provider}',$providerName,$strings['map_notice']);
    $fullscreen=CookieConsentEmbedOptions::boolean($p['allowFullscreen'])?' allowfullscreen':'';
    $allow='autoplay; encrypted-media; picture-in-picture'.($fullscreen?'; fullscreen':'');
    $frame='<iframe src="'.$e($src).'" title="'.$e($p['title']).'" allow="'.$allow.'" referrerpolicy="strict-origin-when-cross-origin"'.$fullscreen.'></iframe>';
    return '<div data-cc-embed="'.$e($key).'" data-cc-video="'.$e($provider).'"'.$attrs.'><div data-cc-placeholder><p>'.$e($notice).'</p><button type="button" data-cc-settings>'.$e(str_replace('{provider}',$providerName,$strings['map_load'])).'</button></div><template>'.$frame.'</template></div>';
}catch(Throwable $e){return '';}
