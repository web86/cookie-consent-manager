<?php
declare(strict_types=1);
require_once __DIR__.'/CookieConsentHtmlSanitizer.php';
final class CookieConsentTexts
{
    public static function language(string $code): string
    {
        $code=strtolower(str_replace('_','-',$code));
        if (!preg_match('/^(?:[a-z][a-z0-9]{1,15}|x)(?:-[a-z0-9]{1,8}){0,2}$/D',$code) || strlen($code)>32 || strlen($code)<2) throw new InvalidArgumentException('Language code');
        return $code;
    }
    public static function lexicon(string $code): array
    {
        $code=self::language($code);$file=dirname(__DIR__).'/lexicon/'.$code.'/default.inc.php';
        return is_file($file) ? (static function($file){$_lang=[];require $file;return $_lang;})($file) : [];
    }
    public static function defaults(): array {return ['schema'=>1,'base_language'=>'ru','locales'=>['ru'=>['notice_html'=>self::lexicon('ru')['notice_html']]]];}
    public static function validate(array $data): array
    {
        if (array_diff(array_keys($data),['schema','base_language','locales']) || ($data['schema']??null)!==1 || !is_string($data['base_language']??null) || !is_array($data['locales']??null) || count($data['locales'])>64) throw new InvalidArgumentException('Texts schema');
        $data['base_language']=self::language($data['base_language']);$locales=[];$known=self::lexicon('en');$known['cookie_consent.upgrade_elements']='';
        foreach ($data['locales'] as $code=>$texts) {
            if (!is_string($code) || !is_array($texts)) throw new InvalidArgumentException('Locale');
            $language=self::language($code);
            if (isset($locales[$language])) throw new InvalidArgumentException('Duplicate locale');
            $locales[$language]=[];
            foreach ($texts as $key=>$value) {
                if (!is_string($key) || str_starts_with($key,'m.') || (!array_key_exists($key,$known) && !preg_match('/^service\.[a-z][a-z0-9_]{0,31}\.(?:name|description|map_notice)$/D',$key)) || !is_string($value)) throw new InvalidArgumentException('Text field');
                if ($key==='notice_html') $value=CookieConsentHtmlSanitizer::clean($value);
                elseif (strlen($value)>2000 || !mb_check_encoding($value,'UTF-8') || preg_match('/[\x00-\x1f\x7f<>]/',$value)) throw new InvalidArgumentException('Plain text');
                $locales[$language][$key]=$value;
            }
        }
        foreach ($locales as &$translations) if (!$translations) $translations=new stdClass(); unset($translations);
        $data['locales']=$locales;
        if (strlen(json_encode($data,JSON_THROW_ON_ERROR))>262144) throw new InvalidArgumentException('Translations too large');
        return $data;
    }
    public static function resolve(array $data,string $language,array $services=[]): array
    {
        $language=self::language($language);$base=$data['base_language'];
        $requestedOverrides=(array)($data['locales'][$language]??[]);$baseOverrides=(array)($data['locales'][$base]??[]);
        $result=array_replace(self::lexicon('en'),self::lexicon($base),$baseOverrides,self::lexicon($language),$requestedOverrides);
        $requested=self::lexicon($language);$baseLex=self::lexicon($base);
        foreach ($services as $s) foreach (['name','description'] as $field) {
            $key='service.'.$s['key'].'.'.$field;$stock='service.'.$s['loader'].'.'.$field;
            // Existing/custom registry display data remains the base fallback; translations are separate.
            $result[$key]=$requestedOverrides[$key] ?? $requested[$key] ?? $baseOverrides[$key] ??
                ($language!==$base && $s['key']===$s['loader'] ? ($requested[$stock]??null) : null) ?? ($field==='name' ? $s['name'] : $s['purpose']);
        }
        $nonempty=static function(array $values): string {foreach($values as $value)if(is_string($value)&&$value!=='')return $value;return '';};
        // Reuse the existing shared keys. Old embed translations remain a fallback visible in Texts.
        foreach(['map_notice'=>'embed_notice','map_load'=>'embed_settings'] as $key=>$legacy){
            $result[$key]=$nonempty([$requestedOverrides[$key]??null,$requestedOverrides[$legacy]??null,$requested[$key]??null,$baseOverrides[$key]??null,$baseOverrides[$legacy]??null,$baseLex[$key]??null,self::lexicon('en')[$key]]);
            $result[$legacy]=$result[$key];
        }
        foreach($services as $service)if(in_array($service['loader'],['google_maps','yandex_maps'],true)){
            $key='service.'.$service['key'].'.map_notice';
            // Do not leak a different language's service override over this language's general text.
            $result[$key]=$nonempty([$requestedOverrides[$key]??null,$result['map_notice']]);
        }
        // Missing titles inherit the base translation; an explicit empty string stays empty.
        $result['banner_title']=$requestedOverrides['banner_title'] ?? $baseOverrides['banner_title'] ?? '';
        return array_filter($result,static fn($key)=>!str_starts_with($key,'m.') && $key!=='cookie_consent.upgrade_elements',ARRAY_FILTER_USE_KEY);
    }
    /** Encode user string delimiters so later MODX/Fenom passes cannot see template tags. */
    public static function safeJson(mixed $value): string
    {
        if (is_string($value)) return str_replace(['[',']','{','}'],['\\u005b','\\u005d','\\u007b','\\u007d'],json_encode($value,JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_THROW_ON_ERROR));
        if (is_array($value) || is_object($value)) {
            $list=is_array($value)&&array_is_list($value);$items=[];
            foreach ($value as $k=>$v) $items[]=($list ? '' : self::safeJson((string)$k).':').self::safeJson($v);
            return ($list?'[':'{').implode(',',$items).($list?']':'}');
        }
        return json_encode($value,JSON_THROW_ON_ERROR);
    }
}
