<?php
class Cookie_consentIndexManagerController extends modExtraManagerController
{
    public function getPageTitle(){return 'Cookie Consent Manager';}
    public function getLanguageTopics(){return ['cookie_consent:default'];}
    public function checkPermissions(){return $this->modx->hasPermission('cookie_consent_manage')||$this->modx->hasPermission('cookie_consent_view_logs');}
    public function loadCustomCssJs(){
        $assets=$this->modx->getOption('assets_url').'components/cookieconsent/';
        $this->addCss($assets.'manager.css');$this->addJavascript($assets.'audit-viewer.js');$this->addJavascript($assets.'manager.js');
        $this->addHtml('<script>window.CookieConsentManagerBootstrap='.json_encode(['connector'=>$assets.'connector.php','auth'=>$this->modx->user->getUserToken('mgr'),'errorMessage'=>$this->modx->lexicon('m.error')],JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT).';</script>');
    }
    public function getTemplateFile(){return dirname(__DIR__).'/templates/home.tpl';}
}
return 'Cookie_consentIndexManagerController';
