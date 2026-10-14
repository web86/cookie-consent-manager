<?php
require_once __DIR__.'/base.php';
class CookieConsentGetProcessor extends CookieConsentManagerProcessor
{
    public function checkPermissions(){return $this->modx->user->isAuthenticated('mgr')&&($this->modx->hasPermission('cookie_consent_manage')||$this->modx->hasPermission('cookie_consent_view_logs'));}
    protected function execute(): array {
        require_once dirname(__DIR__).'/src/CookieConsentAuditConfiguration.php';
        require_once dirname(__DIR__).'/src/CookieConsentGuide.php';
        $manage=$this->modx->hasPermission('cookie_consent_manage');
        $data=$manage?CookieConsentSettings::read($this->modx):[];
        // New adapters appear disabled in Manager without rewriting existing saved registries.
        if($manage){$keys=array_column($data['registry']['services'],'key');foreach(CookieConsentServiceRegistry::defaults()['services'] as $service)if(in_array($service['key'],['vk_ads','meta_pixel'],true)&&!in_array($service['key'],$keys,true)&&count($data['registry']['services'])<32)$data['registry']['services'][]=$service;}
        // The system Manager language is independent of merged web/session caches.
        $languageSetting=$this->modx->getObject('modSystemSetting',['key'=>'manager_language']);
        $lang=CookieConsentTexts::language($languageSetting ? (string)$languageSetting->get('value') : 'en');
        $lexicon=CookieConsentTexts::lexicon($lang) ?: CookieConsentTexts::lexicon('en');
        return $data+['guide'=>$manage?CookieConsentGuide::forLanguage($lang):null,'canManage'=>$manage,'canViewLogs'=>$this->modx->hasPermission('cookie_consent_view_logs'),'currentLogYear'=>gmdate('Y'),'documentRoot'=>CookieConsentAuditConfiguration::webroot(),'defaultLogDir'=>$manage?MODX_CORE_PATH.'cache/logs/':null,'auditStatus'=>$manage?CookieConsentAuditConfiguration::status($this->modx):null,'managerLanguage'=>$lang,'managerStrings'=>$lexicon,'availableLanguages'=>CookieConsentSettings::languages(MODX_CORE_PATH),'lexicons'=>['ru'=>CookieConsentTexts::lexicon('ru'),'en'=>CookieConsentTexts::lexicon('en')],'catalog'=>CookieConsentServiceRegistry::CATALOG,'booleanOptions'=>CookieConsentServiceRegistry::BOOL_OPTIONS];
    }
}
return 'CookieConsentGetProcessor';
