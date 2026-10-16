<?php
require_once __DIR__.'/../../server/src/CookieConsentVideoUrl.php';
$n=0;
function check($ok){global $n;$n++;if(!$ok)throw new RuntimeException('URL assertion '.$n);}
function reject($p,$url,$opts=[]){try{CookieConsentVideoUrl::normalize($p,$url,$opts);check(false);}catch(InvalidArgumentException $e){check(true);}}
$yt='https://www.youtube-nocookie.com/embed/M7lc1UVf-VE';
foreach(['https://youtu.be/M7lc1UVf-VE','https://www.youtube.com/watch?v=M7lc1UVf-VE','https://m.youtube.com/shorts/M7lc1UVf-VE',$yt] as $url)check(CookieConsentVideoUrl::normalize('youtube',$url)===$yt.'?autoplay=0');
check(CookieConsentVideoUrl::normalize('youtube','https://youtu.be/M7lc1UVf-VE?t=1m30s',['loop'=>'1'])===$yt.'?start=90&loop=1&autoplay=0&playlist=M7lc1UVf-VE');
$id='7716bd3e665725c3c008ae7ab4ff02e2';$p='IBgzQQrKH4qB1bqm_91x7Q';
foreach(['/video/','/video/private/','/play/embed/'] as $path){$url=CookieConsentVideoUrl::normalize('rutube','https://rutube.ru'.$path.$id.'/?p='.$p,['start'=>'30']);check($url==='https://rutube.ru/play/embed/'.$id.'/?p='.$p.'&t=30');}
foreach(['vk.com','vkvideo.ru'] as $host)check(CookieConsentVideoUrl::normalize('vk_video','https://'.$host.'/video_ext.php?oid=-123&id=456&hash=0123456789abcdef&hd=2')==='https://'.$host.'/video_ext.php?oid=-123&id=456&hash=0123456789abcdef&hd=2&autoplay=0');
reject('vk_video','https://vk.com/video-123_456');
foreach(['javascript:alert(1)','http://www.youtube.com/watch?v=M7lc1UVf-VE','https://www.youtube.com.evil.test/embed/M7lc1UVf-VE','https://evil@www.youtube.com/embed/M7lc1UVf-VE','https://www.youtube.com:443/embed/M7lc1UVf-VE',$yt.'#frag',$yt.'?origin=https://evil.test',$yt.'?autoplay=0&autoplay=1',$yt.'?v[]=123',$yt.'?t=%zz',$yt.'?t=%0A',$yt.'?controls=2',$yt.'?playlist=aaaaaaaaaaa',$yt.'?foo=bar',$yt.'"><script>'] as $url)reject('youtube',$url);
reject('youtube',$yt,['end'=>'10','start'=>'20']);reject('youtube',$yt,['autoplay'=>'yes']);reject('rutube','https://rutube.ru/video/private/'.$id.'/');reject('rutube','https://rutube.ru/video/'.$id.'/?p=a%26b');reject('vk_video','https://vk.com/video_ext.php?oid=1&id=2&hash=bad');
echo json_encode(['result'=>'PASS','assertions'=>$n])."\n";
