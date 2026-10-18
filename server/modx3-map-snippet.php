<?php
// provider is an instance key, including additional maps; categories come from its registry row.
try {
    require_once MODX_CORE_PATH.'components/cookieconsentmanager3/src/CookieConsentSettings.php';
    $provider=$modx->getOption('provider',$scriptProperties,'google_maps');
    $src=$modx->getOption('src',$scriptProperties,'');
    if(!is_string($provider)||!is_string($src)||strlen($src)>4096||preg_match('/[\x00-\x20\\\\]/',$src))return '';
    $services=CookieConsentSettings::read($modx)['registry']['services'];$service=null;
    foreach($services as $candidate)if($candidate['key']===$provider)$service=$candidate;
    if(!$service||!in_array($service['loader'],['google_maps','yandex_maps'],true))return '';
    $parts=parse_url($src);
    if(!$parts||($parts['scheme']??'')!=='https'||isset($parts['user'],$parts['pass'])||isset($parts['user'])||isset($parts['pass'])||isset($parts['port'])||isset($parts['fragment']))return '';
    $google=$service['loader']==='google_maps'&&($parts['host']??'')==='www.google.com'&&preg_match('~^/maps/embed(?:/v1/(?:place|view|directions|search|streetview))?$~D',$parts['path']??'');
    $yandex=$service['loader']==='yandex_maps'&&($parts['host']??'')==='yandex.ru'&&in_array($parts['path']??'',['/map-widget/v1/','/map-widget/v1'],true);
    if(!$google&&!$yandex)return '';
    $allowed=$google?['pb','key','q','center','zoom','maptype','language','region','origin','destination','waypoints','mode','avoid','units','location','heading','pitch','fov']:['um','source','ll','z','l','pt','mode','oid','ol'];
    foreach(explode('&',$parts['query']??'') as $param)if($param!==''&&!in_array(urldecode(explode('=',$param,2)[0]),$allowed,true))return '';
    require_once MODX_CORE_PATH.'components/cookieconsentmanager3/src/CookieConsentEmbedOptions.php';
    $attributes=CookieConsentEmbedOptions::attributes($scriptProperties);
    return '<div data-cc-map-provider="'.htmlspecialchars($provider,ENT_QUOTES,'UTF-8').'" data-cc-map-src="'.htmlspecialchars($src,ENT_QUOTES,'UTF-8').'"'.$attributes.'></div>';
}catch(Throwable $e){return '';}
