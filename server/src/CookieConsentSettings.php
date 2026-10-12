<?php
declare(strict_types=1);
require_once __DIR__.'/CookieConsentServiceRegistry.php';
require_once __DIR__.'/CookieConsentPrivatePath.php';
require_once __DIR__.'/CookieConsentTexts.php';
final class CookieConsentSettings
{
    public const KEYS=['cookie_consent.options','cookie_consent.services','cookie_consent.texts','cookie_consent.log_dir','cookie_consent.audit_config_file'];
    public static function defaults(): array {return ['schema'=>1,'ttl_days'=>90,'policy_version'=>'1','buttons'=>['reject'=>true,'configure'=>true,'accept_all'=>true,'accept'=>false]];}
    public static function options(array $data): array
    {
        if (count($data)!==4 || array_diff(array_keys($data),['schema','ttl_days','policy_version','buttons']) || ($data['schema']??null)!==1 ||
            !is_int($data['ttl_days']??null) || $data['ttl_days']<1 || $data['ttl_days']>3650 || !is_string($data['policy_version']??null) || !preg_match('/^[A-Za-z0-9._-]{1,32}$/D',$data['policy_version']) || !is_array($data['buttons']??null)) throw new InvalidArgumentException('General settings');
        if (count($data['buttons'])!==4 || array_diff(array_keys($data['buttons']),['reject','configure','accept_all','accept'])) throw new InvalidArgumentException('Button settings');
        foreach ($data['buttons'] as $v) if (!is_bool($v)) throw new InvalidArgumentException('Button boolean');
        return $data;
    }
    public static function effectiveButtons(array $options): array
    {
        $buttons=$options['buttons'];
        if ($buttons['accept']) {$buttons['configure']=false;$buttons['accept_all']=false;}
        if (!in_array(true,$buttons,true)) $buttons['configure']=true;
        return $buttons;
    }
    public static function read($modx): array
    {
        $values=[];
        foreach(self::KEYS as $key){$setting=$modx->getObject('modSystemSetting',['key'=>$key]);$values[$key]=$setting?(string)$setting->get('value'):'';}
        $options=self::options($values[self::KEYS[0]]===''?self::defaults():json_decode($values[self::KEYS[0]],true,16,JSON_THROW_ON_ERROR));
        $registry=CookieConsentServiceRegistry::validateJson($values[self::KEYS[1]]);
        $texts=CookieConsentTexts::validate($values[self::KEYS[2]]===''?CookieConsentTexts::defaults():json_decode($values[self::KEYS[2]],true,16,JSON_THROW_ON_ERROR));
        return ['options'=>$options,'registry'=>$registry,'texts'=>$texts,'log_dir'=>$values[self::KEYS[3]],'audit_config_file'=>$values[self::KEYS[4]],'revision'=>hash('sha256',json_encode($values))];
    }
    public static function validate(array $draft,string $webroot,bool $strict=true,array $unchangedAudit=[]): array
    {
        $mode=$draft['log_dir_mode']??'absolute';unset($draft['log_dir_mode']);
        if (!is_string($mode)||!in_array($mode,['site','absolute'],true))throw new InvalidArgumentException('log_mode');
        if ($strict && !in_array('log_dir',$unchangedAudit,true) && ($draft['log_dir']??'')!==''){require_once __DIR__.'/CookieConsentLogDirectory.php';$draft['log_dir']=CookieConsentLogDirectory::resolve($draft['log_dir'],$webroot,$mode);}
        if (!array_key_exists('audit_config_file',$draft)) $draft['audit_config_file']='';
        if (count($draft)!==5 || array_diff(array_keys($draft),['options','registry','texts','log_dir','audit_config_file']) || !is_array($draft['options']??null) || !is_array($draft['registry']??null) || !is_array($draft['texts']??null) || !is_string($draft['log_dir']??null)) throw new InvalidArgumentException('Settings schema');
        $draft['options']=self::options($draft['options']);
        if (!is_string($draft['audit_config_file'])) throw new InvalidArgumentException('Private config path');
        if ($strict && !in_array('audit_config_file',$unchangedAudit,true) && $draft['audit_config_file']!=='') { require_once __DIR__.'/CookieConsentAuditConfiguration.php';CookieConsentAuditConfiguration::path($draft['audit_config_file'],$webroot,true); }
        $registry=$draft['registry'];
        if (!$strict) {
            if (!is_array($registry['services']??null)) throw new InvalidArgumentException('Services list');
            foreach ($registry['services'] as &$service) {
                if (!is_bool($service['enabled']??null)) throw new InvalidArgumentException('Enabled boolean');
                $service['_preview_enabled']=$service['enabled'];$service['enabled']=false;
                if (($service['config']['id']??null)==='') unset($service['config']['id']);
            }unset($service);
            $flags=array_column($registry['services'],'_preview_enabled','key');
            foreach($registry['services'] as &$service)unset($service['_preview_enabled']);unset($service);
        }
        $draft['registry']=CookieConsentServiceRegistry::validateJson(json_encode($registry,JSON_THROW_ON_ERROR));
        if (!$strict)foreach($draft['registry']['services'] as &$service)$service['enabled']=$flags[$service['key']];unset($service);
        // read() represents empty locale dictionaries as objects; normalize before revalidation.
        $draft['texts']=CookieConsentTexts::validate(json_decode(json_encode($draft['texts'],JSON_THROW_ON_ERROR),true,16,JSON_THROW_ON_ERROR));
        return $draft;
    }
    public static function languages(string $core): array
    {
        $languages=[];foreach(new DirectoryIterator($core.'lexicon/') as $entry){if($entry->isDot()||!$entry->isDir()||$entry->isLink()||!is_file($entry->getPathname().'/default.inc.php'))continue;try{$languages[]=CookieConsentTexts::language($entry->getFilename());}catch(InvalidArgumentException $e){}}
        sort($languages);return $languages;
    }
    /** Restore a DB value read before the check; never perform filesystem operations. */
    public static function restoreLogDirectory($modx,string $previous,string $revision): void
    {
        $modx->beginTransaction();
        try {
            $lock=$modx->prepare("SELECT `key` FROM ".$modx->getTableName('modSystemSetting')." WHERE `key` LIKE 'cookie\\_consent.%' FOR UPDATE");
            if(!$lock->execute())throw new RuntimeException('Settings lock');
            if(!hash_equals(self::read($modx)['revision'],$revision))throw new DomainException('conflict');
            $row=$modx->getObject('modSystemSetting',['key'=>'cookie_consent.log_dir']);
            if(!$row)throw new RuntimeException('Setting missing');$row->set('value',$previous);
            if(!$row->save())throw new RuntimeException('write_failed');$modx->commit();
        }catch(Throwable $e){$modx->rollBack();throw $e;}
        $modx->cacheManager->refresh(['system_settings'=>[]]);
    }
    public static function save($modx,array $draft,string $revision): array
    {
        if (!array_key_exists('audit_config_file',$draft)) $draft['audit_config_file']=self::read($modx)['audit_config_file'];
        require_once __DIR__.'/CookieConsentAuditConfiguration.php';
        $modx->beginTransaction();
        try {
            $table=$modx->getTableName('modSystemSetting');
            $lock=$modx->prepare("SELECT `key` FROM $table WHERE `key` LIKE 'cookie\\_consent.%' FOR UPDATE");
            if (!$lock->execute()) throw new RuntimeException('Settings lock');
            $current=self::read($modx);
            if (!hash_equals($current['revision'],$revision)) throw new DomainException('conflict');
            // An unchanged, currently unavailable journal must not block other settings.
            $root=CookieConsentAuditConfiguration::webroot();$unchanged=[];
            require_once __DIR__.'/CookieConsentLogDirectory.php';
            if(is_string($draft['log_dir']??null)&&is_string($draft['log_dir_mode']??'absolute')) {
                $candidate=$draft['log_dir'];
                if(($draft['log_dir_mode']??'absolute')==='site'&&$candidate!=='')$candidate=rtrim($root,'/').'/'.ltrim($candidate,'/');
                if(rtrim($candidate,'/')===rtrim($current['log_dir'],'/')){$unchanged[]='log_dir';$draft['log_dir']=$current['log_dir'];}
            }
            if(($draft['audit_config_file']??null)===$current['audit_config_file'])$unchanged[]='audit_config_file';
            $draft=self::validate($draft,$root,true,$unchanged);
            $values=[json_encode($draft['options'],JSON_THROW_ON_ERROR),json_encode($draft['registry'],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),json_encode($draft['texts'],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),$draft['log_dir'],$draft['audit_config_file']];
            foreach(self::KEYS as $i=>$key){$s=$modx->getObject('modSystemSetting',['key'=>$key]);if(!$s)throw new RuntimeException('Setting missing');$s->set('value',$values[$i]);if(!$s->save())throw new RuntimeException('write_failed');}
            $modx->commit();
        }catch(Throwable $e){$modx->rollBack();throw $e;}
        $modx->cacheManager->refresh(['system_settings'=>[]]);return self::read($modx);
    }
}
