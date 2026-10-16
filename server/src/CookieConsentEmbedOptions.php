<?php
declare(strict_types=1);
/** Attribute validation shared by native snippets; never reads or rewrites trusted HTML. */
final class CookieConsentEmbedOptions
{
    public static function escape(string $value): string {return str_replace(['[',']','{','}'],['&#91;','&#93;','&#123;','&#125;'],htmlspecialchars($value,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8'));}
    public static function boolean(mixed $value): bool {
        if(!in_array($value,[true,false,1,0,'1','0'],true))throw new InvalidArgumentException('embed_boolean');
        return in_array($value,[true,1,'1'],true);
    }
    public static function attributes(array $p,bool $video=false): string {
        $attrs='';
        foreach(['title','width','height','loading','referrerPolicy','allowFullscreen','poster','aspectRatio'] as $key){
            if(!array_key_exists($key,$p))continue;$v=$p[$key];
            if($key==='allowFullscreen'){$v=self::boolean($v)?'1':'0';}
            elseif(!is_string($v)&&!is_int($v))throw new InvalidArgumentException('embed_attribute');
            $v=(string)$v;
            if(strlen($v)>2048||preg_match('/[\x00-\x1f\x7f]/',$v))throw new InvalidArgumentException('embed_attribute');
            if(in_array($key,['width','height'],true)&&!preg_match('/^[1-9][0-9]{0,4}$/D',$v))throw new InvalidArgumentException('embed_dimension');
            if($key==='aspectRatio'&&!preg_match('/^[1-9][0-9]{0,3}:[1-9][0-9]{0,3}$/D',$v))throw new InvalidArgumentException('embed_ratio');
            if($key==='loading'&&!in_array($v,['lazy','eager'],true))throw new InvalidArgumentException('embed_loading');
            if($key==='referrerPolicy'&&!in_array($v,['no-referrer','same-origin','strict-origin','strict-origin-when-cross-origin'],true))throw new InvalidArgumentException('embed_referrer');
            if($key==='poster'){
                if(preg_match('/[\x00-\x20<>"\'`\\\\]/',$v)||strlen($v)>2048)throw new InvalidArgumentException('embed_poster');
                if(str_starts_with($v,'/')&&!str_starts_with($v,'//')){if(str_contains($v,'#'))throw new InvalidArgumentException('embed_poster');}
                else{$u=parse_url($v);if(!$u||($u['scheme']??'')!=='https'||empty($u['host'])||isset($u['user'])||isset($u['pass'])||isset($u['port'])||isset($u['fragment']))throw new InvalidArgumentException('embed_poster');}
            }
            $name=strtolower(preg_replace('/[A-Z]/','-$0',$key));
            $attrs.=' data-cc-'.$name.'="'.self::escape($v).'"';
        }
        if(isset($p['cssClass'])){
            if(!is_string($p['cssClass'])||strlen($p['cssClass'])>500||!preg_match('/^[a-zA-Z0-9_ -]*$/D',$p['cssClass']))throw new InvalidArgumentException('embed_class');
            $attrs.=' class="'.($video?'cc-video ':'').self::escape($p['cssClass']).'"';
        }elseif($video)$attrs.=' class="cc-video"';
        return $attrs;
    }
}
