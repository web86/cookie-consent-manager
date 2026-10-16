<?php
declare(strict_types=1);
/** Reviewed URL contracts for generated iframes only. Never applied to trusted templates. */
final class CookieConsentVideoUrl
{
    public static function normalize(string $provider,string $raw,array $options=[]): string
    {
        if(strlen($raw)>4096||preg_match('/[\x00-\x20\x7f<>"\'`\\\\]/',$raw)||!str_starts_with($raw,'https://'))throw new InvalidArgumentException('video_url');
        $u=parse_url($raw);
        if(!$u||isset($u['user'])||isset($u['pass'])||isset($u['port'])||isset($u['fragment']))throw new InvalidArgumentException('video_url');
        $host=$u['host']??'';$path=$u['path']??'';$q=[];
        foreach(explode('&',$u['query']??'') as $part){
            if($part==='')continue;$pair=explode('=',$part,2);$key=rawurldecode($pair[0]);$value=rawurldecode($pair[1]??'');
            if(isset($q[$key])||preg_match('/%(?![a-f0-9]{2})/i',$part))throw new InvalidArgumentException('video_query');$q[$key]=$value;
        }
        $check=static function(array $patterns)use($q):void{foreach($q as $k=>$v)if(!isset($patterns[$k])||preg_match($patterns[$k],$v)!==1)throw new InvalidArgumentException('video_query');};
        $seconds=static function(mixed $v):string{if(!is_scalar($v)||!preg_match('/^[0-9]{1,7}$/D',(string)$v))throw new InvalidArgumentException('video_time');return (string)(int)$v;};
        $bool=static function(mixed $v):string{if(!in_array($v,[true,false,0,1,'0','1'],true))throw new InvalidArgumentException('video_boolean');return in_array($v,[true,1,'1'],true)?'1':'0';};
        if($provider==='youtube'){
            $check(['v'=>'/^[A-Za-z0-9_-]{11}$/D','t'=>'/^(?:[0-9]{1,7}|(?:[0-9]{1,3}h)?(?:[0-9]{1,3}m)?(?:[0-9]{1,3}s)?)$/D','start'=>'/^[0-9]{1,7}$/D','end'=>'/^[0-9]{1,7}$/D','autoplay'=>'/^[01]$/D','controls'=>'/^[01]$/D','loop'=>'/^[01]$/D','playsinline'=>'/^[01]$/D','playlist'=>'/^[A-Za-z0-9_-]{11}$/D','si'=>'/^[A-Za-z0-9_-]{1,128}$/D','feature'=>'/^[A-Za-z0-9_-]{1,64}$/D']);
            $id=null;
            if($host==='youtu.be'&&preg_match('~^/([A-Za-z0-9_-]{11})/?$~D',$path,$m))$id=$m[1];
            elseif(in_array($host,['youtube.com','www.youtube.com','m.youtube.com'],true)){
                if($path==='/watch')$id=$q['v']??null;
                elseif(preg_match('~^/(?:embed|shorts|live)/([A-Za-z0-9_-]{11})/?$~D',$path,$m))$id=$m[1];
            }elseif(in_array($host,['youtube-nocookie.com','www.youtube-nocookie.com'],true)&&preg_match('~^/embed/([A-Za-z0-9_-]{11})/?$~D',$path,$m))$id=$m[1];
            if(!$id||isset($q['v'])&&$q['v']!==$id||isset($q['playlist'])&&$q['playlist']!==$id)throw new InvalidArgumentException('video_url');
            $out=[];
            foreach(['start','end','controls','loop','playsinline'] as $k)if(isset($q[$k]))$out[$k]=$q[$k];
            if(isset($q['t'])&&$q['t']==='')throw new InvalidArgumentException('video_time');
            if(isset($q['t'])&&!isset($out['start'])){if(ctype_digit($q['t']))$out['start']=$seconds($q['t']);else{preg_match('/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/D',$q['t'],$time);$out['start']=(string)((int)($time[1]??0)*3600+(int)($time[2]??0)*60+(int)($time[3]??0));}}
            foreach(['start','end'] as $k)if(array_key_exists($k,$options))$out[$k]=$seconds($options[$k]);
            foreach(['controls','loop','playsinline'] as $k)if(array_key_exists($k,$options))$out[$k]=$bool($options[$k]);
            $out['autoplay']=$bool($options['autoplay']??false);
            if(($out['loop']??'0')==='1')$out['playlist']=$id;
            if(isset($out['end'])&&(int)$out['end']<=(int)($out['start']??0))throw new InvalidArgumentException('video_time');
            $base='https://www.youtube-nocookie.com/embed/'.$id;
        }elseif($provider==='rutube'){
            $check(['p'=>'/^[A-Za-z0-9_-]{1,256}$/D','t'=>'/^[0-9]{1,7}$/D','skinColor'=>'/^[a-fA-F0-9]{6}$/D','getPlayOptions'=>'/^[a-z_]+(?:,[a-z_]+)*$/D']);
            if($host!=='rutube.ru'||!preg_match('~^/(?:video/(?:private/)?|play/embed/)([a-f0-9]{32})/?$~D',$path,$m))throw new InvalidArgumentException('video_url');
            if(str_starts_with($path,'/video/private/')&&!isset($q['p']))throw new InvalidArgumentException('video_query');
            $out=$q;if(array_key_exists('start',$options))$out['t']=$seconds($options['start']);
            // Official query documentation guarantees t, not autoplay/controls or mute.
            $base='https://rutube.ru/play/embed/'.$m[1].'/';
        }elseif($provider==='vk_video'){
            $check(['oid'=>'/^-?[1-9][0-9]{0,19}$/D','id'=>'/^[1-9][0-9]{0,19}$/D','hash'=>'/^[a-fA-F0-9]{16,64}$/D','hd'=>'/^[0-4]$/D','autoplay'=>'/^[01]$/D','t'=>'/^(?:[0-9]{1,7}|[0-9]{1,3}h[0-5][0-9]m[0-5][0-9]s)$/D']);
            if(!in_array($host,['vk.com','vkvideo.ru'],true)||$path!=='/video_ext.php'||!isset($q['oid'],$q['id']))throw new InvalidArgumentException('video_vk_embed');
            $out=$q;$out['autoplay']=$bool($options['autoplay']??false);
            // Preserve official t if supplied; do not synthesize unsupported player options.
            $base='https://'.$host.'/video_ext.php';
        }else throw new InvalidArgumentException('video_provider');
        return $base.($out?'?'.http_build_query($out,'','&',PHP_QUERY_RFC3986):'');
    }
}
