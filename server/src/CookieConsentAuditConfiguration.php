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
    public static function webroot(): string {
        $root=$_SERVER['DOCUMENT_ROOT']??'';if($root==='')$root=MODX_BASE_PATH;
        $real=realpath($root);if(!$real||$real==='/')throw new RuntimeException('document_root_required');return $real;
    }
    public static function origin($modx): string {
        $url=(string)$modx->getOption('site_url');$parts=parse_url($url);$origin=($parts['scheme']??'http').'://'.($parts['host']??'').(isset($parts['port'])?':'.$parts['port']:'');
        return self::validate(['site_origin'=>$origin,'rate_limit_key'=>str_repeat('x',32)])['site_origin'];
    }
    private static function managedKey($modx,bool $create=false): string {
        // A native server-owned queue OPTIONS record, never a readable message.
        // Hyphens deliberately exclude this name from native read/send processors.
        $q=$modx->getObject('registry.db.modDbRegisterQueue',['name'=>'cookieconsent-audit-private']);
        if(!$q&&$create){
            $q=$modx->newObject('registry.db.modDbRegisterQueue');
            $q->fromArray(['name'=>'cookieconsent-audit-private','options'=>['rate_limit_key'=>bin2hex(random_bytes(32))]],'',true,true);
            if(!$q->save())throw new RuntimeException('audit_key_save');
        }
        if(!$q)throw new RuntimeException('audit_key_missing');$options=$q->get('options');
        if(!is_array($options)||count($options)!==1||!is_string($options['rate_limit_key']??null)||!preg_match('/^[a-f0-9]{64}$/D',$options['rate_limit_key']))throw new RuntimeException('audit_key_invalid');
        return $options['rate_limit_key'];
    }
    public static function forModx($modx): array {
        $env=getenv('COOKIE_CONSENT_AUDIT_CONFIG');$s=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.audit_config_file']);$file=is_string($env)&&$env!==''?$env:($s?(string)$s->get('value'):'');
        if($file!=='')return self::load($file,self::webroot(),!$env);
        $s=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.audit']);if(!$s||(string)$s->get('value')==='')throw new RuntimeException('audit_not_configured');
        $config=json_decode($s->get('value'),true,8,JSON_THROW_ON_ERROR);
        if(!is_array($config)||array_diff(array_keys($config),['site_origin','rate_limit_per_minute']))throw new RuntimeException('audit_parameters_invalid');
        $config['rate_limit_key']=self::managedKey($modx);return self::validate($config);
    }
    public static function setup($modx,int $limit=60): void {
        $env=getenv('COOKIE_CONSENT_AUDIT_CONFIG');$legacy=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.audit_config_file']);
        if($env||($legacy&&$legacy->get('value')!=='')){self::forModx($modx);return;}
        if($limit<1||$limit>10000)throw new InvalidArgumentException('rate_limit');
        $modx->beginTransaction();
        try {
            $lock=$modx->prepare('SELECT `key` FROM '.$modx->getTableName('modSystemSetting')." WHERE `key`='cookie_consent.audit' FOR UPDATE");
            if(!$lock->execute())throw new RuntimeException('audit_lock');
            $s=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.audit']);
            if(!$s)throw new RuntimeException('audit_setting_missing');
            if((string)$s->get('value')===''){
                $key=self::managedKey($modx,true);
                $s->set('value',json_encode(['site_origin'=>self::origin($modx),'rate_limit_per_minute'=>$limit],JSON_THROW_ON_ERROR));
                if(!$s->save())throw new RuntimeException('audit_setup');
            } else self::forModx($modx);
            $modx->commit();
        }catch(Throwable $e){$modx->rollBack();throw $e;}
        $modx->cacheManager->refresh(['system_settings'=>[]]);
    }
    public static function status($modx): array {
        $env=getenv('COOKIE_CONSENT_AUDIT_CONFIG');$legacy=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.audit_config_file']);$source=$env?'environment':($legacy&&$legacy->get('value')!==''?'setting':'managed');
        $s=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.log_dir']);$dir=$s?(string)$s->get('value'):'';
        if($dir==='')return ['state'=>'not_configured','source'=>$source];
        try {$config=self::forModx($modx);require_once __DIR__.'/CookieConsentLogDirectory.php';CookieConsentLogDirectory::validate($dir,self::webroot(),$config['site_origin']);return ['state'=>'ready','source'=>$source];}
        catch(Throwable $e){return ['state'=>'invalid','source'=>$source];}
    }
}
