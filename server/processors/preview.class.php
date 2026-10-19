<?php
require_once __DIR__.'/base.php';
class CookieConsentPreviewProcessor extends CookieConsentManagerProcessor
{
    protected function execute(): array {
        $draft=CookieConsentSettings::validate($this->draft(),MODX_BASE_PATH,false);
        $language=$this->getProperty('language','en');if(!is_string($language))throw new InvalidArgumentException('Language');
        $css=is_file(MODX_ASSETS_PATH.'components/cookieconsentmanager/css/cookie-consent.min.css')?MODX_ASSETS_PATH.'components/cookieconsentmanager/css/cookie-consent.min.css':MODX_ASSETS_PATH.'components/cookieconsentmanager/css/cookie-consent.css';
        return ['visibleCategories'=>['necessary'=>true]+$draft['options']['categories'],'publicCss'=>is_file($css) ? file_get_contents($css) : '', 'buttons'=>CookieConsentSettings::effectiveButtons($draft['options']),'strings'=>CookieConsentTexts::resolve($draft['texts'],$language,$draft['registry']['services']),'services'=>$draft['registry']['services']];
    }
}
return 'CookieConsentPreviewProcessor';
