<?php
declare(strict_types=1);
require_once __DIR__.'/CookieConsentPrivatePath.php';
final class CookieConsentAuditConfiguration
{
    public static function path(string $file,string $webroot,bool $jsonOnly=false): string
    {
        if ($file==='' || $file[0]!=='/' || preg_match('~(?:^|/)\.\.?(/|$)~',$file) || str_contains($file,"\0")) throw new RuntimeException('Private config path required');
        $root=realpath($webroot);$dir=realpath(dirname($file));
        if (!$root || !$dir || $dir!==rtrim(dirname($file),'/') || $dir===$root || str_starts_with($dir,$root.'/')) throw new RuntimeException('Config must be canonical and outside webroot');
        CookieConsentPrivatePath::file($file);
        if (realpath($file)!==$file || !is_file($file) || !is_readable($file) || ($jsonOnly && strtolower(pathinfo($file,PATHINFO_EXTENSION))!=='json')) throw new RuntimeException('Private config unavailable');
        return $file;
    }
    public static function validate(array $config): array
    {
        if (array_diff(array_keys($config),['site_origin','rate_limit_key','rate_limit_per_minute']) || !is_string($config['site_origin']??null) ||
            !preg_match('~^https?://[a-z0-9.-]+(?::[0-9]{2,5})?$~iD',$config['site_origin']) || !is_string($config['rate_limit_key']??null) || strlen($config['rate_limit_key'])<32 ||
            (isset($config['rate_limit_per_minute']) && (!is_int($config['rate_limit_per_minute']) || $config['rate_limit_per_minute']<1 || $config['rate_limit_per_minute']>10000))) throw new RuntimeException('Private audit config invalid');
        return $config;
    }
    public static function load(string $file,string $webroot,bool $jsonOnly=false): array
    {
        self::path($file,$webroot,$jsonOnly);
        if (strtolower(pathinfo($file,PATHINFO_EXTENSION))==='json') {
            $raw=file_get_contents($file,false,null,0,4097);
            if ($raw===false || strlen($raw)>4096) throw new RuntimeException('Private config size');
            try {$config=json_decode($raw,true,8,JSON_THROW_ON_ERROR);}
            catch(JsonException $e){throw new RuntimeException('Private config JSON invalid',0,$e);}
        } elseif (!$jsonOnly && strtolower(pathinfo($file,PATHINFO_EXTENSION))==='php') $config=require $file; // legacy trusted webserver environment only
        else throw new RuntimeException('Private config type');
        if (!is_array($config)) throw new RuntimeException('Private config object');
        return self::validate($config);
    }
    public static function status($modx): array
    {
        $env=getenv('COOKIE_CONSENT_AUDIT_CONFIG');
        $s=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.audit_config_file']);
        $file=is_string($env)&&$env!==''?$env:($s?(string)$s->get('value'):'');
        $s=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.log_dir']);$dir=$s?(string)$s->get('value'):'';
        if ($file==='' || $dir==='') return ['state'=>'not_configured','source'=>$env?'environment':'setting'];
        try { self::load($file,MODX_BASE_PATH,!$env);CookieConsentPrivatePath::directory($dir,MODX_BASE_PATH);return ['state'=>'ready','source'=>$env?'environment':'setting']; }
        catch(Throwable $e){return ['state'=>'invalid','source'=>$env?'environment':'setting'];}
    }
}
