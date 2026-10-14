<?php
// [[!CookieConsentMap? &provider=`google_maps` &src=`https://www.google.com/maps/embed?...`]]
$provider=$modx->getOption('provider',$scriptProperties,'google_maps');
$src=$modx->getOption('src',$scriptProperties,'');
if(!in_array($provider,['google_maps','yandex_maps'],true)||!is_string($src))return '';
$parts=parse_url($src);
$valid=$parts && ($parts['scheme']??'')==='https' && !isset($parts['user']) && !isset($parts['pass']) && !isset($parts['port']) &&
    ($provider==='google_maps' ? in_array($parts['host']??'', ['www.google.com','google.com'],true) && ($parts['path']??'')==='/maps/embed' : ($parts['host']??'')==='yandex.ru' && ($parts['path']??'')==='/map-widget/v1/');
if(!$valid)return '';
return '<div data-cc-map-provider="'.$provider.'" data-cc-map-src="'.htmlspecialchars($src,ENT_QUOTES,'UTF-8').'"></div>';
