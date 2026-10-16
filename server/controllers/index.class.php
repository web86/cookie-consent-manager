<?php
class Cookie_consentIndexManagerController extends modExtraManagerController
{
    public function getPageTitle(){return 'Cookie Consent Manager';}
    public function getLanguageTopics(){return ['cookie_consent:default'];}
    public function checkPermissions(){return $this->modx->hasPermission('cookie_consent_manage')||$this->modx->hasPermission('cookie_consent_view_logs');}
    public function loadCustomCssJs(){
        $assets=$this->modx->getOption('assets_url').'components/cookieconsent/';
        $url=static function(string $name)use($assets): string {$path=MODX_ASSETS_PATH.'components/cookieconsent/'.$name;return $assets.$name.(is_file($path)?'?v='.substr(hash_file('sha256',$path),0,20):'');};
        $this->addCss($url('manager.css'));$this->addJavascript($url('audit-viewer.js'));$this->addJavascript($url('script-url.js'));$this->addJavascript($url('manager.js'));
        $this->addHtml('<script>window.CookieConsentManagerBootstrap='.json_encode(['connector'=>$assets.'connector.php','auth'=>$this->modx->user->getUserToken('mgr'),'errorMessage'=>$this->modx->lexicon('m.error')],JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT).';</script>');
    }
    public function getTemplateFile(){return dirname(__DIR__).'/templates/home.tpl';}
}
return 'Cookie_consentIndexManagerController';
