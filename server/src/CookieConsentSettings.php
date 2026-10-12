<?php
declare(strict_types=1);
require_once __DIR__.'/CookieConsentServiceRegistry.php';
require_once __DIR__.'/CookieConsentPrivatePath.php';
require_once __DIR__.'/CookieConsentTexts.php';
final class CookieConsentSettings
{
    public const KEYS=['cookie_consent.options','cookie_consent.services','cookie_consent.texts','cookie_consent.log_dir'];
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
        return ['options'=>$options,'registry'=>$registry,'texts'=>$texts,'log_dir'=>$values[self::KEYS[3]],'revision'=>hash('sha256',json_encode($values))];
    }
    public static function validate(array $draft,string $webroot,bool $strict=true): array
    {
        if (count($draft)!==4 || array_diff(array_keys($draft),['options','registry','texts','log_dir']) || !is_array($draft['options']??null) || !is_array($draft['registry']??null) || !is_array($draft['texts']??null) || !is_string($draft['log_dir']??null)) throw new InvalidArgumentException('Settings schema');
        $draft['options']=self::options($draft['options']);
        if ($strict) $draft['log_dir']=CookieConsentPrivatePath::directory($draft['log_dir'],$webroot);
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
        $draft['texts']=CookieConsentTexts::validate($draft['texts']);
        return $draft;
    }
    public static function languages(string $core): array
    {
        $languages=[];foreach(new DirectoryIterator($core.'lexicon/') as $entry){if($entry->isDot()||!$entry->isDir()||$entry->isLink()||!is_file($entry->getPathname().'/default.inc.php'))continue;try{$languages[]=CookieConsentTexts::language($entry->getFilename());}catch(InvalidArgumentException $e){}}
        sort($languages);return $languages;
    }
    public static function save($modx,array $draft,string $revision): array
    {
        $draft=self::validate($draft,MODX_BASE_PATH);
        $modx->beginTransaction();
        try {
            $table=$modx->getTableName('modSystemSetting');
            $lock=$modx->prepare("SELECT `key` FROM $table WHERE `key` LIKE 'cookie\\_consent.%' FOR UPDATE");
            if (!$lock->execute()) throw new RuntimeException('Settings lock');
            $current=self::read($modx);
            if (!hash_equals($current['revision'],$revision)) throw new DomainException('conflict');
            $values=[json_encode($draft['options'],JSON_THROW_ON_ERROR),json_encode($draft['registry'],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),json_encode($draft['texts'],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),$draft['log_dir']];
            foreach(self::KEYS as $i=>$key){$s=$modx->getObject('modSystemSetting',['key'=>$key]);if(!$s)throw new RuntimeException('Setting missing');$s->set('value',$values[$i]);if(!$s->save())throw new RuntimeException('Save failed');}
            $modx->commit();
        }catch(Throwable $e){$modx->rollBack();throw $e;}
        $modx->cacheManager->refresh(['system_settings'=>[]]);return self::read($modx);
    }
}
