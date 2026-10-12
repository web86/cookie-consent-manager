<?php
require_once __DIR__.'/base.php';
class CookieConsentGetProcessor extends CookieConsentManagerProcessor
{
    protected function execute(): array {
        require_once dirname(__DIR__).'/src/CookieConsentAuditConfiguration.php';
        $data=CookieConsentSettings::read($this->modx);
        // The system Manager language is independent of merged web/session caches.
        $languageSetting=$this->modx->getObject('modSystemSetting',['key'=>'manager_language']);
        $lang=CookieConsentTexts::language($languageSetting ? (string)$languageSetting->get('value') : 'en');
        $lexicon=CookieConsentTexts::lexicon($lang) ?: CookieConsentTexts::lexicon('en');
        return $data+['auditStatus'=>CookieConsentAuditConfiguration::status($this->modx),'managerLanguage'=>$lang,'managerStrings'=>$lexicon,'availableLanguages'=>CookieConsentSettings::languages(MODX_CORE_PATH),'lexicons'=>['ru'=>CookieConsentTexts::lexicon('ru'),'en'=>CookieConsentTexts::lexicon('en')],'catalog'=>CookieConsentServiceRegistry::CATALOG,'booleanOptions'=>CookieConsentServiceRegistry::BOOL_OPTIONS];
    }
}
return 'CookieConsentGetProcessor';
